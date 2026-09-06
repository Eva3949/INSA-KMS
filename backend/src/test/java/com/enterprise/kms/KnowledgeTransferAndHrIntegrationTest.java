package com.enterprise.kms;

import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.HrEmployeeService;
import com.enterprise.kms.service.KnowledgeTransferService;
import com.enterprise.kms.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class KnowledgeTransferAndHrIntegrationTest {

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
    private HrEmployeeService hrService;

    private User employee;
    private User manager;
    private User successor;
    private Department department;

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

        hrService = new HrEmployeeService(
                userRepository,
                departmentRepository,
                caseRepository,
                null,
                auditService,
                notificationService
        );

        department = new Department();
        department.setId(UUID.randomUUID());
        department.setName("Engineering");
        department.setCode("ENG");

        employee = new User();
        employee.setId(UUID.randomUUID());
        employee.setUsername("john.doe");
        employee.setEmail("john.doe@enterprise.internal");
        employee.setFullName("John Doe");
        employee.setJobTitle("Software Engineer");
        employee.setRoleName("ROLE_CONTRIBUTOR");
        employee.setDepartment(department);

        manager = new User();
        manager.setId(UUID.randomUUID());
        manager.setUsername("sarah.mgr");
        manager.setEmail("sarah.mgr@enterprise.internal");
        manager.setFullName("Sarah Manager");
        manager.setRoleName("ROLE_CONTENT_OWNER");

        successor = new User();
        successor.setId(UUID.randomUUID());
        successor.setUsername("alex.succ");
        successor.setEmail("alex.succ@enterprise.internal");
        successor.setFullName("Alex Successor");
        successor.setRoleName("ROLE_CONTRIBUTOR");

        employee.setManager(manager);

        when(userRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(userRepository.findById(successor.getId())).thenReturn(Optional.of(successor));
        when(departmentRepository.findById(department.getId())).thenReturn(Optional.of(department));

        User adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setUsername("admin");
        adminUser.setEmail("admin@enterprise.internal");
        adminUser.setFullName("Admin User");
        adminUser.setRoleName("ROLE_ADMIN");

        User systemUser = new User();
        systemUser.setId(UUID.randomUUID());
        systemUser.setUsername("system");
        systemUser.setEmail("system@enterprise.internal");
        systemUser.setFullName("System User");
        systemUser.setRoleName("ROLE_ADMIN");

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByUsername("system")).thenReturn(Optional.of(systemUser));
        when(userRepository.findByUsername(employee.getUsername())).thenReturn(Optional.of(employee));
        when(userRepository.findByUsername(manager.getUsername())).thenReturn(Optional.of(manager));
        when(userRepository.findByUsername(successor.getUsername())).thenReturn(Optional.of(successor));
    }

    @Test
    @DisplayName("Create Knowledge Transfer Case - seeds 8 comprehensive exit checklist items, captures snapshots, notifies parties and audits")
    void testCreateCase() {
        when(caseRepository.save(any(KnowledgeTransferCase.class))).thenAnswer(invocation -> {
            KnowledgeTransferCase c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        Map<String, Object> payload = Map.of(
                "title", "Handover John Doe to Alex",
                "employeeId", employee.getId().toString(),
                "reasonType", "RESIGNATION",
                "priority", "HIGH",
                "notes", "Complete handover before end of month"
        );

        KnowledgeTransferCase created = transferService.createCase(payload, "admin");

        assertNotNull(created);
        assertNotNull(created.getId());
        assertEquals("Handover John Doe to Alex", created.getTitle());
        assertEquals("INITIATED", created.getStatus());
        assertEquals("PENDING", created.getClearanceStatus());
        assertEquals("RESIGNATION", created.getReasonType());
        assertEquals("HIGH", created.getPriority());
        assertEquals("John Doe", created.getEmployeeSnapshotName());
        assertEquals("Software Engineer", created.getEmployeeSnapshotTitle());
        assertEquals("Engineering", created.getEmployeeSnapshotDept());

        // Verify 8 comprehensive default exit checklist items were created
        verify(checklistRepository, times(8)).save(any(KnowledgeTransferChecklist.class));
        // Verify plan created
        verify(planRepository, times(1)).save(any(KnowledgeTransferPlan.class));
        // Verify notifications sent
        verify(notificationService, atLeastOnce()).sendNotificationToUser(eq(employee), anyString(), anyString(), anyString(), anyString(), any(UUID.class), anyString());
        // Verify audit logged
        verify(auditService, times(1)).recordAuditLog(eq("admin"), isNull(), eq("KT_CASE_CREATED"), eq("KNOWLEDGE_TRANSFER"), anyString(), isNull(), anyString());
    }

    @Test
    @DisplayName("Assign Successor - assigns user, sends notification, logs audit")
    void testAssignSuccessor() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setTitle("Case Test");
        c.setEmployee(employee);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(caseRepository.save(any(KnowledgeTransferCase.class))).thenReturn(c);

        Map<String, Object> resp = transferService.assignSuccessor(caseId, successor.getId(), "admin");

        assertNotNull(resp);
        assertEquals(successor.getId(), c.getSuccessor().getId());
        verify(notificationService, times(1)).sendNotificationToUser(eq(successor), contains("Successor"), anyString(), anyString(), anyString(), any(UUID.class), anyString());
        verify(auditService, times(1)).recordAuditLog(eq("admin"), isNull(), eq("KT_SUCCESSOR_ASSIGNED"), eq("KNOWLEDGE_TRANSFER"), eq(caseId.toString()), isNull(), anyString());
    }

    @Test
    @DisplayName("Knowledge Submission and Review Validation")
    void testKnowledgeSubmissionAndValidation() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setTitle("Case 1");
        c.setEmployee(employee);
        c.setManager(manager);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(userRepository.findByUsername("john.doe")).thenReturn(Optional.of(employee));
        when(userRepository.findByUsername("sarah.mgr")).thenReturn(Optional.of(manager));

        KnowledgeTransferSubmission sub = new KnowledgeTransferSubmission();
        sub.setId(UUID.randomUUID());
        sub.setTransferCase(c);
        sub.setTitle("Payment Service Architecture");
        sub.setContent("Service handles Stripe webhook and ledger syncing.");
        sub.setCategory("SYSTEM_KNOWLEDGE");
        sub.setSubmittedBy(employee);
        sub.setValidationStatus("PENDING_REVIEW");

        when(submissionRepository.save(any(KnowledgeTransferSubmission.class))).thenReturn(sub);
        when(submissionRepository.findById(sub.getId())).thenReturn(Optional.of(sub));

        // 1. Submit Knowledge
        Map<String, Object> subPayload = Map.of(
                "title", "Payment Service Architecture",
                "content", "Service handles Stripe webhook and ledger syncing.",
                "category", "SYSTEM_KNOWLEDGE"
        );
        Map<String, Object> subResp = transferService.submitKnowledge(caseId, subPayload, "john.doe");
        assertEquals("PENDING_REVIEW", subResp.get("validationStatus"));
        verify(auditService, times(1)).recordAuditLog(eq("john.doe"), isNull(), eq("KT_KNOWLEDGE_SUBMITTED"), anyString(), eq(caseId.toString()), isNull(), anyString());

        // 2. Validate / Approve Knowledge
        Map<String, Object> valPayload = Map.of(
                "status", "APPROVED",
                "reviewComments", "Looks comprehensive and accurate."
        );
        Map<String, Object> valResp = transferService.validateKnowledge(sub.getId(), valPayload, "sarah.mgr");
        assertEquals("APPROVED", valResp.get("validationStatus"));
        assertEquals("Looks comprehensive and accurate.", valResp.get("reviewComments"));
        verify(notificationService, times(1)).sendNotificationToUser(eq(employee), contains("APPROVED"), anyString(), anyString(), anyString(), any(UUID.class), anyString());
        verify(auditService, times(1)).recordAuditLog(eq("sarah.mgr"), isNull(), eq("KT_KNOWLEDGE_VALIDATED"), anyString(), eq(caseId.toString()), isNull(), anyString());
    }

    @Test
    @DisplayName("Exit Clearance - blocks completion when required checklist items or submissions are pending")
    void testExitClearanceBlockerLogic() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setTitle("Case Blocked Test");
        c.setEmployee(employee);
        c.setStatus("IN_PROGRESS");
        // No successor yet

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));

        KnowledgeTransferChecklist pendingItem = new KnowledgeTransferChecklist();
        pendingItem.setItemName("System handover");
        pendingItem.setStatus("PENDING");

        when(checklistRepository.findByTransferCaseIdOrderByOrderIndexAscCreatedAtAsc(caseId))
                .thenReturn(List.of(pendingItem));
        when(submissionRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId))
                .thenReturn(Collections.emptyList());
        when(sessionRepository.findByTransferCaseIdOrderByScheduledAtAsc(caseId))
                .thenReturn(Collections.emptyList());
        when(planRepository.findByTransferCaseId(caseId))
                .thenReturn(Optional.empty());

        Map<String, Object> clearance = transferService.calculateExitClearance(caseId);
        assertFalse((Boolean) clearance.get("isReadyForClearance"));
        assertEquals("PENDING", clearance.get("clearanceStatus"));
        @SuppressWarnings("unchecked")
        List<String> blockers = (List<String>) clearance.get("blockers");
        assertTrue(blockers.size() >= 3); // pending checklist, no successor, no submissions

        // Attempting to complete transfer should throw BAD_REQUEST
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                transferService.completeTransfer(caseId, Map.of(), "admin")
        );
        assertTrue(ex.getReason().contains("Cannot complete transfer"));
    }

    @Test
    @DisplayName("Exit Clearance & Transfer Completion - succeeds when all items are validated")
    void testExitClearanceSuccess() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setTitle("Case Ready Test");
        c.setEmployee(employee);
        c.setSuccessor(successor);
        c.setStatus("IN_PROGRESS");

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(caseRepository.save(any(KnowledgeTransferCase.class))).thenReturn(c);

        KnowledgeTransferChecklist item = new KnowledgeTransferChecklist();
        item.setItemName("System handover");
        item.setStatus("COMPLETED");

        KnowledgeTransferSubmission sub = new KnowledgeTransferSubmission();
        sub.setTitle("Architecture Handover");
        sub.setValidationStatus("APPROVED");

        KnowledgeTransferSession ses = new KnowledgeTransferSession();
        ses.setTitle("KT Session 1");
        ses.setStatus("COMPLETED");

        KnowledgeTransferPlan plan = new KnowledgeTransferPlan();
        plan.setResponsibilities("Core backend engineering");

        when(checklistRepository.findByTransferCaseIdOrderByOrderIndexAscCreatedAtAsc(caseId))
                .thenReturn(List.of(item));
        when(submissionRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId))
                .thenReturn(List.of(sub));
        when(sessionRepository.findByTransferCaseIdOrderByScheduledAtAsc(caseId))
                .thenReturn(List.of(ses));
        when(planRepository.findByTransferCaseId(caseId))
                .thenReturn(Optional.of(plan));

        // Gatekeeper prerequisites
        c.setSuccessorAccepted(true);
        c.setManagerApproved(true);
        c.setHrApproved(true);

        when(assetRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId)).thenReturn(Collections.emptyList());
        when(accessReviewRepository.findByTransferCaseIdOrderByCreatedAtAsc(caseId)).thenReturn(Collections.emptyList());

        Map<String, Object> clearance = transferService.calculateExitClearance(caseId);
        assertTrue((Boolean) clearance.get("isReadyForClearance"));
        assertEquals("READY_FOR_CLEARANCE", clearance.get("clearanceStatus"));

        Map<String, Object> completeResp = transferService.completeTransfer(caseId, Map.of("notes", "All items cleared."), "admin");
        assertEquals("COMPLETED", completeResp.get("status"));
        assertEquals("CLEARED", completeResp.get("clearanceStatus"));
        verify(auditService, times(1)).recordAuditLog(eq("admin"), isNull(), eq("KT_TRANSFER_COMPLETED"), anyString(), eq(caseId.toString()), isNull(), anyString());
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Inventory items CRUD across 7 categories")
    void testInventoryItemsCrud() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));

        when(inventoryItemRepository.save(any(KnowledgeTransferInventoryItem.class))).thenAnswer(i -> {
            KnowledgeTransferInventoryItem item = i.getArgument(0);
            if (item.getId() == null) item.setId(UUID.randomUUID());
            return item;
        });

        // 1. Add item
        Map<String, Object> addPayload = Map.of(
                "title", "Production Kubernetes Cluster Deployment SOP",
                "description", "Steps to configure helm charts and roll out updates",
                "category", "BUSINESS_PROCESSES",
                "criticality", "CRITICAL"
        );
        Map<String, Object> added = transferService.addInventoryItem(caseId, addPayload, "admin");
        assertNotNull(added.get("id"));
        assertEquals("BUSINESS_PROCESSES", added.get("category"));
        assertEquals("CRITICAL", added.get("criticality"));

        // 2. Update item
        UUID itemId = (UUID) added.get("id");
        KnowledgeTransferInventoryItem existingItem = new KnowledgeTransferInventoryItem();
        existingItem.setId(itemId);
        existingItem.setTransferCase(c);
        existingItem.setTitle("Old Title");
        existingItem.setDescription("Old Desc");
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(existingItem));

        Map<String, Object> updatePayload = Map.of("title", "Updated Kubernetes SOP", "status", "VERIFIED");
        Map<String, Object> updated = transferService.updateInventoryItem(itemId, updatePayload, "admin");
        assertEquals("Updated Kubernetes SOP", updated.get("title"));
        assertEquals("VERIFIED", updated.get("status"));

        // 3. Delete item
        transferService.deleteInventoryItem(itemId, "admin");
        verify(inventoryItemRepository, times(1)).delete(existingItem);
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Self-approval prevention blocks employee from approving own submission")
    void testSelfApprovalPrevented() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(userRepository.findByUsername("john.doe")).thenReturn(Optional.of(employee));

        KnowledgeTransferSubmission sub = new KnowledgeTransferSubmission();
        sub.setId(UUID.randomUUID());
        sub.setTransferCase(c);
        sub.setTitle("Self Submission");
        sub.setContent("Self content");
        sub.setSubmittedBy(employee);
        sub.setValidationStatus("PENDING_REVIEW");

        when(submissionRepository.findById(sub.getId())).thenReturn(Optional.of(sub));

        // Submitter john.doe attempting to approve their own submission
        Map<String, Object> valPayload = Map.of("status", "APPROVED");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                transferService.validateKnowledge(sub.getId(), valPayload, "john.doe")
        );
        assertEquals(403, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Self-review is prohibited"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - State machine validator blocks direct assignment of terminal statuses via updateCase")
    void testStateMachineDirectStatusBypassPrevented() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setStatus("IN_PROGRESS");
        c.setEmployee(employee);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));

        // Attempting to bypass gatekeeper by setting COMPLETED directly
        Map<String, Object> invalidPayload = Map.of("status", "COMPLETED");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                transferService.updateCase(caseId, invalidPayload, "admin")
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("cannot be set directly via generic case update"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Document handover with author reassignment")
    void testDocumentHandoverIntegration() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);
        c.setSuccessor(successor);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));

        UUID docId = UUID.randomUUID();
        Document doc = new Document();
        doc.setId(docId);
        doc.setTitle("Enterprise Security Blueprint");
        doc.setAuthor(employee);
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        when(transferDocumentRepository.existsByTransferCaseIdAndDocumentId(caseId, docId)).thenReturn(false);
        when(transferDocumentRepository.save(any(KnowledgeTransferDocument.class))).thenAnswer(i -> {
            KnowledgeTransferDocument td = i.getArgument(0);
            td.setId(UUID.randomUUID());
            return td;
        });

        Map<String, Object> attached = transferService.attachDocument(caseId, docId, "REASSIGN_AUTHOR", "Handover to Alex", "admin");
        assertNotNull(attached);
        assertEquals("REASSIGN_AUTHOR", attached.get("transferAction"));
        assertEquals("Enterprise Security Blueprint", ((Map<?, ?>) attached.get("document")).get("title"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Document Discovery strictly returns departing employee documents only")
    void testDocumentDiscovery_StrictlyDepartingEmployeeOnly() {
        when(userRepository.findById(employee.getId())).thenReturn(Optional.of(employee));

        Document doc1 = new Document();
        doc1.setId(UUID.randomUUID());
        doc1.setTitle("Network Security Procedure");
        doc1.setAuthor(employee);
        doc1.setIsDeleted(false);

        Document doc2 = new Document();
        doc2.setId(UUID.randomUUID());
        doc2.setTitle("Incident Response Runbook");
        doc2.setAuthor(employee);
        doc2.setIsDeleted(false);

        // findByAuthorIdAndIsDeletedFalse returns only doc1 and doc2 for employee.getId()
        when(documentRepository.findByAuthorIdAndIsDeletedFalse(employee.getId())).thenReturn(List.of(doc1, doc2));

        List<Map<String, Object>> discovered = transferService.listAuthoredDocumentsByEmployee(employee.getId(), "admin");

        assertNotNull(discovered);
        assertEquals(2, discovered.size());
        assertEquals("Network Security Procedure", discovered.get(0).get("title"));
        assertEquals("Incident Response Runbook", discovered.get(1).get("title"));

        // Verify audit log recorded
        verify(auditService).recordAuditLog(
                eq("admin"), isNull(), eq("KT_EMPLOYEE_DOCUMENTS_DISCOVERED"), eq("DOCUMENT"),
                eq(employee.getId().toString()), isNull(), anyString()
        );
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Inactive departing employee documents remain discoverable")
    void testDocumentDiscovery_InactiveDepartingEmployee() {
        User inactiveEmployee = new User();
        inactiveEmployee.setId(UUID.randomUUID());
        inactiveEmployee.setUsername("inactive.abebe");
        inactiveEmployee.setIsActive(false);

        when(userRepository.findById(inactiveEmployee.getId())).thenReturn(Optional.of(inactiveEmployee));

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setTitle("Historical Architecture Specs");
        doc.setAuthor(inactiveEmployee);
        doc.setIsDeleted(false);

        when(documentRepository.findByAuthorIdAndIsDeletedFalse(inactiveEmployee.getId())).thenReturn(List.of(doc));

        List<Map<String, Object>> discovered = transferService.listAuthoredDocumentsByEmployee(inactiveEmployee.getId(), "admin");

        assertNotNull(discovered);
        assertEquals(1, discovered.size());
        assertEquals("Historical Architecture Specs", discovered.get(0).get("title"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Forged document attachment rejected with HTTP 400")
    void testAttachDocument_ForgedDocumentRejection() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);
        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));

        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        otherUser.setUsername("charlie.other");

        UUID forgedDocId = UUID.randomUUID();
        Document forgedDoc = new Document();
        forgedDoc.setId(forgedDocId);
        forgedDoc.setTitle("Confidential Salary Sheet");
        forgedDoc.setAuthor(otherUser); // NOT the departing employee!
        forgedDoc.setIsDeleted(false);
        when(documentRepository.findById(forgedDocId)).thenReturn(Optional.of(forgedDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                transferService.attachDocument(caseId, forgedDocId, "REFERENCE", null, "admin")
        );
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("not authored by departing employee"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Batch document attachment attaches selected documents and validates authors")
    void testAttachDocumentsBatch_Success() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);
        c.setSuccessor(successor);
        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));

        UUID doc1Id = UUID.randomUUID();
        Document doc1 = new Document();
        doc1.setId(doc1Id);
        doc1.setTitle("Firewall Configuration Guide");
        doc1.setAuthor(employee);
        doc1.setIsDeleted(false);

        UUID doc2Id = UUID.randomUUID();
        Document doc2 = new Document();
        doc2.setId(doc2Id);
        doc2.setTitle("VPN Access Handbook");
        doc2.setAuthor(employee);
        doc2.setIsDeleted(false);

        when(documentRepository.findById(doc1Id)).thenReturn(Optional.of(doc1));
        when(documentRepository.findById(doc2Id)).thenReturn(Optional.of(doc2));

        when(transferDocumentRepository.save(any(KnowledgeTransferDocument.class))).thenAnswer(i -> {
            KnowledgeTransferDocument td = i.getArgument(0);
            if (td.getId() == null) td.setId(UUID.randomUUID());
            return td;
        });

        List<Map<String, Object>> batchPayload = List.of(
                Map.of("documentId", doc1Id, "transferAction", "HANDOVER", "notes", "Handover to successor"),
                Map.of("documentId", doc2Id, "transferAction", "REASSIGN_AUTHOR", "notes", "Reassign ownership")
        );

        List<Map<String, Object>> attached = transferService.attachDocumentsBatch(caseId, batchPayload, "admin");

        assertNotNull(attached);
        assertEquals(2, attached.size());
        assertEquals("HANDOVER", attached.get(0).get("transferAction"));
        assertEquals("REASSIGN_AUTHOR", attached.get(1).get("transferAction"));
        verify(auditService).recordAuditLog(
                eq("admin"), isNull(), eq("KT_DOCUMENTS_BATCH_ATTACHED"), eq("KNOWLEDGE_TRANSFER"),
                eq(caseId.toString()), isNull(), anyString()
        );
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Batch attachment rejects if any forged document is included")
    void testAttachDocumentsBatch_RejectsForgedDocument() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);
        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));

        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());

        UUID forgedDocId = UUID.randomUUID();
        Document forgedDoc = new Document();
        forgedDoc.setId(forgedDocId);
        forgedDoc.setTitle("Internal Audit Report");
        forgedDoc.setAuthor(otherUser);
        forgedDoc.setIsDeleted(false);

        when(documentRepository.findById(forgedDocId)).thenReturn(Optional.of(forgedDoc));

        List<Map<String, Object>> batchPayload = List.of(
                Map.of("documentId", forgedDocId, "transferAction", "REFERENCE")
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                transferService.attachDocumentsBatch(caseId, batchPayload, "admin")
        );
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("not authored by departing employee"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Final completion reassigns only REASSIGN_AUTHOR documents and preserves REFERENCE/HANDOVER")
    void testFinalCompletion_AuthorReassignmentRules() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);
        c.setSuccessor(successor);
        c.setSuccessorAccepted(true);
        c.setManagerApproved(true);
        c.setHrApproved(true);
        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(caseRepository.save(any(KnowledgeTransferCase.class))).thenReturn(c);

        // All clearance checklist items completed
        when(checklistRepository.findByTransferCaseIdOrderByOrderIndexAscCreatedAtAsc(caseId)).thenReturn(Collections.emptyList());
        // At least 1 approved submission
        KnowledgeTransferSubmission sub = new KnowledgeTransferSubmission();
        sub.setValidationStatus("APPROVED");
        when(submissionRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId)).thenReturn(List.of(sub));
        when(sessionRepository.findByTransferCaseIdOrderByScheduledAtAsc(caseId)).thenReturn(Collections.emptyList());
        when(assetRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId)).thenReturn(Collections.emptyList());
        when(accessReviewRepository.findByTransferCaseIdOrderByCreatedAtAsc(caseId)).thenReturn(Collections.emptyList());

        Document docReassign = new Document();
        docReassign.setId(UUID.randomUUID());
        docReassign.setTitle("Core Protocol Doc");
        docReassign.setAuthor(employee);

        Document docReference = new Document();
        docReference.setId(UUID.randomUUID());
        docReference.setTitle("Legacy Reference Doc");
        docReference.setAuthor(employee);

        Document docHandover = new Document();
        docHandover.setId(UUID.randomUUID());
        docHandover.setTitle("Operations Manual");
        docHandover.setAuthor(employee);

        KnowledgeTransferDocument td1 = new KnowledgeTransferDocument();
        td1.setTransferCase(c);
        td1.setDocument(docReassign);
        td1.setTransferAction("REASSIGN_AUTHOR");

        KnowledgeTransferDocument td2 = new KnowledgeTransferDocument();
        td2.setTransferCase(c);
        td2.setDocument(docReference);
        td2.setTransferAction("REFERENCE");

        KnowledgeTransferDocument td3 = new KnowledgeTransferDocument();
        td3.setTransferCase(c);
        td3.setDocument(docHandover);
        td3.setTransferAction("HANDOVER");

        when(transferDocumentRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId)).thenReturn(List.of(td1, td2, td3));

        // Execute completeTransfer
        transferService.completeTransfer(caseId, Map.of("notes", "All clearances signed"), "admin");

        // Verify author reassignment:
        // docReassign -> successor
        assertEquals(successor, docReassign.getAuthor());
        verify(documentRepository, times(1)).save(docReassign);

        // docReference -> STILL employee (unchanged)
        assertEquals(employee, docReference.getAuthor());

        // docHandover -> STILL employee (unchanged)
        assertEquals(employee, docHandover.getAuthor());

        verify(documentRepository, never()).save(docReference);
        verify(documentRepository, never()).save(docHandover);
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Physical equipment tracking and status updates")
    void testAssetHandoverTracking() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(assetRepository.save(any(KnowledgeTransferAsset.class))).thenAnswer(i -> {
            KnowledgeTransferAsset a = i.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            return a;
        });

        // Add Asset
        Map<String, Object> addPayload = Map.of(
                "description", "MacBook Pro M3 Max",
                "assetType", "LAPTOP",
                "assetIdentifier", "INSA-LAP-2024-042"
        );
        Map<String, Object> added = transferService.addAsset(caseId, addPayload, "admin");
        assertNotNull(added.get("id"));
        assertEquals("LAPTOP", added.get("assetType"));
        assertEquals("PENDING", added.get("returnStatus"));

        // Update return status
        UUID assetId = (UUID) added.get("id");
        KnowledgeTransferAsset existing = new KnowledgeTransferAsset();
        existing.setId(assetId);
        existing.setTransferCase(c);
        existing.setAssetIdentifier("INSA-LAP-2024-042");
        existing.setDescription("MacBook Pro M3 Max");
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(existing));

        Map<String, Object> updatePayload = Map.of("returnStatus", "RETURNED_TO_IT", "notes", "Good condition, wiped");
        Map<String, Object> updated = transferService.updateAsset(assetId, updatePayload, "admin");
        assertEquals("RETURNED_TO_IT", updated.get("returnStatus"));
        assertEquals("Good condition, wiped", updated.get("notes"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Access Review and IAM revocation tracking")
    void testAccessReviewAndRevocation() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setEmployee(employee);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(accessReviewRepository.save(any(KnowledgeTransferAccessReview.class))).thenAnswer(i -> {
            KnowledgeTransferAccessReview ar = i.getArgument(0);
            if (ar.getId() == null) ar.setId(UUID.randomUUID());
            return ar;
        });

        Map<String, Object> payload = Map.of(
                "systemOrResource", "AWS Production Console",
                "currentAccessLevel", "AdministratorAccess",
                "revokeRequired", true,
                "successorAccessRequired", "ReadOnlyAccess"
        );
        Map<String, Object> added = transferService.addAccessReview(caseId, payload, "admin");
        assertNotNull(added.get("id"));
        assertEquals("AWS Production Console", added.get("systemOrResource"));
        assertTrue((Boolean) added.get("revokeRequired"));
        assertEquals("PENDING", added.get("revocationStatus"));
    }

    @Test
    @DisplayName("Exit & Asset Transfer - Successor acceptance and Manager/HR review workflows")
    void testSuccessorAcceptanceAndManagerHrReview() {
        UUID caseId = UUID.randomUUID();
        KnowledgeTransferCase c = new KnowledgeTransferCase();
        c.setId(caseId);
        c.setTitle("Exit Case");
        c.setEmployee(employee);
        c.setManager(manager);
        c.setSuccessor(successor);

        when(caseRepository.findByIdAndIsDeletedFalse(caseId)).thenReturn(Optional.of(c));
        when(caseRepository.save(any(KnowledgeTransferCase.class))).thenReturn(c);
        when(userRepository.findByUsername("alex.succ")).thenReturn(Optional.of(successor));
        when(userRepository.findByUsername("sarah.mgr")).thenReturn(Optional.of(manager));

        // 1. Successor acceptance
        Map<String, Object> succResp = transferService.successorAcceptance(caseId, true, "All operational procedures verified", "alex.succ");
        assertTrue(c.getSuccessorAccepted());
        assertEquals("SUCCESSOR_ACCEPTED", c.getStatus());

        // 2. Manager review
        Map<String, Object> mgrResp = transferService.managerReview(caseId, true, "Manager signs off on handover", "sarah.mgr");
        assertTrue(c.getManagerApproved());
        assertEquals("APPROVED", c.getStatus());

        // 3. HR review
        Map<String, Object> hrResp = transferService.hrReview(caseId, true, "HR clearance granted", "admin");
        assertTrue(c.getHrApproved());
    }

    @Test
    @DisplayName("HR Module - Update Employee Profile preserves RBAC role and updates department/status")
    void testHrUpdateEmployee() {
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        Department newDept = new Department();
        newDept.setId(UUID.randomUUID());
        newDept.setName("Security Operations");
        when(departmentRepository.findById(newDept.getId())).thenReturn(Optional.of(newDept));

        Map<String, Object> payload = Map.of(
                "jobTitle", "Principal Security Engineer",
                "employmentStatus", "ACTIVE",
                "phone", "+251911223344",
                "departmentId", newDept.getId().toString()
        );

        Map<String, Object> resp = hrService.updateEmployeeHrInfo(employee.getId(), payload, "hr_admin");

        assertNotNull(resp);
        assertEquals("Principal Security Engineer", resp.get("jobTitle"));
        assertEquals("ACTIVE", resp.get("employmentStatus"));
        assertEquals("+251911223344", resp.get("phone"));
        assertEquals("ROLE_CONTRIBUTOR", resp.get("roleName")); // RBAC role remains untouched!
        verify(auditService, times(1)).recordAuditLog(eq("hr_admin"), isNull(), eq("HR_EMPLOYEE_UPDATED"), eq("USER"), eq(employee.getId().toString()), isNull(), anyString());
    }

    @Test
    @DisplayName("HR Module - Filter Employees by Department and Status")
    void testHrListEmployees() {
        Page<User> page = new PageImpl<>(List.of(employee), PageRequest.of(0, 10), 1);
        when(userRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(PageRequest.class)))
                .thenReturn(page);

        Page<Map<String, Object>> result = hrService.listEmployees("john", department.getId(), "ACTIVE", null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("john.doe", result.getContent().get(0).get("username"));
    }
}
