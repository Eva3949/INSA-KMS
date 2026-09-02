package com.enterprise.kms.service;

import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class KnowledgeTransferService {

    private final KnowledgeTransferCaseRepository caseRepository;
    private final KnowledgeTransferPlanRepository planRepository;
    private final KnowledgeTransferChecklistRepository checklistRepository;
    private final KnowledgeTransferSubmissionRepository submissionRepository;
    private final KnowledgeTransferSessionRepository sessionRepository;
    private final KnowledgeTransferSessionAttendeeRepository sessionAttendeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final DocumentRepository documentRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public KnowledgeTransferService(
            KnowledgeTransferCaseRepository caseRepository,
            KnowledgeTransferPlanRepository planRepository,
            KnowledgeTransferChecklistRepository checklistRepository,
            KnowledgeTransferSubmissionRepository submissionRepository,
            KnowledgeTransferSessionRepository sessionRepository,
            KnowledgeTransferSessionAttendeeRepository sessionAttendeeRepository,
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            DocumentRepository documentRepository,
            AuditService auditService,
            NotificationService notificationService) {
        this.caseRepository = caseRepository;
        this.planRepository = planRepository;
        this.checklistRepository = checklistRepository;
        this.submissionRepository = submissionRepository;
        this.sessionRepository = sessionRepository;
        this.sessionAttendeeRepository = sessionAttendeeRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.documentRepository = documentRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    // ----------------- CASE MANAGEMENT -----------------

    @Transactional
    public KnowledgeTransferCase createCase(Map<String, Object> payload, String creatorUsername) {
        String title = (String) payload.get("title");
        String employeeIdStr = (String) payload.get("employeeId");
        String reasonType = (String) payload.getOrDefault("reasonType", "RESIGNATION");
        String priority = (String) payload.getOrDefault("priority", "MEDIUM");
        String notes = (String) payload.getOrDefault("notes", "");
        String startDateStr = (String) payload.get("startDate");
        String expectedCompletionDateStr = (String) payload.get("expectedCompletionDate");
        String managerIdStr = (String) payload.get("managerId");
        String hrRepIdStr = (String) payload.get("hrRepId");
        String successorIdStr = (String) payload.get("successorId");
        String departmentIdStr = (String) payload.get("departmentId");

        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        if (employeeIdStr == null || employeeIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee ID is required");
        }

        User employee = userRepository.findById(UUID.fromString(employeeIdStr.trim()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));

        User manager = null;
        if (managerIdStr != null && !managerIdStr.isBlank()) {
            manager = userRepository.findById(UUID.fromString(managerIdStr.trim())).orElse(null);
        } else if (employee.getManager() != null) {
            manager = employee.getManager();
        }

        User hrRep = null;
        if (hrRepIdStr != null && !hrRepIdStr.isBlank()) {
            hrRep = userRepository.findById(UUID.fromString(hrRepIdStr.trim())).orElse(null);
        }

        User successor = null;
        if (successorIdStr != null && !successorIdStr.isBlank()) {
            successor = userRepository.findById(UUID.fromString(successorIdStr.trim())).orElse(null);
        }

        Department department = null;
        if (departmentIdStr != null && !departmentIdStr.isBlank()) {
            department = departmentRepository.findById(UUID.fromString(departmentIdStr.trim())).orElse(null);
        } else if (employee.getDepartment() != null) {
            department = employee.getDepartment();
        }

        KnowledgeTransferCase ktCase = new KnowledgeTransferCase();
        ktCase.setTitle(title.trim());
        ktCase.setEmployee(employee);
        ktCase.setManager(manager);
        ktCase.setHrRep(hrRep);
        ktCase.setSuccessor(successor);
        ktCase.setDepartment(department);
        ktCase.setReasonType(reasonType.toUpperCase());
        ktCase.setPriority(priority.toUpperCase());
        ktCase.setNotes(notes);
        ktCase.setStatus("INITIATED");
        ktCase.setClearanceStatus("PENDING");

        if (startDateStr != null && !startDateStr.isBlank()) {
            try { ktCase.setStartDate(LocalDate.parse(startDateStr.trim())); } catch (Exception ignored) {}
        }
        if (expectedCompletionDateStr != null && !expectedCompletionDateStr.isBlank()) {
            try { ktCase.setExpectedCompletionDate(LocalDate.parse(expectedCompletionDateStr.trim())); } catch (Exception ignored) {}
        }

        KnowledgeTransferCase savedCase = caseRepository.save(ktCase);

        // Seed default 4 checklist items
        seedDefaultChecklist(savedCase);

        // Seed empty plan
        KnowledgeTransferPlan plan = new KnowledgeTransferPlan();
        plan.setTransferCase(savedCase);
        planRepository.save(plan);

        // Notifications
        String notifMsg = "Knowledge Transfer case '" + savedCase.getTitle() + "' has been initiated.";
        String actionUrl = "/knowledge-transfer/" + savedCase.getId();
        notificationService.sendNotificationToUser(employee, "Knowledge Transfer Case Initiated", notifMsg,
                NotificationEventType.KT_CASE_CREATED, "KNOWLEDGE_TRANSFER", savedCase.getId(), actionUrl);
        if (manager != null) {
            notificationService.sendNotificationToUser(manager, "Knowledge Transfer Assigned", notifMsg,
                    NotificationEventType.KT_CASE_CREATED, "KNOWLEDGE_TRANSFER", savedCase.getId(), actionUrl);
        }
        if (hrRep != null) {
            notificationService.sendNotificationToUser(hrRep, "Knowledge Transfer Assigned", notifMsg,
                    NotificationEventType.KT_CASE_CREATED, "KNOWLEDGE_TRANSFER", savedCase.getId(), actionUrl);
        } else {
            notificationService.sendNotificationToRole("ROLE_ADMIN", "New Knowledge Transfer Case", notifMsg,
                    NotificationEventType.KT_CASE_CREATED, "KNOWLEDGE_TRANSFER", savedCase.getId(), actionUrl);
        }

        // Audit log
        auditService.recordAuditLog(
                creatorUsername, null, "KT_CASE_CREATED", "KNOWLEDGE_TRANSFER",
                savedCase.getId().toString(), null, "Created transfer case for " + employee.getUsername()
        );

        return savedCase;
    }

    private void seedDefaultChecklist(KnowledgeTransferCase ktCase) {
        List<String[]> defaultItems = List.of(
                new String[]{"Process documentation", "DOCUMENTS", "1"},
                new String[]{"System handover", "SYSTEMS", "2"},
                new String[]{"Training session", "TRAINING", "3"},
                new String[]{"Document approval", "APPROVALS", "4"}
        );

        for (String[] item : defaultItems) {
            KnowledgeTransferChecklist cl = new KnowledgeTransferChecklist();
            cl.setTransferCase(ktCase);
            cl.setItemName(item[0]);
            cl.setCategory(item[1]);
            cl.setOrderIndex(Integer.parseInt(item[2]));
            cl.setStatus("PENDING");
            checklistRepository.save(cl);
        }
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listCases(
            UUID employeeId, UUID managerId, UUID successorId, UUID deptId,
            String status, String search, Pageable pageable) {
        String effectiveStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) ? status.trim().toUpperCase() : null;
        String effectiveSearch = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;

        org.springframework.data.jpa.domain.Specification<KnowledgeTransferCase> spec = (root, q, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("isDeleted")));
            if (employeeId != null) {
                predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
            }
            if (managerId != null) {
                predicates.add(cb.equal(root.get("manager").get("id"), managerId));
            }
            if (successorId != null) {
                predicates.add(cb.equal(root.get("successor").get("id"), successorId));
            }
            if (deptId != null) {
                predicates.add(cb.equal(root.get("department").get("id"), deptId));
            }
            if (effectiveStatus != null) {
                predicates.add(cb.equal(root.get("status"), effectiveStatus));
            }
            if (effectiveSearch != null) {
                String pattern = "%" + effectiveSearch + "%";
                jakarta.persistence.criteria.Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                jakarta.persistence.criteria.Predicate usernameMatch = cb.like(cb.lower(root.get("employee").get("username")), pattern);
                jakarta.persistence.criteria.Predicate fullNameMatch = cb.and(
                        cb.isNotNull(root.get("employee").get("fullName")),
                        cb.like(cb.lower(root.get("employee").get("fullName")), pattern)
                );
                predicates.add(cb.or(titleMatch, usernameMatch, fullNameMatch));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        return caseRepository.findAll(spec, pageable).map(this::caseToResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCaseDetails(UUID caseId) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        Map<String, Object> res = caseToResponse(ktCase);
        res.put("plan", getPlan(caseId));
        res.put("checklist", getChecklist(caseId));
        res.put("submissions", listSubmissions(caseId));
        res.put("sessions", listSessions(caseId));
        res.put("clearance", calculateExitClearance(caseId));
        return res;
    }

    @Transactional
    public Map<String, Object> updateCase(UUID caseId, Map<String, Object> payload, String username) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        if (payload.containsKey("title") && payload.get("title") != null) {
            ktCase.setTitle(((String) payload.get("title")).trim());
        }
        if (payload.containsKey("status") && payload.get("status") != null) {
            ktCase.setStatus(((String) payload.get("status")).trim().toUpperCase());
        }
        if (payload.containsKey("priority") && payload.get("priority") != null) {
            ktCase.setPriority(((String) payload.get("priority")).trim().toUpperCase());
        }
        if (payload.containsKey("reasonType") && payload.get("reasonType") != null) {
            ktCase.setReasonType(((String) payload.get("reasonType")).trim().toUpperCase());
        }
        if (payload.containsKey("notes")) {
            ktCase.setNotes((String) payload.get("notes"));
        }
        if (payload.containsKey("startDate") && payload.get("startDate") != null) {
            try { ktCase.setStartDate(LocalDate.parse(((String) payload.get("startDate")).trim())); } catch (Exception ignored) {}
        }
        if (payload.containsKey("expectedCompletionDate") && payload.get("expectedCompletionDate") != null) {
            try { ktCase.setExpectedCompletionDate(LocalDate.parse(((String) payload.get("expectedCompletionDate")).trim())); } catch (Exception ignored) {}
        }
        if (payload.containsKey("managerId")) {
            String mId = (String) payload.get("managerId");
            ktCase.setManager(mId != null && !mId.isBlank() ? userRepository.findById(UUID.fromString(mId.trim())).orElse(null) : null);
        }
        if (payload.containsKey("hrRepId")) {
            String hrId = (String) payload.get("hrRepId");
            ktCase.setHrRep(hrId != null && !hrId.isBlank() ? userRepository.findById(UUID.fromString(hrId.trim())).orElse(null) : null);
        }
        if (payload.containsKey("successorId")) {
            String sId = (String) payload.get("successorId");
            ktCase.setSuccessor(sId != null && !sId.isBlank() ? userRepository.findById(UUID.fromString(sId.trim())).orElse(null) : null);
        }
        if (payload.containsKey("departmentId")) {
            String dId = (String) payload.get("departmentId");
            ktCase.setDepartment(dId != null && !dId.isBlank() ? departmentRepository.findById(UUID.fromString(dId.trim())).orElse(null) : null);
        }

        ktCase.setUpdatedAt(OffsetDateTime.now());
        KnowledgeTransferCase saved = caseRepository.save(ktCase);

        String updateUrl = "/knowledge-transfer/" + saved.getId();
        if (saved.getEmployee() != null) {
            notificationService.sendNotificationToUser(saved.getEmployee(), "Knowledge Transfer Updated",
                    "Knowledge Transfer case '" + saved.getTitle() + "' was updated (Status: " + saved.getStatus() + ").",
                    NotificationEventType.KT_CASE_UPDATED, "KNOWLEDGE_TRANSFER", saved.getId(), updateUrl);
        }
        if (saved.getSuccessor() != null) {
            notificationService.sendNotificationToUser(saved.getSuccessor(), "Knowledge Transfer Updated",
                    "Knowledge Transfer case '" + saved.getTitle() + "' was updated (Status: " + saved.getStatus() + ").",
                    NotificationEventType.KT_CASE_UPDATED, "KNOWLEDGE_TRANSFER", saved.getId(), updateUrl);
        }

        auditService.recordAuditLog(
                username, null, "KT_CASE_UPDATED", "KNOWLEDGE_TRANSFER",
                caseId.toString(), null, "Updated case: " + saved.getTitle()
        );

        return caseToResponse(saved);
    }

    @Transactional
    public Map<String, Object> assignSuccessor(UUID caseId, UUID successorId, String username) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        User successor = userRepository.findById(successorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Successor user not found"));

        ktCase.setSuccessor(successor);
        ktCase.setUpdatedAt(OffsetDateTime.now());
        KnowledgeTransferCase saved = caseRepository.save(ktCase);

        notificationService.sendNotificationToUser(
                successor, "Knowledge Transfer Successor Assignment",
                "You have been assigned as Successor for Knowledge Transfer: " + ktCase.getTitle(),
                NotificationEventType.KT_SUCCESSOR_ASSIGNED, "KNOWLEDGE_TRANSFER", saved.getId(),
                "/knowledge-transfer/" + saved.getId()
        );

        auditService.recordAuditLog(
                username, null, "KT_SUCCESSOR_ASSIGNED", "KNOWLEDGE_TRANSFER",
                caseId.toString(), null, "Assigned successor: " + successor.getUsername()
        );

        return caseToResponse(saved);
    }

    // ----------------- PLAN MANAGEMENT -----------------

    @Transactional(readOnly = true)
    public Map<String, Object> getPlan(UUID caseId) {
        KnowledgeTransferPlan plan = planRepository.findByTransferCaseId(caseId)
                .orElse(null);
        if (plan == null) {
            return Map.of("caseId", caseId, "responsibilities", "", "projectsHandled", "", "systemsMaintained", "", "businessProcesses", "", "criticalKnowledgeAreas", "", "risks", "", "requiredActions", "", "notes", "");
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", plan.getId());
        res.put("caseId", caseId);
        res.put("responsibilities", plan.getResponsibilities() != null ? plan.getResponsibilities() : "");
        res.put("projectsHandled", plan.getProjectsHandled() != null ? plan.getProjectsHandled() : "");
        res.put("systemsMaintained", plan.getSystemsMaintained() != null ? plan.getSystemsMaintained() : "");
        res.put("businessProcesses", plan.getBusinessProcesses() != null ? plan.getBusinessProcesses() : "");
        res.put("criticalKnowledgeAreas", plan.getCriticalKnowledgeAreas() != null ? plan.getCriticalKnowledgeAreas() : "");
        res.put("risks", plan.getRisks() != null ? plan.getRisks() : "");
        res.put("requiredActions", plan.getRequiredActions() != null ? plan.getRequiredActions() : "");
        res.put("notes", plan.getNotes() != null ? plan.getNotes() : "");
        res.put("updatedAt", plan.getUpdatedAt());
        return res;
    }

    @Transactional
    public Map<String, Object> saveOrUpdatePlan(UUID caseId, Map<String, Object> payload, String username) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        KnowledgeTransferPlan plan = planRepository.findByTransferCaseId(caseId)
                .orElseGet(() -> {
                    KnowledgeTransferPlan p = new KnowledgeTransferPlan();
                    p.setTransferCase(ktCase);
                    return p;
                });

        if (payload.containsKey("responsibilities")) plan.setResponsibilities((String) payload.get("responsibilities"));
        if (payload.containsKey("projectsHandled")) plan.setProjectsHandled((String) payload.get("projectsHandled"));
        if (payload.containsKey("systemsMaintained")) plan.setSystemsMaintained((String) payload.get("systemsMaintained"));
        if (payload.containsKey("businessProcesses")) plan.setBusinessProcesses((String) payload.get("businessProcesses"));
        if (payload.containsKey("criticalKnowledgeAreas")) plan.setCriticalKnowledgeAreas((String) payload.get("criticalKnowledgeAreas"));
        if (payload.containsKey("risks")) plan.setRisks((String) payload.get("risks"));
        if (payload.containsKey("requiredActions")) plan.setRequiredActions((String) payload.get("requiredActions"));
        if (payload.containsKey("notes")) plan.setNotes((String) payload.get("notes"));

        plan.setUpdatedAt(OffsetDateTime.now());
        KnowledgeTransferPlan saved = planRepository.save(plan);

        String planUrl = "/knowledge-transfer/" + caseId;
        if (ktCase.getSuccessor() != null) {
            notificationService.sendNotificationToUser(ktCase.getSuccessor(), "Knowledge Transfer Plan Updated",
                    "The knowledge transfer plan for '" + ktCase.getTitle() + "' was updated.",
                    NotificationEventType.KT_PLAN_UPDATED, "KNOWLEDGE_TRANSFER", caseId, planUrl);
        }
        if (ktCase.getEmployee() != null && !ktCase.getEmployee().getUsername().equals(username)) {
            notificationService.sendNotificationToUser(ktCase.getEmployee(), "Knowledge Transfer Plan Updated",
                    "The knowledge transfer plan for '" + ktCase.getTitle() + "' was updated by " + username + ".",
                    NotificationEventType.KT_PLAN_UPDATED, "KNOWLEDGE_TRANSFER", caseId, planUrl);
        }

        auditService.recordAuditLog(
                username, null, "KT_PLAN_UPDATED", "KNOWLEDGE_TRANSFER",
                caseId.toString(), null, "Updated transfer plan for case: " + ktCase.getTitle()
        );

        return getPlan(caseId);
    }

    // ----------------- CHECKLIST MANAGEMENT -----------------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getChecklist(UUID caseId) {
        return checklistRepository.findByTransferCaseIdOrderByOrderIndexAscCreatedAtAsc(caseId).stream()
                .map(this::checklistToResponse)
                .toList();
    }

    @Transactional
    public Map<String, Object> addChecklistItem(UUID caseId, Map<String, Object> payload, String username) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        String itemName = (String) payload.get("itemName");
        if (itemName == null || itemName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item name is required");
        }

        KnowledgeTransferChecklist cl = new KnowledgeTransferChecklist();
        cl.setTransferCase(ktCase);
        cl.setItemName(itemName.trim());
        cl.setCategory((String) payload.getOrDefault("category", "GENERAL"));
        cl.setStatus((String) payload.getOrDefault("status", "PENDING"));
        cl.setNotes((String) payload.get("notes"));

        if (payload.get("assignedToId") != null) {
            String aId = (String) payload.get("assignedToId");
            if (!aId.isBlank()) {
                cl.setAssignedTo(userRepository.findById(UUID.fromString(aId.trim())).orElse(null));
            }
        }

        KnowledgeTransferChecklist saved = checklistRepository.save(cl);

        if (saved.getAssignedTo() != null) {
            notificationService.sendNotificationToUser(saved.getAssignedTo(), "Checklist Item Assigned",
                    "You were assigned checklist item '" + saved.getItemName() + "' in KT case '" + ktCase.getTitle() + "'.",
                    NotificationEventType.KT_CHECKLIST_ASSIGNED, "KNOWLEDGE_TRANSFER", ktCase.getId(),
                    "/knowledge-transfer/" + ktCase.getId());
        }

        auditService.recordAuditLog(
                username, null, "KT_CHECKLIST_ITEM_ADDED", "KNOWLEDGE_TRANSFER",
                caseId.toString(), null, "Added checklist item: " + saved.getItemName()
        );

        return checklistToResponse(saved);
    }

    @Transactional
    public Map<String, Object> updateChecklistItem(UUID itemId, Map<String, Object> payload, String username) {
        KnowledgeTransferChecklist cl = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist item not found"));

        if (payload.containsKey("itemName") && payload.get("itemName") != null) {
            cl.setItemName(((String) payload.get("itemName")).trim());
        }
        if (payload.containsKey("status") && payload.get("status") != null) {
            String newStatus = ((String) payload.get("status")).trim().toUpperCase();
            cl.setStatus(newStatus);
            if ("COMPLETED".equals(newStatus)) {
                cl.setCompletedAt(OffsetDateTime.now());
            } else {
                cl.setCompletedAt(null);
            }
        }
        if (payload.containsKey("category") && payload.get("category") != null) {
            cl.setCategory(((String) payload.get("category")).trim());
        }
        if (payload.containsKey("notes")) {
            cl.setNotes((String) payload.get("notes"));
        }
        if (payload.containsKey("assignedToId")) {
            String aId = (String) payload.get("assignedToId");
            cl.setAssignedTo(aId != null && !aId.isBlank() ? userRepository.findById(UUID.fromString(aId.trim())).orElse(null) : null);
        }

        cl.setUpdatedAt(OffsetDateTime.now());
        KnowledgeTransferChecklist saved = checklistRepository.save(cl);

        if (saved.getAssignedTo() != null) {
            notificationService.sendNotificationToUser(saved.getAssignedTo(), "Checklist Item Updated",
                    "Checklist item '" + saved.getItemName() + "' is now " + saved.getStatus() + " in KT case '" + cl.getTransferCase().getTitle() + "'.",
                    NotificationEventType.KT_CHECKLIST_UPDATED, "KNOWLEDGE_TRANSFER", cl.getTransferCase().getId(),
                    "/knowledge-transfer/" + cl.getTransferCase().getId());
        }

        auditService.recordAuditLog(
                username, null, "KT_CHECKLIST_UPDATED", "KNOWLEDGE_TRANSFER",
                cl.getTransferCase().getId().toString(), null, "Updated checklist item '" + saved.getItemName() + "' to " + saved.getStatus()
        );

        return checklistToResponse(saved);
    }

    // ----------------- KNOWLEDGE SUBMISSION & VALIDATION -----------------

    @Transactional
    public Map<String, Object> submitKnowledge(UUID caseId, Map<String, Object> payload, String username) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        String category = (String) payload.get("category");
        String title = (String) payload.get("title");
        String content = (String) payload.get("content");
        String docIdStr = (String) payload.get("documentId");

        if (title == null || title.isBlank() || content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and Content are required");
        }

        User author = userRepository.findByUsername(username)
                .orElseGet(() -> ktCase.getEmployee());

        Document attachedDoc = null;
        if (docIdStr != null && !docIdStr.isBlank()) {
            attachedDoc = documentRepository.findById(UUID.fromString(docIdStr.trim())).orElse(null);
        }

        KnowledgeTransferSubmission sub = new KnowledgeTransferSubmission();
        sub.setTransferCase(ktCase);
        sub.setCategory(category != null && !category.isBlank() ? category.trim().toUpperCase() : "GENERAL");
        sub.setTitle(title.trim());
        sub.setContent(content.trim());
        sub.setDocument(attachedDoc);
        sub.setSubmittedBy(author);
        sub.setValidationStatus("PENDING_REVIEW");

        KnowledgeTransferSubmission saved = submissionRepository.save(sub);

        // Notify manager / HR with fallback to avoid silent omission
        String subUrl = "/knowledge-transfer/" + caseId;
        String subMsg = "New knowledge item '" + saved.getTitle() + "' submitted by " + author.getUsername();
        if (ktCase.getManager() != null) {
            notificationService.sendNotificationToUser(
                    ktCase.getManager(), "Knowledge Submitted for Review", subMsg,
                    NotificationEventType.KT_KNOWLEDGE_SUBMITTED, "KNOWLEDGE_TRANSFER", caseId, subUrl
            );
        } else if (ktCase.getHrRep() != null) {
            notificationService.sendNotificationToUser(
                    ktCase.getHrRep(), "Knowledge Submitted for Review", subMsg,
                    NotificationEventType.KT_KNOWLEDGE_SUBMITTED, "KNOWLEDGE_TRANSFER", caseId, subUrl
            );
        } else {
            notificationService.sendNotificationToRole(
                    "ROLE_ADMIN", "Knowledge Submitted for Review", subMsg,
                    NotificationEventType.KT_KNOWLEDGE_SUBMITTED, "KNOWLEDGE_TRANSFER", caseId, subUrl
            );
        }

        auditService.recordAuditLog(
                username, null, "KT_KNOWLEDGE_SUBMITTED", "KNOWLEDGE_TRANSFER",
                caseId.toString(), null, "Submitted knowledge item: " + saved.getTitle()
        );

        return submissionToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSubmissions(UUID caseId) {
        return submissionRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId).stream()
                .map(this::submissionToResponse)
                .toList();
    }

    @Transactional
    public Map<String, Object> validateKnowledge(UUID submissionId, Map<String, Object> payload, String reviewerUsername) {
        KnowledgeTransferSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge submission not found"));

        String status = (String) payload.get("status"); // APPROVED, CHANGES_REQUESTED
        String comments = (String) payload.get("reviewComments");

        if (status == null || (!"APPROVED".equalsIgnoreCase(status.trim()) && !"CHANGES_REQUESTED".equalsIgnoreCase(status.trim()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be APPROVED or CHANGES_REQUESTED");
        }

        User reviewer = userRepository.findByUsername(reviewerUsername).orElse(null);

        sub.setValidationStatus(status.trim().toUpperCase());
        sub.setReviewComments(comments);
        sub.setReviewedBy(reviewer);
        sub.setReviewedAt(OffsetDateTime.now());
        sub.setUpdatedAt(OffsetDateTime.now());

        KnowledgeTransferSubmission saved = submissionRepository.save(sub);

        // Notify submitter
        String evType = "APPROVED".equalsIgnoreCase(saved.getValidationStatus())
                ? NotificationEventType.KT_APPROVED : NotificationEventType.KT_CHANGES_REQUESTED;
        notificationService.sendNotificationToUser(
                sub.getSubmittedBy(), "Knowledge Submission " + saved.getValidationStatus(),
                "Your knowledge submission '" + saved.getTitle() + "' was reviewed: " + saved.getValidationStatus() + (comments != null && !comments.isBlank() ? " - " + comments : ""),
                evType, "KNOWLEDGE_TRANSFER", sub.getTransferCase().getId(),
                "/knowledge-transfer/" + sub.getTransferCase().getId()
        );

        auditService.recordAuditLog(
                reviewerUsername, null, "KT_KNOWLEDGE_VALIDATED", "KNOWLEDGE_TRANSFER",
                sub.getTransferCase().getId().toString(), null, "Validated knowledge '" + saved.getTitle() + "' as " + saved.getValidationStatus()
        );

        return submissionToResponse(saved);
    }

    // ----------------- SESSIONS & ATTENDANCE -----------------

    @Transactional
    public Map<String, Object> scheduleSession(UUID caseId, Map<String, Object> payload, String username) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        String title = (String) payload.get("title");
        String scheduledAtStr = (String) payload.get("scheduledAt");
        String locationOrLink = (String) payload.get("locationOrLink");
        String meetingNotes = (String) payload.get("meetingNotes");
        String docIdStr = (String) payload.get("recordingDocumentId");

        if (title == null || title.isBlank() || scheduledAtStr == null || scheduledAtStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and Scheduled Date/Time are required");
        }

        Document recordingDoc = null;
        if (docIdStr != null && !docIdStr.isBlank()) {
            recordingDoc = documentRepository.findById(UUID.fromString(docIdStr.trim())).orElse(null);
        }

        KnowledgeTransferSession session = new KnowledgeTransferSession();
        session.setTransferCase(ktCase);
        session.setTitle(title.trim());
        session.setScheduledAt(OffsetDateTime.parse(scheduledAtStr.trim()));
        session.setLocationOrLink(locationOrLink);
        session.setMeetingNotes(meetingNotes);
        session.setRecordingDocument(recordingDoc);
        session.setStatus("SCHEDULED");

        KnowledgeTransferSession saved = sessionRepository.save(session);

        // Attendees
        String sessionUrl = "/knowledge-transfer/" + caseId;
        @SuppressWarnings("unchecked")
        List<String> attendeeIds = (List<String>) payload.get("attendeeIds");
        if (attendeeIds != null) {
            for (String aId : attendeeIds) {
                if (aId != null && !aId.isBlank()) {
                    userRepository.findById(UUID.fromString(aId.trim())).ifPresent(u -> {
                        KnowledgeTransferSessionAttendee att = new KnowledgeTransferSessionAttendee();
                        att.setSession(saved);
                        att.setUser(u);
                        att.setAttended(false);
                        sessionAttendeeRepository.save(att);
                        notificationService.sendNotificationToUser(
                                u, "Knowledge Transfer Session Scheduled",
                                "You are invited to '" + saved.getTitle() + "' at " + saved.getScheduledAt(),
                                NotificationEventType.KT_SESSION_SCHEDULED, "KNOWLEDGE_TRANSFER", caseId, sessionUrl
                        );
                    });
                }
            }
        }

        auditService.recordAuditLog(
                username, null, "KT_SESSION_CREATED", "KNOWLEDGE_TRANSFER",
                caseId.toString(), null, "Scheduled transfer session: " + saved.getTitle()
        );

        return sessionToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSessions(UUID caseId) {
        return sessionRepository.findByTransferCaseIdOrderByScheduledAtAsc(caseId).stream()
                .map(this::sessionToResponse)
                .toList();
    }

    @Transactional
    public Map<String, Object> updateSession(UUID sessionId, Map<String, Object> payload, String username) {
        KnowledgeTransferSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (payload.containsKey("title") && payload.get("title") != null) session.setTitle(((String) payload.get("title")).trim());
        if (payload.containsKey("scheduledAt") && payload.get("scheduledAt") != null) session.setScheduledAt(OffsetDateTime.parse(((String) payload.get("scheduledAt")).trim()));
        if (payload.containsKey("locationOrLink")) session.setLocationOrLink((String) payload.get("locationOrLink"));
        if (payload.containsKey("meetingNotes")) session.setMeetingNotes((String) payload.get("meetingNotes"));
        if (payload.containsKey("status") && payload.get("status") != null) session.setStatus(((String) payload.get("status")).trim().toUpperCase());
        if (payload.containsKey("recordingDocumentId")) {
            String dId = (String) payload.get("recordingDocumentId");
            session.setRecordingDocument(dId != null && !dId.isBlank() ? documentRepository.findById(UUID.fromString(dId.trim())).orElse(null) : null);
        }

        session.setUpdatedAt(OffsetDateTime.now());
        KnowledgeTransferSession saved = sessionRepository.save(session);

        if (payload.containsKey("attendedUserIds")) {
            @SuppressWarnings("unchecked")
            List<String> attendedList = (List<String>) payload.get("attendedUserIds");
            List<KnowledgeTransferSessionAttendee> attendees = sessionAttendeeRepository.findBySessionId(sessionId);
            for (KnowledgeTransferSessionAttendee att : attendees) {
                boolean wasAttended = attendedList != null && attendedList.contains(att.getUser().getId().toString());
                att.setAttended(wasAttended);
                sessionAttendeeRepository.save(att);
            }
        }

        auditService.recordAuditLog(
                username, null, "KT_SESSION_UPDATED", "KNOWLEDGE_TRANSFER",
                session.getTransferCase().getId().toString(), null, "Updated session: " + saved.getTitle()
        );

        return sessionToResponse(saved);
    }

    // ----------------- EXIT CLEARANCE & COMPLETION -----------------

    @Transactional(readOnly = true)
    public Map<String, Object> calculateExitClearance(UUID caseId) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Case not found"));

        List<KnowledgeTransferChecklist> checklist = checklistRepository.findByTransferCaseIdOrderByOrderIndexAscCreatedAtAsc(caseId);
        long pendingChecklistCount = checklist.stream().filter(c -> "PENDING".equalsIgnoreCase(c.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(c.getStatus())).count();
        long completedChecklistCount = checklist.stream().filter(c -> "COMPLETED".equalsIgnoreCase(c.getStatus()) || "NOT_APPLICABLE".equalsIgnoreCase(c.getStatus())).count();

        List<KnowledgeTransferSubmission> submissions = submissionRepository.findByTransferCaseIdOrderByCreatedAtDesc(caseId);
        long unapprovedSubmissionsCount = submissions.stream().filter(s -> !"APPROVED".equalsIgnoreCase(s.getValidationStatus())).count();
        long approvedSubmissionsCount = submissions.stream().filter(s -> "APPROVED".equalsIgnoreCase(s.getValidationStatus())).count();

        List<KnowledgeTransferSession> sessions = sessionRepository.findByTransferCaseIdOrderByScheduledAtAsc(caseId);
        long pendingSessionsCount = sessions.stream().filter(s -> "SCHEDULED".equalsIgnoreCase(s.getStatus())).count();
        long completedSessionsCount = sessions.stream().filter(s -> "COMPLETED".equalsIgnoreCase(s.getStatus())).count();

        boolean hasSuccessor = ktCase.getSuccessor() != null;
        KnowledgeTransferPlan plan = planRepository.findByTransferCaseId(caseId).orElse(null);
        boolean hasPlan = plan != null && (
                (plan.getResponsibilities() != null && !plan.getResponsibilities().isBlank()) ||
                (plan.getSystemsMaintained() != null && !plan.getSystemsMaintained().isBlank()) ||
                (plan.getBusinessProcesses() != null && !plan.getBusinessProcesses().isBlank())
        );

        List<String> blockers = new ArrayList<>();
        if (pendingChecklistCount > 0) {
            blockers.add(pendingChecklistCount + " checklist item(s) pending completion");
        }
        if (unapprovedSubmissionsCount > 0) {
            blockers.add(unapprovedSubmissionsCount + " knowledge submission(s) awaiting approval");
        }
        if (!hasSuccessor) {
            blockers.add("Successor / Knowledge receiver has not been assigned");
        }
        if (submissions.isEmpty()) {
            blockers.add("No knowledge submissions recorded");
        }

        boolean isReady = blockers.isEmpty();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("caseId", caseId);
        res.put("isReadyForClearance", isReady);
        res.put("clearanceStatus", isReady ? "READY_FOR_CLEARANCE" : "PENDING");
        res.put("blockers", blockers);
        res.put("totalChecklistItems", checklist.size());
        res.put("completedChecklistItems", completedChecklistCount);
        res.put("pendingChecklistItems", pendingChecklistCount);
        res.put("totalSubmissions", submissions.size());
        res.put("approvedSubmissions", approvedSubmissionsCount);
        res.put("unapprovedSubmissions", unapprovedSubmissionsCount);
        res.put("totalSessions", sessions.size());
        res.put("completedSessions", completedSessionsCount);
        res.put("pendingSessions", pendingSessionsCount);
        res.put("hasSuccessor", hasSuccessor);
        res.put("hasPlan", hasPlan);
        return res;
    }

    @Transactional
    public Map<String, Object> completeTransfer(UUID caseId, Map<String, Object> payload, String username) {
        KnowledgeTransferCase ktCase = caseRepository.findByIdAndIsDeletedFalse(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge transfer case not found"));

        Map<String, Object> clearance = calculateExitClearance(caseId);
        boolean isReady = Boolean.TRUE.equals(clearance.get("isReadyForClearance"));

        if (!isReady) {
            @SuppressWarnings("unchecked")
            List<String> blockers = (List<String>) clearance.get("blockers");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot complete transfer: outstanding required items remain: " + String.join("; ", blockers));
        }

        String notes = (String) payload.getOrDefault("notes", "");

        ktCase.setStatus("COMPLETED");
        ktCase.setClearanceStatus("CLEARED");
        ktCase.setCompletedAt(OffsetDateTime.now());
        ktCase.setUpdatedAt(OffsetDateTime.now());
        if (!notes.isBlank()) {
            ktCase.setNotes(ktCase.getNotes() != null ? ktCase.getNotes() + "\n" + notes : notes);
        }

        KnowledgeTransferCase saved = caseRepository.save(ktCase);

        // Notifications
        String notif = "Knowledge Transfer case '" + saved.getTitle() + "' has been successfully completed and cleared.";
        String completeUrl = "/knowledge-transfer/" + caseId;
        notificationService.sendNotificationToUser(saved.getEmployee(), "Knowledge Transfer Completed & Cleared", notif,
                NotificationEventType.KT_FINAL_CLEARANCE, "KNOWLEDGE_TRANSFER", caseId, completeUrl);
        if (saved.getManager() != null) {
            notificationService.sendNotificationToUser(saved.getManager(), "Knowledge Transfer Completed", notif,
                    NotificationEventType.KT_FINAL_CLEARANCE, "KNOWLEDGE_TRANSFER", caseId, completeUrl);
        }
        if (saved.getHrRep() != null) {
            notificationService.sendNotificationToUser(saved.getHrRep(), "Knowledge Transfer Completed", notif,
                    NotificationEventType.KT_FINAL_CLEARANCE, "KNOWLEDGE_TRANSFER", caseId, completeUrl);
        }
        if (saved.getSuccessor() != null) {
            notificationService.sendNotificationToUser(saved.getSuccessor(), "Knowledge Transfer Completed", notif,
                    NotificationEventType.KT_FINAL_CLEARANCE, "KNOWLEDGE_TRANSFER", caseId, completeUrl);
        }

        auditService.recordAuditLog(
                username, null, "KT_TRANSFER_COMPLETED", "KNOWLEDGE_TRANSFER",
                caseId.toString(), null, "Completed knowledge transfer case and exit clearance for " + saved.getEmployee().getUsername()
        );

        return caseToResponse(saved);
    }

    // ----------------- MAPPERS -----------------

    public Map<String, Object> caseToResponse(KnowledgeTransferCase c) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", c.getId());
        row.put("title", c.getTitle());
        row.put("reasonType", c.getReasonType());
        row.put("startDate", c.getStartDate());
        row.put("expectedCompletionDate", c.getExpectedCompletionDate());
        row.put("status", c.getStatus());
        row.put("priority", c.getPriority());
        row.put("notes", c.getNotes() != null ? c.getNotes() : "");
        row.put("clearanceStatus", c.getClearanceStatus());
        row.put("createdAt", c.getCreatedAt());
        row.put("updatedAt", c.getUpdatedAt());
        row.put("completedAt", c.getCompletedAt());

        if (c.getEmployee() != null) {
            Map<String, Object> empMap = new LinkedHashMap<>();
            empMap.put("id", c.getEmployee().getId());
            empMap.put("username", c.getEmployee().getUsername());
            empMap.put("fullName", c.getEmployee().getFullName() != null ? c.getEmployee().getFullName() : c.getEmployee().getUsername());
            empMap.put("email", c.getEmployee().getEmail());
            empMap.put("jobTitle", c.getEmployee().getJobTitle() != null ? c.getEmployee().getJobTitle() : "");
            row.put("employee", empMap);
            row.put("employeeId", c.getEmployee().getId());
        }

        if (c.getManager() != null) {
            Map<String, Object> mgrMap = new LinkedHashMap<>();
            mgrMap.put("id", c.getManager().getId());
            mgrMap.put("username", c.getManager().getUsername());
            mgrMap.put("fullName", c.getManager().getFullName() != null ? c.getManager().getFullName() : c.getManager().getUsername());
            mgrMap.put("email", c.getManager().getEmail());
            row.put("manager", mgrMap);
            row.put("managerId", c.getManager().getId());
        } else {
            row.put("manager", null);
            row.put("managerId", null);
        }

        if (c.getHrRep() != null) {
            Map<String, Object> hrMap = new LinkedHashMap<>();
            hrMap.put("id", c.getHrRep().getId());
            hrMap.put("username", c.getHrRep().getUsername());
            hrMap.put("fullName", c.getHrRep().getFullName() != null ? c.getHrRep().getFullName() : c.getHrRep().getUsername());
            row.put("hrRep", hrMap);
            row.put("hrRepId", c.getHrRep().getId());
        } else {
            row.put("hrRep", null);
            row.put("hrRepId", null);
        }

        if (c.getSuccessor() != null) {
            Map<String, Object> succMap = new LinkedHashMap<>();
            succMap.put("id", c.getSuccessor().getId());
            succMap.put("username", c.getSuccessor().getUsername());
            succMap.put("fullName", c.getSuccessor().getFullName() != null ? c.getSuccessor().getFullName() : c.getSuccessor().getUsername());
            succMap.put("email", c.getSuccessor().getEmail());
            succMap.put("jobTitle", c.getSuccessor().getJobTitle() != null ? c.getSuccessor().getJobTitle() : "");
            row.put("successor", succMap);
            row.put("successorId", c.getSuccessor().getId());
        } else {
            row.put("successor", null);
            row.put("successorId", null);
        }

        if (c.getDepartment() != null) {
            Map<String, Object> dMap = new LinkedHashMap<>();
            dMap.put("id", c.getDepartment().getId());
            dMap.put("name", c.getDepartment().getName());
            dMap.put("code", c.getDepartment().getCode() != null ? c.getDepartment().getCode() : "");
            row.put("department", dMap);
            row.put("departmentId", c.getDepartment().getId());
        } else {
            row.put("department", null);
            row.put("departmentId", null);
        }

        return row;
    }

    public Map<String, Object> checklistToResponse(KnowledgeTransferChecklist cl) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", cl.getId());
        row.put("caseId", cl.getTransferCase().getId());
        row.put("itemName", cl.getItemName());
        row.put("category", cl.getCategory());
        row.put("status", cl.getStatus());
        row.put("orderIndex", cl.getOrderIndex());
        row.put("notes", cl.getNotes() != null ? cl.getNotes() : "");
        row.put("completedAt", cl.getCompletedAt());
        row.put("createdAt", cl.getCreatedAt());

        if (cl.getAssignedTo() != null) {
            Map<String, Object> aMap = new LinkedHashMap<>();
            aMap.put("id", cl.getAssignedTo().getId());
            aMap.put("username", cl.getAssignedTo().getUsername());
            aMap.put("fullName", cl.getAssignedTo().getFullName() != null ? cl.getAssignedTo().getFullName() : cl.getAssignedTo().getUsername());
            row.put("assignedTo", aMap);
            row.put("assignedToId", cl.getAssignedTo().getId());
        } else {
            row.put("assignedTo", null);
            row.put("assignedToId", null);
        }
        return row;
    }

    public Map<String, Object> submissionToResponse(KnowledgeTransferSubmission sub) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", sub.getId());
        row.put("caseId", sub.getTransferCase().getId());
        row.put("category", sub.getCategory());
        row.put("title", sub.getTitle());
        row.put("content", sub.getContent());
        row.put("validationStatus", sub.getValidationStatus());
        row.put("reviewComments", sub.getReviewComments() != null ? sub.getReviewComments() : "");
        row.put("reviewedAt", sub.getReviewedAt());
        row.put("createdAt", sub.getCreatedAt());

        if (sub.getSubmittedBy() != null) {
            row.put("submittedBy", Map.of(
                    "id", sub.getSubmittedBy().getId(),
                    "username", sub.getSubmittedBy().getUsername(),
                    "fullName", sub.getSubmittedBy().getFullName() != null ? sub.getSubmittedBy().getFullName() : sub.getSubmittedBy().getUsername()
            ));
        }

        if (sub.getReviewedBy() != null) {
            row.put("reviewedBy", Map.of(
                    "id", sub.getReviewedBy().getId(),
                    "username", sub.getReviewedBy().getUsername(),
                    "fullName", sub.getReviewedBy().getFullName() != null ? sub.getReviewedBy().getFullName() : sub.getReviewedBy().getUsername()
            ));
        } else {
            row.put("reviewedBy", null);
        }

        if (sub.getDocument() != null) {
            Map<String, Object> docMap = new LinkedHashMap<>();
            docMap.put("id", sub.getDocument().getId());
            docMap.put("title", sub.getDocument().getTitle());
            row.put("document", docMap);
            row.put("documentId", sub.getDocument().getId());
        } else {
            row.put("document", null);
            row.put("documentId", null);
        }

        return row;
    }

    public Map<String, Object> sessionToResponse(KnowledgeTransferSession s) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", s.getId());
        row.put("caseId", s.getTransferCase().getId());
        row.put("title", s.getTitle());
        row.put("scheduledAt", s.getScheduledAt());
        row.put("locationOrLink", s.getLocationOrLink() != null ? s.getLocationOrLink() : "");
        row.put("meetingNotes", s.getMeetingNotes() != null ? s.getMeetingNotes() : "");
        row.put("status", s.getStatus());
        row.put("createdAt", s.getCreatedAt());

        if (s.getRecordingDocument() != null) {
            row.put("recordingDocument", Map.of(
                    "id", s.getRecordingDocument().getId(),
                    "title", s.getRecordingDocument().getTitle()
            ));
            row.put("recordingDocumentId", s.getRecordingDocument().getId());
        } else {
            row.put("recordingDocument", null);
            row.put("recordingDocumentId", null);
        }

        List<KnowledgeTransferSessionAttendee> attendees = sessionAttendeeRepository.findBySessionId(s.getId());
        List<Map<String, Object>> attList = new ArrayList<>();
        for (KnowledgeTransferSessionAttendee att : attendees) {
            Map<String, Object> a = new LinkedHashMap<>();
            a.put("id", att.getId());
            a.put("userId", att.getUser().getId());
            a.put("username", att.getUser().getUsername());
            a.put("fullName", att.getUser().getFullName() != null ? att.getUser().getFullName() : att.getUser().getUsername());
            a.put("attended", Boolean.TRUE.equals(att.getAttended()));
            a.put("notes", att.getNotes() != null ? att.getNotes() : "");
            attList.add(a);
        }
        row.put("attendees", attList);
        return row;
    }
}
