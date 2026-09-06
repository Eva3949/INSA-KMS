package com.enterprise.kms;

import com.enterprise.kms.dto.CreateVideoSessionRequest;
import com.enterprise.kms.dto.JoinVideoSessionResponse;
import com.enterprise.kms.dto.VideoSessionResponse;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.entity.VideoSession;
import com.enterprise.kms.entity.VideoSessionParticipant;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.repository.VideoSessionParticipantRepository;
import com.enterprise.kms.repository.VideoSessionRepository;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.JitsiTokenService;
import com.enterprise.kms.service.NotificationService;
import com.enterprise.kms.service.VideoSessionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class DiscussionVideoSessionUnitTest {

    private static final String TEST_JWT_SECRET = "production-grade-secure-secret-minimum-32-chars-entropy-test!";
    private static final String TEST_JITSI_DOMAIN = "jitsi.kms.internal";
    private static final String TEST_JWT_APP_ID = "insa-kms-video";

    private ObjectMapper objectMapper;
    private JitsiTokenService jitsiTokenService;

    @BeforeEach
    public void setup() {
        objectMapper = new ObjectMapper();
        jitsiTokenService = new JitsiTokenService(
                objectMapper,
                TEST_JITSI_DOMAIN,
                TEST_JWT_APP_ID,
                TEST_JWT_SECRET,
                300
        );
    }

    @Test
    @DisplayName("Create Video Session: verifies session, host, invited participants, notifications, and audit logging")
    public void testCreateVideoSession() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("Kubernetes Cluster Architecture");
        topic.setStatus("OPEN");

        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("bob");
        hostUser.setEmail("bob@enterprise.internal");
        when(userRepo.findByUsername("bob")).thenReturn(Optional.of(hostUser));

        User aliceUser = new User();
        aliceUser.setId(UUID.randomUUID());
        aliceUser.setUsername("alice");
        aliceUser.setEmail("alice@enterprise.internal");
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(aliceUser));

        when(sessionRepo.save(any(VideoSession.class))).thenAnswer(inv -> {
            VideoSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Architecture Review Call");
        req.setDescription("Reviewing worker nodes and ingress configuration.");
        req.setInvitedUsernames(List.of("alice"));

        VideoSessionResponse resp = service.createSession(topicId, req, "bob", false);

        Assertions.assertNotNull(resp);
        Assertions.assertEquals("Architecture Review Call", resp.getTitle());
        Assertions.assertEquals("bob", resp.getHostUsername());
        Assertions.assertEquals(topicId, resp.getDiscussionId());
        Assertions.assertEquals(2, resp.getParticipants().size()); // Bob (host) + Alice (participant)

        // Verify audit log
        verify(auditService).recordAuditLog(
                eq(hostUser.getId().toString()),
                eq(hostUser.getEmail()),
                eq("VIDEO_SESSION_CREATED"),
                eq("VIDEO_SESSION"),
                anyString(),
                isNull(),
                contains("Architecture Review Call")
        );

        // Verify invitation notification sent to Alice
        verify(notifService).sendNotificationToUser(
                eq(aliceUser),
                contains("Architecture Review Call"),
                contains("bob invited you"),
                eq("VIDEO_SESSION_INVITED"),
                eq("VIDEO_SESSION"),
                any(),
                contains(topicId.toString())
        );
    }

    @Test
    @DisplayName("Join Video Session: authorized participant receives valid Jitsi JWT without query param leakage")
    public void testJoinVideoSession() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("Security Incident Post-Mortem");

        UUID sessionId = UUID.randomUUID();
        VideoSession session = new VideoSession();
        session.setId(sessionId);
        session.setDiscussion(topic);
        session.setHostUsername("charlie");
        session.setTitle("Post-Mortem War Room");
        session.setStatus("SCHEDULED");
        session.setMeetingProvider("JITSI");
        session.setMeetingIdentifier("INSA-KMS-Discussion-abc12345");
        session.setMeetingUrl("https://" + TEST_JITSI_DOMAIN + "/INSA-KMS-Discussion-abc12345");

        when(sessionRepo.findById(sessionId)).thenReturn(Optional.of(session));
        when(partRepo.existsByVideoSessionIdAndUsernameIgnoreCase(sessionId, "alice")).thenReturn(true);

        User joiningUser = new User();
        joiningUser.setId(UUID.randomUUID());
        joiningUser.setUsername("alice");
        joiningUser.setFullName("Alice Smith");
        joiningUser.setEmail("alice@enterprise.internal");
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(joiningUser));

        VideoSessionParticipant invitedParticipant = new VideoSessionParticipant();
        invitedParticipant.setUsername("alice");
        invitedParticipant.setStatus("INVITED");
        invitedParticipant.setRole("PARTICIPANT");
        when(partRepo.findByVideoSessionIdAndUsernameIgnoreCase(sessionId, "alice")).thenReturn(Optional.of(invitedParticipant));
        when(partRepo.save(any(VideoSessionParticipant.class))).thenAnswer(inv -> inv.getArgument(0));

        JoinVideoSessionResponse joinResp = service.joinSession(sessionId, "alice");

        Assertions.assertNotNull(joinResp);
        Assertions.assertEquals(sessionId, joinResp.getSessionId());
        Assertions.assertEquals("JITSI", joinResp.getMeetingProvider());
        Assertions.assertEquals("INSA-KMS-Discussion-abc12345", joinResp.getMeetingIdentifier());
        Assertions.assertEquals("Alice Smith", joinResp.getUserDisplayName());
        Assertions.assertFalse(joinResp.isHost());

        // CRITICAL SECURITY ASSERTION: Valid JWT Token is generated
        Assertions.assertNotNull(joinResp.getJwtToken());
        Assertions.assertFalse(joinResp.getJwtToken().isBlank());
        Assertions.assertTrue(jitsiTokenService.validateToken(joinResp.getJwtToken(), "INSA-KMS-Discussion-abc12345"));

        // CRITICAL SECURITY ASSERTION: Meeting URL must NEVER contain ?jwt=
        Assertions.assertFalse(joinResp.getMeetingUrl().contains("?jwt="));
        Assertions.assertFalse(joinResp.getMeetingUrl().contains("token="));

        // Verify participant saved with JOINED status
        ArgumentCaptor<VideoSessionParticipant> captor = ArgumentCaptor.forClass(VideoSessionParticipant.class);
        verify(partRepo).save(captor.capture());
        Assertions.assertEquals("JOINED", captor.getValue().getStatus());
        Assertions.assertNotNull(captor.getValue().getJoinedAt());

        // Verify audit log for join does NOT log the secret or the raw JWT token
        ArgumentCaptor<String> metadataCaptor = ArgumentCaptor.forClass(String.class);
        verify(auditService).recordAuditLog(
                eq(joiningUser.getId().toString()),
                eq(joiningUser.getEmail()),
                eq("VIDEO_SESSION_JOINED"),
                eq("VIDEO_SESSION"),
                eq(sessionId.toString()),
                isNull(),
                metadataCaptor.capture()
        );
        Assertions.assertFalse(metadataCaptor.getValue().contains(TEST_JWT_SECRET));
        Assertions.assertFalse(metadataCaptor.getValue().contains(joinResp.getJwtToken()));
    }

    @Test
    @DisplayName("Join Video Session: unauthorized user is rejected with 403 Forbidden and receives NO token")
    public void testUnauthorizedUserCannotJoinSession() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID sessionId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setTitle("Restricted Discussion");
        topic.setAuthorUsername("charlie");

        VideoSession session = new VideoSession();
        session.setId(sessionId);
        session.setDiscussion(topic);
        session.setHostUsername("charlie");
        session.setStatus("ACTIVE");

        when(sessionRepo.findById(sessionId)).thenReturn(Optional.of(session));
        when(partRepo.existsByVideoSessionIdAndUsernameIgnoreCase(sessionId, "eve")).thenReturn(false);

        // Eve is authenticated in Keycloak but uninvited -> 403 Forbidden
        ResponseStatusException ex = Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.joinSession(sessionId, "eve", false);
        });
        Assertions.assertEquals(403, ex.getStatusCode().value());
        Assertions.assertTrue(ex.getReason().contains("not an authorized participant"));

        // Eve also cannot view details directly -> 403 Forbidden
        ResponseStatusException detailEx = Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.getSessionDetail(sessionId, "eve", false);
        });
        Assertions.assertEquals(403, detailEx.getStatusCode().value());
        Assertions.assertTrue(detailEx.getReason().contains("not authorized to view details"));
    }

    @Test
    @DisplayName("Join Ended Session: rejects with 400 Bad Request for authorized participant")
    public void testCannotJoinEndedSession() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID sessionId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setAuthorUsername("charlie");

        VideoSession session = new VideoSession();
        session.setId(sessionId);
        session.setStatus("ENDED");
        session.setHostUsername("charlie");
        session.setDiscussion(topic);

        when(sessionRepo.findById(sessionId)).thenReturn(Optional.of(session));
        when(partRepo.existsByVideoSessionIdAndUsernameIgnoreCase(sessionId, "alice")).thenReturn(true);

        ResponseStatusException ex = Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.joinSession(sessionId, "alice", false);
        });
        Assertions.assertEquals(400, ex.getStatusCode().value());
        Assertions.assertTrue(ex.getReason().contains("already ended"));
    }

    @Test
    @DisplayName("End Video Session: non-host cannot end session (403), host ends session successfully")
    public void testHostEndSessionLifecycle() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID sessionId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setTitle("DevOps Sync");

        VideoSession session = new VideoSession();
        session.setId(sessionId);
        session.setDiscussion(topic);
        session.setHostUsername("alice");
        session.setTitle("Daily Standup Call");
        session.setStatus("ACTIVE");

        VideoSessionParticipant p = new VideoSessionParticipant();
        p.setUsername("bob");
        p.setStatus("JOINED");
        session.getParticipants().add(p);

        when(sessionRepo.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionRepo.save(any(VideoSession.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. Bob (non-host, non-admin) attempts to end session -> 403 Forbidden
        ResponseStatusException ex = Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.endSession(sessionId, "bob", false);
        });
        Assertions.assertEquals(403, ex.getStatusCode().value());

        // 2. Alice (host) ends session -> SUCCESS
        VideoSessionResponse resp = service.endSession(sessionId, "alice", false);
        Assertions.assertEquals("ENDED", resp.getStatus());
        Assertions.assertNotNull(resp.getEndedAt());
        Assertions.assertEquals("LEFT", p.getStatus());

        // Verify audit log
        verify(auditService).recordAuditLog(
                eq("alice"),
                isNull(),
                eq("VIDEO_SESSION_ENDED"),
                eq("VIDEO_SESSION"),
                eq(sessionId.toString()),
                isNull(),
                contains("Daily Standup Call")
        );
    }

    // =========================================================================
    // JITSI JWT & PROSODY SECURITY UNIT TESTS
    // =========================================================================

    @Test
    @DisplayName("JitsiTokenService Fail-Fast Startup: rejects blank domain, meet.jit.si, missing secret, or weak secret")
    public void testJitsiTokenServiceStartupValidation() {
        // 1. Blank domain
        Assertions.assertThrows(IllegalStateException.class, () -> {
            new JitsiTokenService(objectMapper, "", TEST_JWT_APP_ID, TEST_JWT_SECRET, 300);
        });

        // 2. Public meet.jit.si
        Assertions.assertThrows(IllegalStateException.class, () -> {
            new JitsiTokenService(objectMapper, "meet.jit.si", TEST_JWT_APP_ID, TEST_JWT_SECRET, 300);
        });
        Assertions.assertThrows(IllegalStateException.class, () -> {
            new JitsiTokenService(objectMapper, "subdomain.meet.jit.si", TEST_JWT_APP_ID, TEST_JWT_SECRET, 300);
        });

        // 3. Missing secret
        Assertions.assertThrows(IllegalStateException.class, () -> {
            new JitsiTokenService(objectMapper, TEST_JITSI_DOMAIN, TEST_JWT_APP_ID, "", 300);
        });

        // 4. Short secret (< 32 chars)
        Assertions.assertThrows(IllegalStateException.class, () -> {
            new JitsiTokenService(objectMapper, TEST_JITSI_DOMAIN, TEST_JWT_APP_ID, "short-secret-12345", 300);
        });

        // 5. Insecure sample/dummy secret
        Assertions.assertThrows(IllegalStateException.class, () -> {
            new JitsiTokenService(objectMapper, TEST_JITSI_DOMAIN, TEST_JWT_APP_ID, "insa-kms-jitsi-secret-key-32-chars-minimum!", 300);
        });
    }

    @Test
    @DisplayName("JitsiTokenService Claims: generates valid token with exact required Prosody claims")
    @SuppressWarnings("unchecked")
    public void testJitsiTokenServiceClaimStructure() throws Exception {
        UUID sessionId = UUID.randomUUID();
        String token = jitsiTokenService.generateToken(
                "ROOM-ALPHA",
                "admin_ops",
                "Admin Operator",
                "admin@enterprise.internal",
                true,
                sessionId
        );

        Assertions.assertNotNull(token);
        String[] parts = token.split("\\.");
        Assertions.assertEquals(3, parts.length);

        byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
        Map<String, Object> claims = objectMapper.readValue(payloadBytes, Map.class);

        Assertions.assertEquals(TEST_JWT_APP_ID, claims.get("iss"));
        Assertions.assertEquals(TEST_JWT_APP_ID, claims.get("aud"));
        Assertions.assertEquals(TEST_JITSI_DOMAIN, claims.get("sub"));
        Assertions.assertEquals("ROOM-ALPHA", claims.get("room"));
        Assertions.assertEquals(sessionId.toString(), claims.get("session_id"));
        Assertions.assertNotNull(claims.get("exp"));
        Assertions.assertNotNull(claims.get("iat"));
        Assertions.assertNotNull(claims.get("nbf"));

        Map<String, Object> context = (Map<String, Object>) claims.get("context");
        Assertions.assertNotNull(context);
        Map<String, Object> user = (Map<String, Object>) context.get("user");
        Assertions.assertEquals("admin_ops", user.get("id"));
        Assertions.assertEquals("Admin Operator", user.get("name"));
        Assertions.assertEquals("admin@enterprise.internal", user.get("email"));
        Assertions.assertEquals(Boolean.TRUE, user.get("moderator"));
        Assertions.assertEquals("owner", user.get("affiliation"));

        // Signature validates against room
        Assertions.assertTrue(jitsiTokenService.validateToken(token, "ROOM-ALPHA"));
    }

    @Test
    @DisplayName("Jitsi Security: token generated for ROOM-A is rejected when joining ROOM-B")
    public void testRoomEnforcementRejection() {
        String tokenRoomA = jitsiTokenService.generateToken(
                "ROOM-A",
                "user1",
                "User One",
                "user1@test.internal",
                false,
                UUID.randomUUID()
        );

        // Valid for ROOM-A
        Assertions.assertTrue(jitsiTokenService.validateToken(tokenRoomA, "ROOM-A"));

        // REJECTED for ROOM-B
        SecurityException ex = Assertions.assertThrows(SecurityException.class, () -> {
            jitsiTokenService.validateToken(tokenRoomA, "ROOM-B");
        });
        Assertions.assertTrue(ex.getMessage().contains("Invalid room"));
    }

    @Test
    @DisplayName("Jitsi Security: signature tampered or signed with different secret is rejected")
    public void testSignatureTamperingRejection() {
        JitsiTokenService attackerService = new JitsiTokenService(
                objectMapper,
                TEST_JITSI_DOMAIN,
                TEST_JWT_APP_ID,
                "attacker-secret-32-chars-long-different-key-12345!",
                300
        );

        String rogueToken = attackerService.generateToken(
                "ROOM-A",
                "attacker",
                "Attacker",
                "attacker@evil.com",
                true,
                UUID.randomUUID()
        );

        // Legitimate Jitsi server rejects rogue token signature
        SecurityException ex = Assertions.assertThrows(SecurityException.class, () -> {
            jitsiTokenService.validateToken(rogueToken, "ROOM-A");
        });
        Assertions.assertTrue(ex.getMessage().contains("Invalid JWT signature"));
    }

    @Test
    @DisplayName("Jitsi Security: expired token is strictly rejected")
    public void testExpiredTokenRejection() {
        String expiredToken = jitsiTokenService.generateToken(
                "ROOM-EXP",
                "alice",
                "Alice",
                "alice@test.internal",
                false,
                UUID.randomUUID(),
                -60 // 60 seconds in the past
        );

        SecurityException ex = Assertions.assertThrows(SecurityException.class, () -> {
            jitsiTokenService.validateToken(expiredToken, "ROOM-EXP");
        });
        Assertions.assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    @DisplayName("Jitsi Security: wrong issuer or audience is strictly rejected")
    public void testWrongIssuerAudienceRejection() {
        JitsiTokenService wrongIssuerService = new JitsiTokenService(
                objectMapper,
                TEST_JITSI_DOMAIN,
                "rogue-app-id",
                TEST_JWT_SECRET,
                300
        );

        String wrongIssuerToken = wrongIssuerService.generateToken(
                "ROOM-Z",
                "alice",
                "Alice",
                "alice@test.internal",
                false,
                UUID.randomUUID()
        );

        SecurityException ex = Assertions.assertThrows(SecurityException.class, () -> {
            jitsiTokenService.validateToken(wrongIssuerToken, "ROOM-Z");
        });
        Assertions.assertTrue(ex.getMessage().contains("Invalid issuer"));
    }

    @Test
    @DisplayName("Create Video Session with participantUserIds: resolves users by UUID, persists participant, sends notification and audit")
    public void testCreateVideoSession_WithParticipantUserIds() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("Security Incident Review");
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("bob");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("bob")).thenReturn(Optional.of(hostUser));

        UUID participantId = UUID.randomUUID();
        User participantUser = new User();
        participantUser.setId(participantId);
        participantUser.setUsername("alice");
        participantUser.setFullName("Alice Smith");
        participantUser.setIsActive(true);
        when(userRepo.findById(participantId)).thenReturn(Optional.of(participantUser));

        when(sessionRepo.save(any(VideoSession.class))).thenAnswer(inv -> {
            VideoSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Incident War Room");
        req.setParticipantUserIds(List.of(participantId));

        VideoSessionResponse resp = service.createSession(topicId, req, "bob", false);

        Assertions.assertNotNull(resp);
        Assertions.assertEquals(2, resp.getParticipants().size()); // Bob (host) + Alice
        verify(userRepo).findById(participantId);
        verify(notifService).sendNotificationToUser(eq(participantUser), anyString(), anyString(), anyString(), anyString(), any(), anyString());
        verify(auditService).recordAuditLog(eq(hostUser.getId().toString()), any(), eq("VIDEO_SESSION_CREATED"), eq("VIDEO_SESSION"), anyString(), isNull(), anyString());
    }

    @Test
    @DisplayName("Create Video Session with mixed participantUserIds and invitedUsernames: deduplicates by UUID")
    public void testCreateVideoSession_MixedUuidAndUsernames_Deduplication() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("KMS Standup");
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("host_admin");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("host_admin")).thenReturn(Optional.of(hostUser));

        UUID aliceId = UUID.randomUUID();
        User aliceUser = new User();
        aliceUser.setId(aliceId);
        aliceUser.setUsername("alice");
        aliceUser.setIsActive(true);

        when(userRepo.findById(aliceId)).thenReturn(Optional.of(aliceUser));
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(aliceUser));

        when(sessionRepo.save(any(VideoSession.class))).thenAnswer(inv -> {
            VideoSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Standup Sync");
        // Alice specified by both UUID and username
        req.setParticipantUserIds(List.of(aliceId));
        req.setInvitedUsernames(List.of("alice"));

        VideoSessionResponse resp = service.createSession(topicId, req, "host_admin", false);

        Assertions.assertNotNull(resp);
        // Only 2 participants: host + Alice once
        Assertions.assertEquals(2, resp.getParticipants().size());
        verify(notifService, times(1)).sendNotificationToUser(eq(aliceUser), anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Create Video Session: Host cannot be added as a normal participant if selected")
    public void testCreateVideoSession_HostExclusion() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("KMS Topic");
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        UUID hostId = UUID.randomUUID();
        User hostUser = new User();
        hostUser.setId(hostId);
        hostUser.setUsername("host_user");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("host_user")).thenReturn(Optional.of(hostUser));
        when(userRepo.findById(hostId)).thenReturn(Optional.of(hostUser));

        when(sessionRepo.save(any(VideoSession.class))).thenAnswer(inv -> {
            VideoSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Host Exclusion Test");
        // Attempt to pass host's own UUID and username
        req.setParticipantUserIds(List.of(hostId));
        req.setInvitedUsernames(List.of("host_user"));

        VideoSessionResponse resp = service.createSession(topicId, req, "host_user", false);

        Assertions.assertEquals(1, resp.getParticipants().size());
        Assertions.assertEquals("HOST", resp.getParticipants().get(0).getRole());
        verify(notifService, never()).sendNotificationToUser(eq(hostUser), anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Create Video Session: inactive participant is rejected with 400 Bad Request")
    public void testCreateVideoSession_InactiveUserRejection() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("host");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("host")).thenReturn(Optional.of(hostUser));

        UUID inactiveUserId = UUID.randomUUID();
        User inactiveUser = new User();
        inactiveUser.setId(inactiveUserId);
        inactiveUser.setUsername("deactivated_user");
        inactiveUser.setIsActive(false);
        when(userRepo.findById(inactiveUserId)).thenReturn(Optional.of(inactiveUser));

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Test Inactive User");
        req.setParticipantUserIds(List.of(inactiveUserId));

        ResponseStatusException ex = Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.createSession(topicId, req, "host", false);
        });
        Assertions.assertEquals(400, ex.getStatusCode().value());
        Assertions.assertTrue(ex.getReason().contains("inactive"));
    }

    @Test
    @DisplayName("Create Video Session: non-existent participant ID is rejected with 400 Bad Request")
    public void testCreateVideoSession_InvalidUserRejection() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("host");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("host")).thenReturn(Optional.of(hostUser));

        UUID bogusId = UUID.randomUUID();
        when(userRepo.findById(bogusId)).thenReturn(Optional.empty());

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Test Invalid User");
        req.setParticipantUserIds(List.of(bogusId));

        ResponseStatusException ex = Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.createSession(topicId, req, "host", false);
        });
        Assertions.assertEquals(400, ex.getStatusCode().value());
        Assertions.assertTrue(ex.getReason().contains("does not exist"));
    }

    @Test
    @DisplayName("Create Video Session: durationMinutes calculates scheduledEnd if not explicitly set")
    public void testCreateVideoSession_DurationCalculation() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("host");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("host")).thenReturn(Optional.of(hostUser));

        OffsetDateTime start = OffsetDateTime.now();
        ArgumentCaptor<VideoSession> sessionCaptor = ArgumentCaptor.forClass(VideoSession.class);
        when(sessionRepo.save(sessionCaptor.capture())).thenAnswer(inv -> {
            VideoSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Duration Test");
        req.setScheduledStart(start);
        req.setDurationMinutes(45);

        service.createSession(topicId, req, "host", false);

        VideoSession saved = sessionCaptor.getValue();
        Assertions.assertNotNull(saved.getScheduledEnd());
        Assertions.assertEquals(start.plusMinutes(45), saved.getScheduledEnd());
    }

    @Test
    @DisplayName("Create Video Session: explicitly supplied scheduledEnd is preserved even with durationMinutes")
    public void testCreateVideoSession_ExplicitScheduledEndPreserved() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("host");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("host")).thenReturn(Optional.of(hostUser));

        OffsetDateTime start = OffsetDateTime.now();
        OffsetDateTime customEnd = start.plusHours(2);
        ArgumentCaptor<VideoSession> sessionCaptor = ArgumentCaptor.forClass(VideoSession.class);
        when(sessionRepo.save(sessionCaptor.capture())).thenAnswer(inv -> {
            VideoSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Preserve End Test");
        req.setScheduledStart(start);
        req.setScheduledEnd(customEnd);
        req.setDurationMinutes(30);

        service.createSession(topicId, req, "host", false);

        VideoSession saved = sessionCaptor.getValue();
        Assertions.assertEquals(customEnd, saved.getScheduledEnd());
    }

    @Test
    @DisplayName("Create Video Session: zero participants succeeds with only host")
    public void testCreateVideoSession_ZeroParticipants() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        when(topicRepo.findById(topicId)).thenReturn(Optional.of(topic));

        User hostUser = new User();
        hostUser.setId(UUID.randomUUID());
        hostUser.setUsername("solo_host");
        hostUser.setIsActive(true);
        when(userRepo.findByUsername("solo_host")).thenReturn(Optional.of(hostUser));

        when(sessionRepo.save(any(VideoSession.class))).thenAnswer(inv -> {
            VideoSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateVideoSessionRequest req = new CreateVideoSessionRequest();
        req.setTitle("Solo Standup");
        // No participants provided (optional)

        VideoSessionResponse resp = service.createSession(topicId, req, "solo_host", false);

        Assertions.assertNotNull(resp);
        Assertions.assertEquals(1, resp.getParticipants().size());
        Assertions.assertEquals("HOST", resp.getParticipants().get(0).getRole());
        verify(notifService, never()).sendNotificationToUser(any(), anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Available Users: searches by username, full name, or email")
    public void testAvailableUsersSearchByNameAndEmail() {
        VideoSessionRepository sessionRepo = mock(VideoSessionRepository.class);
        VideoSessionParticipantRepository partRepo = mock(VideoSessionParticipantRepository.class);
        DiscussionTopicRepository topicRepo = mock(DiscussionTopicRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        NotificationService notifService = mock(NotificationService.class);
        AuditService auditService = mock(AuditService.class);

        VideoSessionService service = new VideoSessionService(
                sessionRepo, partRepo, topicRepo, userRepo, notifService, auditService, jitsiTokenService
        );

        User u1 = new User();
        u1.setId(UUID.randomUUID());
        u1.setUsername("akebede");
        u1.setFullName("Abebe Kebede");
        u1.setEmail("abebe@enterprise.internal");
        u1.setIsActive(true);

        when(userRepo.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase("Abebe", "Abebe", "Abebe"))
                .thenReturn(List.of(u1));

        List<Map<String, Object>> result = service.getAvailableUsers("Abebe");
        Assertions.assertEquals(1, result.size());
        Assertions.assertEquals("akebede", result.get(0).get("username"));
        Assertions.assertEquals("Abebe Kebede", result.get(0).get("fullName"));
        Assertions.assertEquals("abebe@enterprise.internal", result.get(0).get("email"));
    }
}
