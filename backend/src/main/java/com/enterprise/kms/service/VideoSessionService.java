package com.enterprise.kms.service;

import com.enterprise.kms.dto.*;
import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.repository.VideoSessionParticipantRepository;
import com.enterprise.kms.repository.VideoSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

@Service
public class VideoSessionService {

    private static final Logger log = LoggerFactory.getLogger(VideoSessionService.class);

    private final VideoSessionRepository videoSessionRepository;
    private final VideoSessionParticipantRepository participantRepository;
    private final DiscussionTopicRepository discussionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final JitsiTokenService jitsiTokenService;

    @Value("${kms.meeting.jitsi-domain:}")
    private String jitsiDomain;

    public VideoSessionService(VideoSessionRepository videoSessionRepository,
                               VideoSessionParticipantRepository participantRepository,
                               DiscussionTopicRepository discussionRepository,
                               UserRepository userRepository,
                               NotificationService notificationService,
                               AuditService auditService,
                               JitsiTokenService jitsiTokenService) {
        this.videoSessionRepository = videoSessionRepository;
        this.participantRepository = participantRepository;
        this.discussionRepository = discussionRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.jitsiTokenService = jitsiTokenService;
    }

    @Transactional
    public VideoSessionResponse createSession(UUID discussionId, CreateVideoSessionRequest req, String username, boolean isAdmin) {
        DiscussionTopic discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session title is required");
        }

        User hostUser = resolveUser(username);
        if (hostUser == null || Boolean.FALSE.equals(hostUser.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated host user not found or inactive");
        }

        OffsetDateTime start = req.getScheduledStart() != null ? req.getScheduledStart() : OffsetDateTime.now();
        OffsetDateTime end = req.getScheduledEnd();
        if (req.getDurationMinutes() != null) {
            if (req.getDurationMinutes() <= 0 || req.getDurationMinutes() > 1440) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duration must be between 1 and 1440 minutes");
            }
            if (end == null) {
                end = start.plusMinutes(req.getDurationMinutes());
            }
        }

        String effectiveDomain = (jitsiDomain != null && !jitsiDomain.isBlank()) ? jitsiDomain
                : (jitsiTokenService != null ? jitsiTokenService.getJitsiDomain() : "");
        String cleanTopicId = discussionId.toString().replace("-", "").substring(0, 12);
        String secureToken = UUID.randomUUID().toString().replace("-", "");
        String meetingIdentifier = "INSA-KMS-Discussion-" + cleanTopicId + "-" + secureToken;
        String meetingUrl = "https://" + effectiveDomain + "/" + meetingIdentifier;

        VideoSession session = new VideoSession();
        session.setDiscussion(discussion);
        session.setHostUser(hostUser);
        session.setHostUsername(username);
        session.setTitle(req.getTitle().trim());
        session.setDescription(req.getDescription() != null ? req.getDescription().trim() : null);
        session.setScheduledStart(start);
        session.setScheduledEnd(end);
        session.setStatus("SCHEDULED");
        session.setMeetingProvider("JITSI");
        session.setMeetingIdentifier(meetingIdentifier);
        session.setMeetingUrl(meetingUrl);

        // Host is automatically added as participant with role HOST
        VideoSessionParticipant hostParticipant = new VideoSessionParticipant();
        hostParticipant.setVideoSession(session);
        hostParticipant.setUser(hostUser);
        hostParticipant.setUsername(username);
        hostParticipant.setRole("HOST");
        hostParticipant.setStatus("INVITED");
        session.getParticipants().add(hostParticipant);

        // Resolve and deduplicate participants by stable User UUID
        Map<UUID, User> resolvedParticipants = new LinkedHashMap<>();

        // 1. Primary: participantUserIds
        if (req.getParticipantUserIds() != null) {
            for (UUID userId : req.getParticipantUserIds()) {
                if (userId == null) continue;
                User targetUser = userRepository.findById(userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant with ID '" + userId + "' does not exist"));
                if (Boolean.FALSE.equals(targetUser.getIsActive())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant '" + targetUser.getUsername() + "' is inactive");
                }
                // Host must never become a normal participant
                if (targetUser.getId().equals(hostUser.getId()) || targetUser.getUsername().equalsIgnoreCase(username)) {
                    continue;
                }
                resolvedParticipants.put(targetUser.getId(), targetUser);
            }
        }

        // 2. Backward-compat: invitedUsernames
        if (req.getInvitedUsernames() != null) {
            for (String uname : req.getInvitedUsernames()) {
                if (uname == null || uname.isBlank()) continue;
                String cleanName = uname.trim();
                // Host must never become a normal participant
                if (cleanName.equalsIgnoreCase(username)) {
                    continue;
                }
                User targetUser = resolveUser(cleanName);
                if (targetUser == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant with username '" + cleanName + "' does not exist");
                }
                if (Boolean.FALSE.equals(targetUser.getIsActive())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant '" + targetUser.getUsername() + "' is inactive");
                }
                if (targetUser.getId().equals(hostUser.getId())) {
                    continue;
                }
                resolvedParticipants.putIfAbsent(targetUser.getId(), targetUser);
            }
        }

        for (User pUser : resolvedParticipants.values()) {
            VideoSessionParticipant p = new VideoSessionParticipant();
            p.setVideoSession(session);
            p.setUser(pUser);
            p.setUsername(pUser.getUsername());
            p.setRole("PARTICIPANT");
            p.setStatus("INVITED");
            session.getParticipants().add(p);
        }

        VideoSession savedSession = videoSessionRepository.save(session);

        // Safe audit logging (zero tokens, passwords, secrets)
        List<String> invitedNames = resolvedParticipants.values().stream().map(User::getUsername).toList();
        auditService.recordAuditLog(
                hostUser.getId().toString(),
                hostUser.getEmail(),
                "VIDEO_SESSION_CREATED",
                "VIDEO_SESSION",
                savedSession.getId().toString(),
                null,
                "{\"discussionId\":\"" + discussionId + "\",\"title\":\"" + escapeJson(savedSession.getTitle()) + "\",\"participants\":" + savedSession.getParticipants().size() + ",\"invitedParticipants\":" + invitedNames.size() + "}"
        );

        // Send notifications to invited users only after participant persistence succeeds
        for (VideoSessionParticipant p : savedSession.getParticipants()) {
            if (!p.getUsername().equalsIgnoreCase(username)) {
                try {
                    String notifTitle = "Invited to Video Discussion: " + savedSession.getTitle();
                    String notifMsg = username + " invited you to a virtual video discussion in thread: \"" + discussion.getTitle() + "\"";
                    String actionUrl = "/discussions/" + discussionId;
                    if (p.getUser() != null) {
                        notificationService.sendNotificationToUser(
                                p.getUser(), notifTitle, notifMsg,
                                NotificationEventType.VIDEO_SESSION_INVITED,
                                "VIDEO_SESSION", savedSession.getId(), actionUrl
                        );
                    } else {
                        notificationService.sendNotification(
                                p.getUsername(), notifTitle, notifMsg,
                                NotificationEventType.VIDEO_SESSION_INVITED,
                                "VIDEO_SESSION", savedSession.getId(), actionUrl
                        );
                    }
                } catch (Exception e) {
                    log.warn("Failed to send video invitation notification to {}: {}", p.getUsername(), e.getMessage());
                }
            }
        }

        return toResponse(savedSession, username, isAdmin);
    }

    public boolean isUserAuthorizedForSession(VideoSession session, String username, boolean isAdmin) {
        if (username == null || username.isBlank()) {
            return false;
        }
        if (isAdmin) {
            return true;
        }
        if (session.getHostUsername() != null && session.getHostUsername().equalsIgnoreCase(username)) {
            return true;
        }
        if (session.getDiscussion() != null && session.getDiscussion().getAuthorUsername() != null
                && session.getDiscussion().getAuthorUsername().equalsIgnoreCase(username)) {
            return true;
        }
        return participantRepository.existsByVideoSessionIdAndUsernameIgnoreCase(session.getId(), username);
    }

    @Transactional(readOnly = true)
    public List<VideoSessionResponse> listSessionsForDiscussion(UUID discussionId, String username, boolean isAdmin) {
        if (!discussionRepository.existsById(discussionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found");
        }

        List<VideoSession> sessions = videoSessionRepository.findByDiscussionIdOrderByScheduledStartDescCreatedAtDesc(discussionId);
        return sessions.stream().map(s -> toResponse(s, username, isAdmin)).toList();
    }

    @Transactional(readOnly = true)
    public List<VideoSessionResponse> listSessionsForDiscussion(UUID discussionId, String username) {
        return listSessionsForDiscussion(discussionId, username, false);
    }

    @Transactional(readOnly = true)
    public VideoSessionResponse getSessionDetail(UUID sessionId, String username, boolean isAdmin) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video session not found"));

        if (!isUserAuthorizedForSession(session, username, isAdmin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to view details of this video session");
        }

        return toResponse(session, username, isAdmin);
    }

    @Transactional(readOnly = true)
    public VideoSessionResponse getSessionDetail(UUID sessionId, String username) {
        return getSessionDetail(sessionId, username, false);
    }

    @Transactional
    public VideoSessionResponse startSession(UUID sessionId, String username, boolean isAdmin) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video session not found"));

        boolean isHost = session.getHostUsername().equalsIgnoreCase(username);
        if (!isHost && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host or an administrator can start this video session");
        }

        if ("ENDED".equalsIgnoreCase(session.getStatus()) || "CANCELLED".equalsIgnoreCase(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot start an ended or cancelled session");
        }

        if (!"ACTIVE".equalsIgnoreCase(session.getStatus())) {
            session.setStatus("ACTIVE");
            session.setStartedAt(OffsetDateTime.now());
            session = videoSessionRepository.save(session);

            auditService.recordAuditLog(
                    username, null,
                    "VIDEO_SESSION_STARTED",
                    "VIDEO_SESSION",
                    session.getId().toString(),
                    null,
                    "{\"title\":\"" + session.getTitle() + "\"}"
            );

            // Notify participants
            for (VideoSessionParticipant p : session.getParticipants()) {
                if (!p.getUsername().equalsIgnoreCase(username)) {
                    try {
                        String notifTitle = "Video Session Started: " + session.getTitle();
                        String notifMsg = "Host " + username + " has started the video discussion: \"" + session.getTitle() + "\"";
                        String actionUrl = "/discussions/" + session.getDiscussion().getId();
                        if (p.getUser() != null) {
                            notificationService.sendNotificationToUser(
                                    p.getUser(), notifTitle, notifMsg,
                                    NotificationEventType.VIDEO_SESSION_STARTED,
                                    "VIDEO_SESSION", session.getId(), actionUrl
                            );
                        } else {
                            notificationService.sendNotification(
                                    p.getUsername(), notifTitle, notifMsg,
                                    NotificationEventType.VIDEO_SESSION_STARTED,
                                    "VIDEO_SESSION", session.getId(), actionUrl
                            );
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        return toResponse(session, username);
    }

    @Transactional
    public JoinVideoSessionResponse joinSession(UUID sessionId, String username, boolean isAdmin) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video session not found"));

        // Verify discussion is accessible
        DiscussionTopic discussion = session.getDiscussion();
        if (discussion == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Associated discussion topic not found");
        }

        // 1. Explicit Authorization Check:
        // Must be host, discussion topic author, invited participant, or system admin
        if (!isUserAuthorizedForSession(session, username, isAdmin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not an authorized participant in this video session");
        }

        // 2. Lifecycle status check:
        // Cannot join ended or cancelled sessions
        if ("ENDED".equalsIgnoreCase(session.getStatus()) || "CANCELLED".equalsIgnoreCase(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This video session has already ended or been cancelled");
        }

        boolean isHost = session.getHostUsername().equalsIgnoreCase(username);

        // If host joins a scheduled session, auto-activate it
        if (isHost && "SCHEDULED".equalsIgnoreCase(session.getStatus())) {
            session.setStatus("ACTIVE");
            session.setStartedAt(OffsetDateTime.now());
            videoSessionRepository.save(session);
        }

        // Find or create participant entry
        User currentUser = resolveUser(username);
        VideoSessionParticipant participant = participantRepository
                .findByVideoSessionIdAndUsernameIgnoreCase(sessionId, username)
                .orElseGet(() -> {
                    VideoSessionParticipant newP = new VideoSessionParticipant();
                    newP.setVideoSession(session);
                    newP.setUser(currentUser);
                    newP.setUsername(username);
                    newP.setRole(isHost ? "HOST" : (isAdmin ? "ADMIN" : "PARTICIPANT"));
                    return newP;
                });

        participant.setStatus("JOINED");
        participant.setJoinedAt(OffsetDateTime.now());
        participantRepository.save(participant);

        auditService.recordAuditLog(
                currentUser != null ? currentUser.getId().toString() : "user-" + username,
                currentUser != null ? currentUser.getEmail() : null,
                "VIDEO_SESSION_JOINED",
                "VIDEO_SESSION",
                session.getId().toString(),
                null,
                "{\"username\":\"" + username + "\",\"role\":\"" + participant.getRole() + "\"}"
        );

        String effectiveDomain = (jitsiDomain != null && !jitsiDomain.isBlank()) ? jitsiDomain
                : (jitsiTokenService != null ? jitsiTokenService.getJitsiDomain() : "");

        String displayName = currentUser != null && currentUser.getFullName() != null && !currentUser.getFullName().isBlank()
                ? currentUser.getFullName() : username;
        String email = currentUser != null ? currentUser.getEmail() : null;
        boolean isModerator = isHost || isAdmin;

        String jwtToken = jitsiTokenService.generateToken(
                session.getMeetingIdentifier(),
                username,
                displayName,
                email,
                isModerator,
                session.getId()
        );

        JoinVideoSessionResponse resp = new JoinVideoSessionResponse();
        resp.setSessionId(session.getId());
        resp.setDiscussionId(discussion.getId());
        resp.setDiscussionTitle(discussion.getTitle());
        resp.setTitle(session.getTitle());
        resp.setMeetingProvider(session.getMeetingProvider());
        resp.setMeetingIdentifier(session.getMeetingIdentifier());
        resp.setMeetingDomain(effectiveDomain);
        resp.setMeetingUrl(session.getMeetingUrl());
        resp.setUserDisplayName(displayName);
        resp.setUserEmail(email);
        resp.setParticipantRole(participant.getRole());
        resp.setHost(isHost);
        resp.setJwtToken(jwtToken);

        return resp;
    }

    @Transactional
    public JoinVideoSessionResponse joinSession(UUID sessionId, String username) {
        return joinSession(sessionId, username, false);
    }

    @Transactional
    public void leaveSession(UUID sessionId, String username) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video session not found"));

        participantRepository.findByVideoSessionIdAndUsernameIgnoreCase(sessionId, username).ifPresent(p -> {
            p.setStatus("LEFT");
            p.setLeftAt(OffsetDateTime.now());
            participantRepository.save(p);

            auditService.recordAuditLog(
                    username, null,
                    "VIDEO_SESSION_LEFT",
                    "VIDEO_SESSION",
                    session.getId().toString(),
                    null,
                    "{\"username\":\"" + username + "\"}"
            );
        });
    }

    @Transactional
    public VideoSessionResponse endSession(UUID sessionId, String username, boolean isAdmin) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video session not found"));

        boolean isHost = session.getHostUsername().equalsIgnoreCase(username);
        if (!isHost && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host or an administrator can end this video session");
        }

        session.setStatus("ENDED");
        session.setEndedAt(OffsetDateTime.now());

        for (VideoSessionParticipant p : session.getParticipants()) {
            if ("JOINED".equalsIgnoreCase(p.getStatus())) {
                p.setStatus("LEFT");
                p.setLeftAt(OffsetDateTime.now());
            }
        }

        VideoSession saved = videoSessionRepository.save(session);

        auditService.recordAuditLog(
                username, null,
                "VIDEO_SESSION_ENDED",
                "VIDEO_SESSION",
                saved.getId().toString(),
                null,
                "{\"title\":\"" + saved.getTitle() + "\",\"durationEndedAt\":\"" + saved.getEndedAt() + "\"}"
        );

        // Send ended notifications
        for (VideoSessionParticipant p : saved.getParticipants()) {
            if (!p.getUsername().equalsIgnoreCase(username)) {
                try {
                    String notifTitle = "Video Session Ended: " + saved.getTitle();
                    String notifMsg = "Host has concluded the video discussion: \"" + saved.getTitle() + "\"";
                    String actionUrl = "/discussions/" + saved.getDiscussion().getId();
                    if (p.getUser() != null) {
                        notificationService.sendNotificationToUser(
                                p.getUser(), notifTitle, notifMsg,
                                NotificationEventType.VIDEO_SESSION_ENDED,
                                "VIDEO_SESSION", saved.getId(), actionUrl
                        );
                    }
                } catch (Exception ignored) {}
            }
        }

        return toResponse(saved, username);
    }

    @Transactional
    public VideoSessionResponse inviteParticipants(UUID sessionId, InviteParticipantsRequest req, String username, boolean isAdmin) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video session not found"));

        boolean isHost = session.getHostUsername().equalsIgnoreCase(username);
        if (!isHost && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only host or admin can invite participants");
        }

        Map<UUID, User> toAdd = new LinkedHashMap<>();

        // 1. Primary: participantUserIds
        if (req != null && req.getParticipantUserIds() != null) {
            for (UUID uid : req.getParticipantUserIds()) {
                if (uid == null) continue;
                User targetUser = userRepository.findById(uid)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant with ID '" + uid + "' does not exist"));
                if (Boolean.FALSE.equals(targetUser.getIsActive())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant '" + targetUser.getUsername() + "' is inactive");
                }
                if (targetUser.getUsername().equalsIgnoreCase(session.getHostUsername())) {
                    continue; // Host cannot be added as normal participant
                }
                if (!participantRepository.existsByVideoSessionIdAndUsernameIgnoreCase(sessionId, targetUser.getUsername())) {
                    toAdd.put(targetUser.getId(), targetUser);
                }
            }
        }

        // 2. Backward-compat: usernames
        if (req != null && req.getUsernames() != null) {
            for (String u : req.getUsernames()) {
                if (u == null || u.isBlank()) continue;
                String cleanUsername = u.trim();
                if (cleanUsername.equalsIgnoreCase(session.getHostUsername())) {
                    continue; // Host cannot be added as normal participant
                }
                User targetUser = resolveUser(cleanUsername);
                if (targetUser == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant with username '" + cleanUsername + "' does not exist");
                }
                if (Boolean.FALSE.equals(targetUser.getIsActive())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected participant '" + cleanUsername + "' is inactive");
                }
                if (!participantRepository.existsByVideoSessionIdAndUsernameIgnoreCase(sessionId, targetUser.getUsername())) {
                    toAdd.putIfAbsent(targetUser.getId(), targetUser);
                }
            }
        }

        for (User targetUser : toAdd.values()) {
            VideoSessionParticipant p = new VideoSessionParticipant();
            p.setVideoSession(session);
            p.setUser(targetUser);
            p.setUsername(targetUser.getUsername());
            p.setRole("PARTICIPANT");
            p.setStatus("INVITED");
            session.getParticipants().add(p);

            auditService.recordAuditLog(
                    username, null,
                    "VIDEO_SESSION_PARTICIPANT_ADDED",
                    "VIDEO_SESSION",
                    sessionId.toString(),
                    null,
                    "{\"invited\":\"" + targetUser.getUsername() + "\"}"
            );

            try {
                String notifTitle = "Invited to Video Discussion: " + session.getTitle();
                String notifMsg = username + " invited you to video discussion: \"" + session.getTitle() + "\"";
                String actionUrl = "/discussions/" + session.getDiscussion().getId();
                notificationService.sendNotificationToUser(
                        targetUser, notifTitle, notifMsg,
                        NotificationEventType.VIDEO_SESSION_INVITED,
                        "VIDEO_SESSION", session.getId(), actionUrl
                );
            } catch (Exception ignored) {}
        }

        VideoSession saved = videoSessionRepository.save(session);
        return toResponse(saved, username, isAdmin);
    }

    @Transactional
    public VideoSessionResponse inviteParticipants(UUID sessionId, List<String> usernames, String username, boolean isAdmin) {
        InviteParticipantsRequest req = new InviteParticipantsRequest();
        req.setUsernames(usernames);
        return inviteParticipants(sessionId, req, username, isAdmin);
    }

    @Transactional
    public void removeParticipant(UUID sessionId, String targetUsername, String username, boolean isAdmin) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video session not found"));

        boolean isHost = session.getHostUsername().equalsIgnoreCase(username);
        if (!isHost && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only host or admin can remove participants");
        }

        participantRepository.deleteByVideoSessionIdAndUsername(sessionId, targetUsername);

        auditService.recordAuditLog(
                username, null,
                "VIDEO_SESSION_PARTICIPANT_REMOVED",
                "VIDEO_SESSION",
                sessionId.toString(),
                null,
                "{\"removed\":\"" + targetUsername + "\"}"
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAvailableUsers(String query) {
        List<User> users;
        if (query != null && !query.isBlank()) {
            String q = query.trim();
            users = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(q, q, q);
        } else {
            users = userRepository.findAll();
        }

        return users.stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .map(u -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", u.getId());
                    map.put("username", u.getUsername());
                    map.put("fullName", (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getUsername());
                    map.put("email", u.getEmail());
                    map.put("department", u.getDepartment() != null ? u.getDepartment().getName() : null);
                    map.put("jobTitle", u.getJobTitle());
                    return map;
                })
                .limit(25)
                .toList();
    }

    private String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }

    private User resolveUser(String username) {
        if (username == null || username.isBlank()) return null;
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElse(null);
    }

    private VideoSessionResponse toResponse(VideoSession session, String currentUsername, boolean isAdmin) {
        VideoSessionResponse resp = new VideoSessionResponse();
        resp.setId(session.getId());
        resp.setDiscussionId(session.getDiscussion().getId());
        resp.setDiscussionTitle(session.getDiscussion().getTitle());
        resp.setHostUserId(session.getHostUser() != null ? session.getHostUser().getId() : null);
        resp.setHostUsername(session.getHostUsername());
        resp.setHostFullName(session.getHostUser() != null && session.getHostUser().getFullName() != null
                ? session.getHostUser().getFullName() : session.getHostUsername());
        resp.setTitle(session.getTitle());
        resp.setDescription(session.getDescription());
        resp.setScheduledStart(session.getScheduledStart());
        resp.setScheduledEnd(session.getScheduledEnd());
        resp.setStatus(session.getStatus());
        resp.setMeetingProvider(session.getMeetingProvider());

        boolean isHost = session.getHostUsername().equalsIgnoreCase(currentUsername);
        resp.setHost(isHost);

        boolean authorized = isUserAuthorizedForSession(session, currentUsername, isAdmin);
        boolean notEnded = !"ENDED".equalsIgnoreCase(session.getStatus()) && !"CANCELLED".equalsIgnoreCase(session.getStatus());
        resp.setCanJoin(notEnded && authorized);

        // Security hardening: Mask meetingIdentifier and meetingUrl for unauthorized users
        if (authorized) {
            resp.setMeetingIdentifier(session.getMeetingIdentifier());
            resp.setMeetingUrl(session.getMeetingUrl());
        } else {
            resp.setMeetingIdentifier(null);
            resp.setMeetingUrl(null);
        }

        resp.setStartedAt(session.getStartedAt());
        resp.setEndedAt(session.getEndedAt());
        resp.setCreatedAt(session.getCreatedAt());
        resp.setUpdatedAt(session.getUpdatedAt());

        List<VideoParticipantDto> participantDtos = new ArrayList<>();
        if (session.getParticipants() != null) {
            for (VideoSessionParticipant p : session.getParticipants()) {
                VideoParticipantDto dto = new VideoParticipantDto();
                dto.setId(p.getId());
                dto.setUserId(p.getUser() != null ? p.getUser().getId() : null);
                dto.setUsername(p.getUsername());
                dto.setFullName(p.getUser() != null && p.getUser().getFullName() != null ? p.getUser().getFullName() : p.getUsername());
                dto.setRole(p.getRole());
                dto.setStatus(p.getStatus());
                dto.setJoinedAt(p.getJoinedAt());
                dto.setLeftAt(p.getLeftAt());
                participantDtos.add(dto);
            }
        }
        resp.setParticipants(participantDtos);

        return resp;
    }

    private VideoSessionResponse toResponse(VideoSession session, String currentUsername) {
        return toResponse(session, currentUsername, false);
    }
}
