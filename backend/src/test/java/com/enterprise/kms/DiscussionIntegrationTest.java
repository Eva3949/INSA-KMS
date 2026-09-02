package com.enterprise.kms;

import com.enterprise.kms.controller.DiscussionController;
import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.DiscussionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DiscussionIntegrationTest {

    private DiscussionTopicRepository topicRepository;
    private DiscussionReplyRepository replyRepository;
    private UserRepository userRepository;
    private AuditService auditService;
    private DiscussionService discussionService;
    private DiscussionController discussionController;

    @BeforeEach
    void setUp() {
        topicRepository = Mockito.mock(DiscussionTopicRepository.class);
        replyRepository = Mockito.mock(DiscussionReplyRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        auditService = Mockito.mock(AuditService.class);

        discussionService = new DiscussionService(topicRepository, replyRepository, userRepository, auditService);
        discussionController = new DiscussionController(discussionService);
    }

    @Test
    @DisplayName("Discussion Subsystem - Create Topic, Add Reply, Open/Close & Moderation")
    void testDiscussionLifecycle() {
        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("Best Practices for Document Versioning");
        topic.setDescription("How should teams handle major vs minor versions?");
        topic.setCategory("Best Practices");
        topic.setStatus("OPEN");
        topic.setAuthorName("contributor.user");

        when(topicRepository.save(any(DiscussionTopic.class))).thenAnswer(invocation -> {
            DiscussionTopic saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(topicId);
            return saved;
        });
        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));

        Jwt jwt = Mockito.mock(Jwt.class);
        when(jwt.getClaimAsString("preferred_username")).thenReturn("contributor.user");
        when(jwt.getClaim("realm_access")).thenReturn(Map.of("roles", List.of("ROLE_CONTRIBUTOR")));

        // 1. Create Topic
        ResponseEntity<DiscussionTopic> createRes = discussionController.createTopic(Map.of(
                "title", "Best Practices for Document Versioning",
                "description", "How should teams handle major vs minor versions?",
                "category", "Best Practices"
        ), jwt);
        assertEquals(HttpStatus.OK, createRes.getStatusCode());
        assertEquals("Best Practices for Document Versioning", createRes.getBody().getTitle());

        // 2. Add Reply
        UUID replyId = UUID.randomUUID();
        when(replyRepository.save(any(DiscussionReply.class))).thenAnswer(invocation -> {
            DiscussionReply r = invocation.getArgument(0);
            r.setId(replyId);
            return r;
        });
        when(replyRepository.countByTopicId(topicId)).thenReturn(1);

        ResponseEntity<DiscussionReply> replyRes = discussionController.createReply(topicId, Map.of(
                "content", "Major versions should be used for formal sign-offs."
        ), jwt);
        assertEquals(HttpStatus.OK, replyRes.getStatusCode());
        assertNotNull(replyRes.getBody());
        assertEquals("Major versions should be used for formal sign-offs.", replyRes.getBody().getContent());

        // 3. Close Topic
        ResponseEntity<DiscussionTopic> closeRes = discussionController.updateTopicStatus(topicId, Map.of("status", "CLOSED"), jwt);
        assertEquals(HttpStatus.OK, closeRes.getStatusCode());
        assertEquals("CLOSED", closeRes.getBody().getStatus());

        // 4. Reject Reply to Closed Topic for non-admin
        assertThrows(IllegalStateException.class, () -> {
            discussionController.createReply(topicId, Map.of("content", "Late response"), jwt);
        });
    }
}
