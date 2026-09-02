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
    private UserRepository userRepository;
    private DepartmentRepository departmentRepository;
    private DocumentRepository documentRepository;
    private AuditService auditService;
    private NotificationService notificationService;

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
        userRepository = Mockito.mock(UserRepository.class);
        departmentRepository = Mockito.mock(DepartmentRepository.class);
        documentRepository = Mockito.mock(DocumentRepository.class);
        auditService = Mockito.mock(AuditService.class);
        notificationService = Mockito.mock(NotificationService.class);

        transferService = new KnowledgeTransferService(
                caseRepository,
                planRepository,
                checklistRepository,
                submissionRepository,
                sessionRepository,
                sessionAttendeeRepository,
                userRepository,
                departmentRepository,
                documentRepository,
                auditService,
                notificationService
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
    }

    @Test
    @DisplayName("Create Knowledge Transfer Case - seeds 4 default checklist items, empty plan, notifies parties and audits")
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

        // Verify 4 checklist items were created
        verify(checklistRepository, times(4)).save(any(KnowledgeTransferChecklist.class));
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

        Map<String, Object> clearance = transferService.calculateExitClearance(caseId);
        assertTrue((Boolean) clearance.get("isReadyForClearance"));
        assertEquals("READY_FOR_CLEARANCE", clearance.get("clearanceStatus"));

        Map<String, Object> completeResp = transferService.completeTransfer(caseId, Map.of("notes", "All items cleared."), "admin");
        assertEquals("COMPLETED", completeResp.get("status"));
        assertEquals("CLEARED", completeResp.get("clearanceStatus"));
        verify(auditService, times(1)).recordAuditLog(eq("admin"), isNull(), eq("KT_TRANSFER_COMPLETED"), anyString(), eq(caseId.toString()), isNull(), anyString());
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
