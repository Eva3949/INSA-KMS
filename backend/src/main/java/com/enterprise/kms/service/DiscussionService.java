package com.enterprise.kms.service;

import com.enterprise.kms.dto.DiscussionAttachmentDTO;
import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.DiscussionAttachment;
import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DiscussionAttachmentRepository;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DiscussionService {
    private final DiscussionTopicRepository topicRepository;
    private final DiscussionReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final NotificationService notificationService;
    private final DiscussionAttachmentRepository attachmentRepository;
    private final DiscussionMediaService mediaService;
    private final Map<UUID, Map<String, OffsetDateTime>> topicUserViews = new ConcurrentHashMap<>();

    public DiscussionService(DiscussionTopicRepository topicRepository,
                             DiscussionReplyRepository replyRepository,
                             UserRepository userRepository,
                             NotificationService notificationService) {
        this(topicRepository, replyRepository, userRepository, null, notificationService, null, null);
    }

    public DiscussionService(DiscussionTopicRepository topicRepository,
                             DiscussionReplyRepository replyRepository,
                             UserRepository userRepository,
                             DepartmentRepository departmentRepository,
                             NotificationService notificationService) {
        this(topicRepository, replyRepository, userRepository, departmentRepository, notificationService, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public DiscussionService(DiscussionTopicRepository topicRepository,
                             DiscussionReplyRepository replyRepository,
                             UserRepository userRepository,
                             DepartmentRepository departmentRepository,
                             NotificationService notificationService,
                             DiscussionAttachmentRepository attachmentRepository,
                             DiscussionMediaService mediaService) {
        this.topicRepository = topicRepository;
        this.replyRepository = replyRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.notificationService = notificationService;
        this.attachmentRepository = attachmentRepository;
        this.mediaService = mediaService;
    }

    /**
     * Evaluates whether the user is authorized to view or interact with a discussion topic.
     */
    public boolean isUserAuthorizedForTopic(DiscussionTopic topic, String username, boolean isAdmin) {
        if (topic == null || username == null || username.isBlank()) {
            return false;
        }
        if (isAdmin) {
            return true;
        }
        if (topic.getAuthorUsername() != null && topic.getAuthorUsername().equalsIgnoreCase(username)) {
            return true;
        }

        String visibility = topic.getVisibility() != null ? topic.getVisibility().toUpperCase().trim() : "PUBLIC";
        if ("PUBLIC".equals(visibility)) {
            return true;
        }

        User currentUser = resolveUser(username);
        if (currentUser == null) {
            return false;
        }

        if ("INTERNAL".equals(visibility)) {
            if (currentUser.getDepartment() == null || topic.getAllowedDepartments() == null) {
                return false;
            }
            UUID userDeptId = currentUser.getDepartment().getId();
            return topic.getAllowedDepartments().stream()
                    .anyMatch(d -> d.getId().equals(userDeptId));
        }

        if ("CONFIDENTIAL".equals(visibility)) {
            if (topic.getParticipants() == null) {
                return false;
            }
            return topic.getParticipants().stream()
                    .anyMatch(p -> p.getId().equals(currentUser.getId()) ||
                            (p.getUsername() != null && p.getUsername().equalsIgnoreCase(username)));
        }

        return false;
    }

    /**
     * Validates that the requesting user is authorized to access the given topic.
     * Throws 403 FORBIDDEN if unauthorized.
     */
    public void validateAndCheckAccess(DiscussionTopic topic, String username, boolean isAdmin) {
        if (!isUserAuthorizedForTopic(topic, username, isAdmin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You are not authorized to access this discussion");
        }
    }

    @Transactional
    public DiscussionTopic createTopic(Map<String, Object> body, String username) {
        String title = (String) body.get("title");
        String description = (String) body.get("description");

        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Topic title is required");
        }

        List<?> attachmentIdsRaw = (List<?>) body.get("attachmentIds");
        List<UUID> attachmentIds = new ArrayList<>();
        if (attachmentIdsRaw != null) {
            for (Object o : attachmentIdsRaw) {
                if (o != null && !o.toString().isBlank()) {
                    attachmentIds.add(UUID.fromString(o.toString().trim()));
                }
            }
        }

        if ((description == null || description.isBlank()) && attachmentIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Topic description or attachment is required");
        }

        User author = resolveUser(username);

        DiscussionTopic topic = new DiscussionTopic();
        topic.setTitle(title.trim());
        topic.setDescription(sanitizeHtml(description != null ? description : ""));
        topic.setStatus("OPEN");
        topic.setAuthor(author);
        topic.setAuthorUsername(username);

        // Visibility processing
        String rawVisibility = (String) body.get("visibility");
        String visibility = "PUBLIC";
        if (rawVisibility != null && !rawVisibility.isBlank()) {
            String vUpper = rawVisibility.trim().toUpperCase();
            if (vUpper.equals("INTERNAL") || vUpper.equals("CONFIDENTIAL") || vUpper.equals("PUBLIC")) {
                visibility = vUpper;
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility level: " + rawVisibility);
            }
        }
        topic.setVisibility(visibility);

        // Internal: Department selection validation
        if ("INTERNAL".equals(visibility)) {
            List<?> deptIdsRaw = (List<?>) body.get("departmentIds");
            if (deptIdsRaw == null || deptIdsRaw.isEmpty()) {
                deptIdsRaw = (List<?>) body.get("departments");
            }
            if (deptIdsRaw == null || deptIdsRaw.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one department must be selected for INTERNAL discussions");
            }

            Set<Department> allowedDepts = new HashSet<>();
            for (Object o : deptIdsRaw) {
                if (o != null && !o.toString().isBlank()) {
                    UUID deptId = UUID.fromString(o.toString().trim());
                    Department dept = departmentRepository.findById(deptId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found: " + deptId));
                    allowedDepts.add(dept);
                }
            }
            if (allowedDepts.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one valid department must be selected for INTERNAL discussions");
            }
            topic.setAllowedDepartments(allowedDepts);
        }

        // Confidential: Participant selection validation
        if ("CONFIDENTIAL".equals(visibility)) {
            List<?> participantIdsRaw = (List<?>) body.get("participantIds");
            List<?> participantUsernamesRaw = (List<?>) body.get("participantUsernames");

            Set<User> participants = new HashSet<>();
            if (participantIdsRaw != null) {
                for (Object o : participantIdsRaw) {
                    if (o != null && !o.toString().isBlank()) {
                        UUID uId = UUID.fromString(o.toString().trim());
                        User u = userRepository.findById(uId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Participant user not found: " + uId));
                        participants.add(u);
                    }
                }
            }
            if (participantUsernamesRaw != null) {
                for (Object o : participantUsernamesRaw) {
                    if (o != null && !o.toString().isBlank()) {
                        String uName = o.toString().trim();
                        User u = resolveUser(uName);
                        if (u != null) {
                            participants.add(u);
                        }
                    }
                }
            }

            // Ensure creator is also included or allowed
            if (author != null) {
                participants.add(author);
            }

            if (participants.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one valid participant must be selected for CONFIDENTIAL discussions");
            }
            topic.setParticipants(participants);
        }

        DiscussionTopic savedTopic = topicRepository.save(topic);

        // Link any attachments provided
        for (UUID attId : attachmentIds) {
            attachmentRepository.findById(attId).ifPresent(att -> {
                att.setDiscussion(savedTopic);
                attachmentRepository.save(att);
            });
        }

        // Scoped notification dispatch based on visibility
        try {
            String notifTitle = "New Discussion Topic: " + savedTopic.getTitle();
            String notifMessage = username + " created a new discussion topic: \"" + savedTopic.getTitle() + "\"";

            if ("PUBLIC".equals(visibility)) {
                List<User> allUsers = userRepository.findAll();
                for (User u : allUsers) {
                    if (u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                        notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                    }
                }
            } else if ("INTERNAL".equals(visibility)) {
                Set<UUID> deptIds = new HashSet<>();
                for (Department d : savedTopic.getAllowedDepartments()) {
                    deptIds.add(d.getId());
                }
                List<User> allUsers = userRepository.findAll();
                for (User u : allUsers) {
                    if (u.getDepartment() != null && deptIds.contains(u.getDepartment().getId())
                            && u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                        notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                    }
                }
            } else if ("CONFIDENTIAL".equals(visibility)) {
                for (User u : savedTopic.getParticipants()) {
                    if (u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                        notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                    }
                }
            }
        } catch (Exception e) {
            // Silently swallow notification errors
        }

        return savedTopic;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> searchTopics(String search, String status, String username, boolean isAdmin, Pageable pageable) {
        String effectiveSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String effectiveStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) ? status.trim() : null;

        User currentUser = resolveUser(username);
        UUID userId = currentUser != null ? currentUser.getId() : null;
        UUID departmentId = (currentUser != null && currentUser.getDepartment() != null) ? currentUser.getDepartment().getId() : null;

        return topicRepository.searchAuthorizedTopics(effectiveSearch, effectiveStatus, username, userId, departmentId, isAdmin, pageable)
                .map(this::toTopicResponse);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> searchTopics(String search, String status, Pageable pageable) {
        return searchTopics(search, status, null, false, pageable);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTopicDetail(UUID id, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        validateAndCheckAccess(topic, username, isAdmin);

        if (username != null && !username.isBlank()) {
            topicUserViews.computeIfAbsent(id, k -> new ConcurrentHashMap<>())
                          .put(username.trim().toLowerCase(), OffsetDateTime.now());
        }

        Map<String, Object> response = toTopicResponse(topic);
        response.put("isRead", isMessageReadByOtherUser(id, topic.getAuthorUsername(), topic.getCreatedAt()));

        List<DiscussionReply> replies = replyRepository.findByTopicIdOrderByCreatedAtAsc(id);
        List<Map<String, Object>> replyList = new ArrayList<>();
        for (DiscussionReply r : replies) {
            Map<String, Object> replyMap = toReplyResponse(r);
            replyMap.put("isRead", isMessageReadByOtherUser(id, r.getAuthorUsername(), r.getCreatedAt()));
            replyList.add(replyMap);
        }
        response.put("replies", replyList);
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTopicDetail(UUID id, String username) {
        return getTopicDetail(id, username, false);
    }

    private boolean isMessageReadByOtherUser(UUID topicId, String authorUsername, OffsetDateTime createdAt) {
        Map<String, OffsetDateTime> userViews = topicUserViews.get(topicId);
        if (userViews == null || userViews.isEmpty()) {
            return false;
        }
        String authorLower = authorUsername != null ? authorUsername.trim().toLowerCase() : "";
        for (Map.Entry<String, OffsetDateTime> entry : userViews.entrySet()) {
            String viewer = entry.getKey();
            OffsetDateTime viewedAt = entry.getValue();
            if (!viewer.equalsIgnoreCase(authorLower) && viewedAt != null && !viewedAt.isBefore(createdAt)) {
                return true;
            }
        }
        return false;
    }

    @Transactional
    public DiscussionReply addReply(UUID topicId, Map<String, Object> body, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        validateAndCheckAccess(topic, username, isAdmin);

        if ("CLOSED".equalsIgnoreCase(topic.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot reply to a closed discussion topic");
        }

        String content = (String) body.get("content");
        List<?> attachmentIdsRaw = (List<?>) body.get("attachmentIds");
        List<UUID> attachmentIds = new ArrayList<>();
        if (attachmentIdsRaw != null) {
            for (Object o : attachmentIdsRaw) {
                if (o != null && !o.toString().isBlank()) {
                    attachmentIds.add(UUID.fromString(o.toString().trim()));
                }
            }
        }

        boolean hasAttachments = !attachmentIds.isEmpty();
        if ((content == null || content.isBlank()) && !hasAttachments) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply content or attachment is required");
        }

        User author = resolveUser(username);

        DiscussionReply reply = new DiscussionReply();
        reply.setTopic(topic);
        reply.setContent(sanitizeHtml(content != null ? content : ""));
        reply.setAuthor(author);
        reply.setAuthorUsername(username);

        if (body.containsKey("parentReplyId") && body.get("parentReplyId") != null) {
            String parentIdStr = (String) body.get("parentReplyId");
            if (!parentIdStr.isBlank()) {
                UUID parentUuid = UUID.fromString(parentIdStr);
                DiscussionReply parent = replyRepository.findById(parentUuid)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent reply not found"));

                if (!parent.getTopic().getId().equals(topicId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent reply does not belong to this discussion topic");
                }
                reply.setParentReply(parent);
            }
        }

        topic.setUpdatedAt(OffsetDateTime.now());
        topicRepository.save(topic);

        DiscussionReply savedReply = replyRepository.save(reply);

        // Link attachments to this reply
        for (UUID attId : attachmentIds) {
            attachmentRepository.findByIdAndDiscussionId(attId, topicId).ifPresent(att -> {
                att.setReply(savedReply);
                attachmentRepository.save(att);
            });
        }

        // Scoped notification for replies
        try {
            String notifTitle = "New Message in Discussion: " + topic.getTitle();
            String snippet;
            if (content != null && !content.isBlank()) {
                snippet = content.length() > 80 ? content.substring(0, 80) + "..." : content;
                if (hasAttachments) {
                    snippet += " [Attachment]";
                }
            } else {
                List<DiscussionAttachmentDTO> replyAtts = mediaService != null ? mediaService.getReplyAttachments(savedReply.getId()) : Collections.emptyList();
                if (!replyAtts.isEmpty()) {
                    DiscussionAttachmentDTO first = replyAtts.get(0);
                    if ("AUDIO".equalsIgnoreCase(first.getMediaType())) {
                        snippet = "[Voice Note" + (first.getDurationSeconds() > 0 ? ": " + first.getDurationSeconds() + "s]" : "]");
                    } else {
                        snippet = "[Image Attachment]";
                    }
                } else {
                    snippet = "[Attachment]";
                }
            }
            String notifMessage = username + ": \"" + snippet + "\"";

            String visibility = topic.getVisibility() != null ? topic.getVisibility().toUpperCase().trim() : "PUBLIC";
            if ("PUBLIC".equals(visibility)) {
                List<User> allUsers = userRepository.findAll();
                for (User u : allUsers) {
                    if (u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                        notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                    }
                }
            } else if ("INTERNAL".equals(visibility)) {
                Set<UUID> deptIds = new HashSet<>();
                for (Department d : topic.getAllowedDepartments()) {
                    deptIds.add(d.getId());
                }
                List<User> allUsers = userRepository.findAll();
                for (User u : allUsers) {
                    if (u.getDepartment() != null && deptIds.contains(u.getDepartment().getId())
                            && u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                        notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                    }
                }
            } else if ("CONFIDENTIAL".equals(visibility)) {
                for (User u : topic.getParticipants()) {
                    if (u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                        notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                    }
                }
            }
        } catch (Exception e) {
            // Silently swallow notification errors
        }

        return savedReply;
    }

    @Transactional
    public DiscussionReply addReply(UUID topicId, Map<String, Object> body, String username) {
        return addReply(topicId, body, username, false);
    }

    @Transactional
    public DiscussionTopic setTopicStatus(UUID topicId, String status, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        validateAndCheckAccess(topic, username, isAdmin);

        boolean isAuthor = topic.getAuthorUsername().equalsIgnoreCase(username);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can change discussion topic status");
        }

        if ("CLOSED".equalsIgnoreCase(status)) {
            topic.setStatus("CLOSED");
        } else {
            topic.setStatus("OPEN");
        }

        return topicRepository.save(topic);
    }

    @Transactional
    public void deleteTopic(UUID topicId, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        validateAndCheckAccess(topic, username, isAdmin);

        boolean isAuthor = topic.getAuthorUsername().equalsIgnoreCase(username);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can delete discussion topic");
        }

        topicRepository.delete(topic);
    }

    @Transactional
    public void deleteReply(UUID replyId, String username, boolean isAdmin) {
        DiscussionReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion reply not found"));

        validateAndCheckAccess(reply.getTopic(), username, isAdmin);

        boolean isAuthor = reply.getAuthorUsername().equalsIgnoreCase(username);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only reply author or admin can delete this reply");
        }

        replyRepository.delete(reply);
    }

    public Map<String, Object> toTopicResponse(DiscussionTopic topic) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", topic.getId());
        res.put("title", topic.getTitle());
        res.put("description", topic.getDescription());
        res.put("status", topic.getStatus());
        res.put("visibility", topic.getVisibility() != null ? topic.getVisibility() : "PUBLIC");
        res.put("author", topic.getAuthorUsername());
        res.put("authorId", topic.getAuthor() != null ? topic.getAuthor().getId() : null);

        // Allowed departments
        List<Map<String, Object>> depts = new ArrayList<>();
        List<UUID> deptIds = new ArrayList<>();
        List<String> deptNames = new ArrayList<>();
        if (topic.getAllowedDepartments() != null) {
            for (Department d : topic.getAllowedDepartments()) {
                Map<String, Object> dm = new LinkedHashMap<>();
                dm.put("id", d.getId());
                dm.put("name", d.getName());
                dm.put("code", d.getCode());
                depts.add(dm);
                deptIds.add(d.getId());
                deptNames.add(d.getName());
            }
        }
        res.put("allowedDepartments", depts);
        res.put("allowedDepartmentIds", deptIds);
        res.put("allowedDepartmentNames", deptNames);

        // Participants
        List<Map<String, Object>> parts = new ArrayList<>();
        List<UUID> partIds = new ArrayList<>();
        List<String> partUsernames = new ArrayList<>();
        if (topic.getParticipants() != null) {
            for (User u : topic.getParticipants()) {
                Map<String, Object> um = new LinkedHashMap<>();
                um.put("id", u.getId());
                um.put("username", u.getUsername());
                um.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUsername());
                um.put("email", u.getEmail());
                parts.add(um);
                partIds.add(u.getId());
                partUsernames.add(u.getUsername());
            }
        }
        res.put("participants", parts);
        res.put("participantIds", partIds);
        res.put("participantUsernames", partUsernames);

        res.put("createdAt", topic.getCreatedAt());
        res.put("updatedAt", topic.getUpdatedAt());
        res.put("replyCount", replyRepository.countByTopicId(topic.getId()));
        res.put("attachments", mediaService != null ? mediaService.getTopicAttachments(topic.getId()) : Collections.emptyList());
        return res;
    }

    public Map<String, Object> toReplyResponse(DiscussionReply reply) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", reply.getId());
        res.put("topicId", reply.getTopic().getId());
        res.put("parentReplyId", reply.getParentReply() != null ? reply.getParentReply().getId() : null);
        res.put("content", reply.getContent());
        res.put("author", reply.getAuthorUsername());
        res.put("authorId", reply.getAuthor() != null ? reply.getAuthor().getId() : null);
        res.put("createdAt", reply.getCreatedAt());
        res.put("updatedAt", reply.getUpdatedAt());
        res.put("attachments", mediaService != null ? mediaService.getReplyAttachments(reply.getId()) : Collections.emptyList());
        return res;
    }

    private User resolveUser(String username) {
        if (username == null || username.isBlank()) return null;
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElse(null);
    }

    private String sanitizeHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("(?i)<script.*?>.*?</script>", "")
                   .replaceAll("(?i)javascript:", "")
                   .replaceAll("(?i)on\\w+\\s*=", "data-disabled=");
    }
}
