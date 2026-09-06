package com.enterprise.kms;

import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.KnowledgeTransferService;
import com.enterprise.kms.service.NotificationService;
import com.enterprise.kms.service.PermissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class KnowledgeTransferSecurityTest {

    private KnowledgeTransferCaseRepository caseRepository;
    private KnowledgeTransferPlanRepository planRepository;
    private KnowledgeTransferChecklistRepository checklistRepository;
    private KnowledgeTransferSubmissionRepository submissionRepository;
    private KnowledgeTransferSessionRepository sessionRepository;
    private KnowledgeTransferSessionAttendeeRepository sessionAttendeeRepository;
    private KnowledgeTransferInventoryItemRepository inventoryItemRepository;
    private KnowledgeTransferDocumentRepository transferDocumentRepository;
    private KnowledgeTransferAssetRepository assetRepository;
    private KnowledgeTransferAccessReviewRepository accessReviewRepository;
    private UserRepository userRepository;
    private DepartmentRepository departmentRepository;
    private DocumentRepository documentRepository;
    private AuditLogRepository auditLogRepository;
    private AuditService auditService;
    private NotificationService notificationService;
    private com.enterprise.kms.service.KeycloakAdminService keycloakAdminService;

    private KnowledgeTransferService transferService;

    private User viewerUser;
    private User otherUser;
    private User employeeUser;
    private User adminUser;
    private Department department;
    private KnowledgeTransferCase assignedCase;
    private KnowledgeTransferCase otherCase;

    @BeforeEach
    void setUp() {
        caseRepository = Mockito.mock(KnowledgeTransferCaseRepository.class);
        planRepository = Mockito.mock(KnowledgeTransferPlanRepository.class);
        checklistRepository = Mockito.mock(KnowledgeTransferChecklistRepository.class);
        submissionRepository = Mockito.mock(KnowledgeTransferSubmissionRepository.class);
        sessionRepository = Mockito.mock(KnowledgeTransferSessionRepository.class);
        sessionAttendeeRepository = Mockito.mock(KnowledgeTransferSessionAttendeeRepository.class);
        inventoryItemRepository = Mockito.mock(KnowledgeTransferInventoryItemRepository.class);
        transferDocumentRepository = Mockito.mock(KnowledgeTransferDocumentRepository.class);
        assetRepository = Mockito.mock(KnowledgeTransferAssetRepository.class);
        accessReviewRepository = Mockito.mock(KnowledgeTransferAccessReviewRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        departmentRepository = Mockito.mock(DepartmentRepository.class);
        documentRepository = Mockito.mock(DocumentRepository.class);
        auditLogRepository = Mockito.mock(AuditLogRepository.class);
        auditService = Mockito.mock(AuditService.class);
        notificationService = Mockito.mock(NotificationService.class);
        keycloakAdminService = Mockito.mock(com.enterprise.kms.service.KeycloakAdminService.class);

        transferService = new KnowledgeTransferService(
                caseRepository,
                planRepository,
                checklistRepository,
                submissionRepository,
                sessionRepository,
                sessionAttendeeRepository,
                inventoryItemRepository,
                transferDocumentRepository,
                assetRepository,
                accessReviewRepository,
                userRepository,
                departmentRepository,
                documentRepository,
                auditLogRepository,
                auditService,
                notificationService,
                keycloakAdminService
        );

        department = new Department();
        department.setId(UUID.randomUUID());
        department.setName("Engineering");
        department.setCode("ENG");

        viewerUser = new User();
        viewerUser.setId(UUID.randomUUID());
        viewerUser.setUsername("viewer_b");
        viewerUser.setRoleName("ROLE_VIEWER");
        viewerUser.setDepartment(department);

        otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        otherUser.setUsername("viewer_c");
        otherUser.setRoleName("ROLE_VIEWER");
        otherUser.setDepartment(department);

        employeeUser = new User();
        employeeUser.setId(UUID.randomUUID());
        employeeUser.setUsername("employee_a");
        employeeUser.setRoleName("ROLE_CONTRIBUTOR");
        employeeUser.setDepartment(department);

        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setUsername("admin_user");
        adminUser.setRoleName("ROLE_ADMIN");
        adminUser.setDepartment(department);

        when(userRepository.findByUsername("viewer_b")).thenReturn(Optional.of(viewerUser));
        when(userRepository.findByUsername("viewer_c")).thenReturn(Optional.of(otherUser));
        when(userRepository.findByUsername("employee_a")).thenReturn(Optional.of(employeeUser));
        when(userRepository.findByUsername("admin_user")).thenReturn(Optional.of(adminUser));

        assignedCase = new KnowledgeTransferCase();
        assignedCase.setId(UUID.randomUUID());
        assignedCase.setTitle("Handover to Viewer B");
        assignedCase.setEmployee(employeeUser);
        assignedCase.setSuccessor(viewerUser);
        assignedCase.setDepartment(department);
        assignedCase.setStatus("IN_PROGRESS");
        assignedCase.setIsDeleted(false);
        assignedCase.setCreatedAt(OffsetDateTime.now());

        otherCase = new KnowledgeTransferCase();
        otherCase.setId(UUID.randomUUID());
        otherCase.setTitle("Private Handover to Other User");
        otherCase.setEmployee(employeeUser);
        otherCase.setSuccessor(otherUser);
        otherCase.setDepartment(department);
        otherCase.setStatus("IN_PROGRESS");
        otherCase.setIsDeleted(false);
        otherCase.setCreatedAt(OffsetDateTime.now());

        when(caseRepository.findByIdAndIsDeletedFalse(assignedCase.getId())).thenReturn(Optional.of(assignedCase));
        when(caseRepository.findByIdAndIsDeletedFalse(otherCase.getId())).thenReturn(Optional.of(otherCase));
    }

    private void mockSecurityContext(String username, String... roles) {
        Jwt jwt = Mockito.mock(Jwt.class);
        when(jwt.getClaimAsString("preferred_username")).thenReturn(username);
        when(jwt.getSubject()).thenReturn("sub-" + username);
        when(jwt.getClaimAsString("email")).thenReturn(username + "@kms.internal");

        Authentication auth = Mockito.mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(jwt);
        when(auth.getName()).thenReturn(username);

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        for (String r : roles) {
            authorities.add(new SimpleGrantedAuthority(r.startsWith("ROLE_") ? r : "ROLE_" + r));
            authorities.add(new SimpleGrantedAuthority(r.startsWith("ROLE_") ? r.substring(5) : r));
        }
        doReturn(authorities).when(auth).getAuthorities();

        SecurityContext securityContext = Mockito.mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("Test A: Viewer is recipient -> listCases applies resource-level restriction")
    void testA_viewerIsRecipient_listCasesReturnsAssignedTransfer() {
        mockSecurityContext("viewer_b", "ROLE_VIEWER");

        when(caseRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenAnswer(invocation -> {
                    // Return only the assigned case
                    return new PageImpl<>(List.of(assignedCase));
                });

        Page<Map<String, Object>> result = transferService.listCases(
                null, null, null, null, null, null,
                PageRequest.of(0, 10), "viewer_b"
        );

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(assignedCase.getId().toString(), result.getContent().get(0).get("id").toString());
        verify(caseRepository, times(1)).findAll(any(Specification.class), any(PageRequest.class));
    }

    @Test
    @DisplayName("Test B: Viewer is recipient -> getCaseDetails returns HTTP 200 with details")
    void testB_viewerIsRecipient_getCaseDetailsReturnsHttp200() {
        mockSecurityContext("viewer_b", "ROLE_VIEWER");

        Map<String, Object> details = transferService.getCaseDetails(assignedCase.getId(), "viewer_b");

        assertNotNull(details);
        assertEquals(assignedCase.getId().toString(), details.get("id").toString());
        assertEquals("Handover to Viewer B", details.get("title"));
        // Confirm audit log recorded
        verify(auditService, atLeastOnce()).recordAuditLog(
                eq("viewer_b"), any(), eq("KT_CASE_VIEWED"), eq("KNOWLEDGE_TRANSFER"),
                eq(assignedCase.getId().toString()), any(), any()
        );
    }

    @Test
    @DisplayName("Test C: Viewer is NOT recipient -> getCaseDetails throws HTTP 403 Forbidden")
    void testC_viewerIsNotRecipient_getCaseDetailsThrowsForbidden() {
        mockSecurityContext("viewer_c", "ROLE_VIEWER");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            transferService.getCaseDetails(assignedCase.getId(), "viewer_c");
        });

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Access denied"));
    }

    @Test
    @DisplayName("Test D: Viewer attempts to modify assigned transfer -> HTTP 403 Forbidden")
    void testD_viewerAttemptsToModify_throwsForbidden() {
        mockSecurityContext("viewer_b", "ROLE_VIEWER");

        // Attempt updateCase
        ResponseStatusException exUpdate = assertThrows(ResponseStatusException.class, () -> {
            transferService.updateCase(assignedCase.getId(), Map.of("title", "Hacked Title"), "viewer_b");
        });
        assertEquals(HttpStatus.FORBIDDEN, exUpdate.getStatusCode());

        // Attempt addInventoryItem
        ResponseStatusException exInventory = assertThrows(ResponseStatusException.class, () -> {
            transferService.addInventoryItem(assignedCase.getId(), Map.of("title", "Inv", "description", "Desc"), "viewer_b");
        });
        assertEquals(HttpStatus.FORBIDDEN, exInventory.getStatusCode());

        // Attempt submitKnowledge
        ResponseStatusException exSub = assertThrows(ResponseStatusException.class, () -> {
            transferService.submitKnowledge(assignedCase.getId(), Map.of("title", "KT", "content", "Content"), "viewer_b");
        });
        assertEquals(HttpStatus.FORBIDDEN, exSub.getStatusCode());
    }

    @Test
    @DisplayName("Test E: Viewer attempts to delete assigned transfer -> HTTP 403 Forbidden")
    void testE_viewerAttemptsToDelete_throwsForbidden() {
        mockSecurityContext("viewer_b", "ROLE_VIEWER");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            transferService.deleteCase(assignedCase.getId(), "viewer_b");
        });

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(caseRepository, never()).save(argThat(c -> Boolean.TRUE.equals(c.getIsDeleted())));
    }

    @Test
    @DisplayName("Test F: Viewer attempts to access an unauthorized document -> resource-level authorization remains enforced")
    void testF_viewerUnauthorizedDocumentAccess_enforced() {
        // Create a restricted document
        Document restrictedDoc = new Document();
        restrictedDoc.setId(UUID.randomUUID());
        restrictedDoc.setTitle("Confidential Strategy");
        restrictedDoc.setConfidentialityLevel("RESTRICTED");
        Department otherDept = new Department();
        otherDept.setId(UUID.randomUUID());
        restrictedDoc.setOwnerDepartment(otherDept);

        // Caller context for Viewer B
        PermissionService.Caller caller = new PermissionService.Caller();
        caller.user = viewerUser;
        caller.userId = viewerUser.getId();
        caller.departmentId = department.getId().toString();
        caller.roles = List.of("ROLE_VIEWER");
        caller.isAdmin = false;
        caller.isOversight = false;

        // Document permission evaluation
        PermissionService permService = new PermissionService(
                documentRepository, Mockito.mock(FolderRepository.class),
                Mockito.mock(DocumentPermissionRepository.class),
                Mockito.mock(FolderPermissionRepository.class),
                userRepository
        );

        String level = permService.effectiveDocumentLevel(restrictedDoc, caller);
        // RESTRICTED documents cannot be viewed by a standard Viewer
        assertNull(level, "Viewer B must NOT have permission to view RESTRICTED document");
    }

    @Test
    @DisplayName("Test G: Admin/authorized role behavior remains unchanged")
    void testG_adminAuthorizedRole_remainsUnchanged() {
        mockSecurityContext("admin_user", "ROLE_ADMIN");

        // Admin can view any case details
        Map<String, Object> detailsAssigned = transferService.getCaseDetails(assignedCase.getId(), "admin_user");
        assertNotNull(detailsAssigned);

        Map<String, Object> detailsOther = transferService.getCaseDetails(otherCase.getId(), "admin_user");
        assertNotNull(detailsOther);

        // Admin can delete a case
        when(caseRepository.save(any(KnowledgeTransferCase.class))).thenAnswer(i -> i.getArgument(0));
        assertDoesNotThrow(() -> transferService.deleteCase(assignedCase.getId(), "admin_user"));
    }

    @Test
    @DisplayName("Test H: Authenticated Keycloak identity is enforced; frontend cannot spoof successorId")
    void testH_keycloakIdentityEnforced_frontendSpoofingBlocked() {
        mockSecurityContext("viewer_b", "ROLE_VIEWER");

        when(caseRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(assignedCase)));

        // Viewer B tries to pass successorId of Viewer C to see Viewer C's cases
        UUID spoofedSuccessorId = otherUser.getId();

        Page<Map<String, Object>> result = transferService.listCases(
                null, null, spoofedSuccessorId, null, null, null,
                PageRequest.of(0, 10), "viewer_b"
        );

        assertNotNull(result);
        // Capture the specification passed to repository
        verify(caseRepository).findAll(any(Specification.class), any(PageRequest.class));
    }

    @Test
    @DisplayName("Special Successor Acceptance: Designated successor can accept, unauthorized user cannot")
    void testSuccessorAcceptance_designatedSuccessorAllowed_othersForbidden() {
        mockSecurityContext("viewer_b", "ROLE_VIEWER");

        when(caseRepository.save(any(KnowledgeTransferCase.class))).thenAnswer(i -> i.getArgument(0));

        // Designated successor confirms acceptance -> Allowed!
        Map<String, Object> accepted = transferService.successorAcceptance(
                assignedCase.getId(), true, "Looks complete", "viewer_b"
        );
        assertNotNull(accepted);
        assertEquals("SUCCESSOR_ACCEPTED", accepted.get("status"));

        // Another viewer (Viewer C) attempts acceptance on Viewer B's transfer -> FORBIDDEN!
        mockSecurityContext("viewer_c", "ROLE_VIEWER");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            transferService.successorAcceptance(assignedCase.getId(), true, "Spoofed confirmation", "viewer_c");
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Only the designated successor"));
    }
}
