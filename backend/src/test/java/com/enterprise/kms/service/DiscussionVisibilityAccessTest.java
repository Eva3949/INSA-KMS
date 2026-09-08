package com.enterprise.kms.service;

import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DiscussionAttachmentRepository;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DiscussionVisibilityAccessTest {

    @Mock
    private DiscussionTopicRepository topicRepository;

    @Mock
    private DiscussionReplyRepository replyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private DiscussionAttachmentRepository attachmentRepository;

    @Mock
    private DiscussionMediaService mediaService;

    private DiscussionService discussionService;

    private Department itSecDept;
    private Department hrDept;
    private User employeeA; // IT Sec (Creator)
    private User employeeB; // IT Sec
    private User employeeC; // HR
    private User employeeD; // Non-participant

    @BeforeEach
    void setUp() {
        discussionService = new DiscussionService(
                topicRepository,
                replyRepository,
                userRepository,
                departmentRepository,
                notificationService,
                attachmentRepository,
                mediaService
        );

        itSecDept = new Department();
        itSecDept.setId(UUID.randomUUID());
        itSecDept.setName("IT Security");
        itSecDept.setCode("IT_SEC");

        hrDept = new Department();
        hrDept.setId(UUID.randomUUID());
        hrDept.setName("Human Resources");
        hrDept.setCode("HR");

        employeeA = new User();
        employeeA.setId(UUID.randomUUID());
        employeeA.setUsername("empA");
        employeeA.setEmail("empA@insa.gov.et");
        employeeA.setDepartment(itSecDept);

        employeeB = new User();
        employeeB.setId(UUID.randomUUID());
        employeeB.setUsername("empB");
        employeeB.setEmail("empB@insa.gov.et");
        employeeB.setDepartment(itSecDept);

        employeeC = new User();
        employeeC.setId(UUID.randomUUID());
        employeeC.setUsername("empC");
        employeeC.setEmail("empC@insa.gov.et");
        employeeC.setDepartment(hrDept);

        employeeD = new User();
        employeeD.setId(UUID.randomUUID());
        employeeD.setUsername("empD");
        employeeD.setEmail("empD@insa.gov.et");
        employeeD.setDepartment(hrDept);

        lenient().when(userRepository.findByUsername("empA")).thenReturn(Optional.of(employeeA));
        lenient().when(userRepository.findByUsername("empB")).thenReturn(Optional.of(employeeB));
        lenient().when(userRepository.findByUsername("empC")).thenReturn(Optional.of(employeeC));
        lenient().when(userRepository.findByUsername("empD")).thenReturn(Optional.of(employeeD));
    }

    @Test
    @DisplayName("Scenario A - PUBLIC: All authenticated users can view and participate")
    void testPublicDiscussionAccess() {
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setTitle("Public Engineering Guideline");
        topic.setDescription("Everyone is welcome to read and participate");
        topic.setVisibility("PUBLIC");
        topic.setAuthor(employeeA);
        topic.setAuthorUsername("empA");

        when(topicRepository.findById(topic.getId())).thenReturn(Optional.of(topic));

        // Creator can access
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empA", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empA", false));

        // Same department user can access
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empB", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empB", false));

        // Different department user can access
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empC", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empC", false));
    }

    @Test
    @DisplayName("Scenario B - INTERNAL: Only allowed department members and creator have access")
    void testInternalDiscussionAccess() {
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setTitle("IT Security Internal Architecture Review");
        topic.setDescription("Restricted to IT Security");
        topic.setVisibility("INTERNAL");
        topic.setAuthor(employeeA);
        topic.setAuthorUsername("empA");
        topic.setAllowedDepartments(new HashSet<>(Collections.singletonList(itSecDept)));

        when(topicRepository.findById(topic.getId())).thenReturn(Optional.of(topic));

        // Creator (empA) in IT Security -> ALLOWED
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empA", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empA", false));

        // Colleague (empB) in IT Security -> ALLOWED
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empB", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empB", false));

        // Employee C in HR -> FORBIDDEN (403)
        assertFalse(discussionService.isUserAuthorizedForTopic(topic, "empC", false));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                discussionService.getTopicDetail(topic.getId(), "empC", false));
        assertEquals(403, ex.getStatusCode().value());

        // Admin override -> ALLOWED
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empC", true));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empC", true));
    }

    @Test
    @DisplayName("Scenario C - CONFIDENTIAL: Only creator and explicitly selected participants have access")
    void testConfidentialDiscussionAccess() {
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setTitle("Confidential Security Incident Investigation");
        topic.setDescription("Restricted strictly to specified incident responders");
        topic.setVisibility("CONFIDENTIAL");
        topic.setAuthor(employeeA);
        topic.setAuthorUsername("empA");

        // Participants: Employee B and Employee C
        Set<User> participants = new HashSet<>(Arrays.asList(employeeA, employeeB, employeeC));
        topic.setParticipants(participants);

        when(topicRepository.findById(topic.getId())).thenReturn(Optional.of(topic));

        // Creator (empA) -> ALLOWED
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empA", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empA", false));

        // Participant 1 (empB) -> ALLOWED
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empB", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empB", false));

        // Participant 2 (empC) -> ALLOWED
        assertTrue(discussionService.isUserAuthorizedForTopic(topic, "empC", false));
        assertDoesNotThrow(() -> discussionService.getTopicDetail(topic.getId(), "empC", false));

        // Non-participant (empD) -> FORBIDDEN (403)
        assertFalse(discussionService.isUserAuthorizedForTopic(topic, "empD", false));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                discussionService.getTopicDetail(topic.getId(), "empD", false));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("Direct API Security / IDOR: Non-participant cannot add reply to confidential topic")
    void testDirectReplyIDORBlocked() {
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setTitle("Private Board Discussion");
        topic.setVisibility("CONFIDENTIAL");
        topic.setAuthor(employeeA);
        topic.setAuthorUsername("empA");
        topic.setParticipants(new HashSet<>(Collections.singletonList(employeeA)));

        when(topicRepository.findById(topic.getId())).thenReturn(Optional.of(topic));

        Map<String, Object> replyBody = new HashMap<>();
        replyBody.put("content", "Unauthorized malicious comment attempt");

        // Unauthorized user attempts direct POST reply
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                discussionService.addReply(topic.getId(), replyBody, "empD", false));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("Data Integrity: Creation of INTERNAL topic without departments fails with 400")
    void testCreateInternalWithoutDepartmentsFails() {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Invalid Internal Topic");
        body.put("description", "Missing departments");
        body.put("visibility", "INTERNAL");
        body.put("departmentIds", Collections.emptyList());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                discussionService.createTopic(body, "empA"));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("Data Integrity: Creation of CONFIDENTIAL topic without participants fails with 400")
    void testCreateConfidentialWithoutParticipantsFails() {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Invalid Confidential Topic");
        body.put("description", "Missing participants");
        body.put("visibility", "CONFIDENTIAL");
        body.put("participantIds", Collections.emptyList());

        when(userRepository.findByUsername("empA")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                discussionService.createTopic(body, "empA"));
        assertEquals(400, ex.getStatusCode().value());
    }
}
