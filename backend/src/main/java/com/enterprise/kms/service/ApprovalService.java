package com.enterprise.kms.service;

import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-25 configuration: reusable approval routing templates (ordered approvers,
 * optionally bound to a document type). Documents can be routed through a
 * template's steps to reach PUBLISHED status (draft -> review -> published).
 */
@Service
public class ApprovalService {

    private final ApprovalWorkflowTemplateRepository templateRepository;
    private final ApprovalTemplateStepRepository templateStepRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final UserRepository userRepository;
    private final ApprovalWorkflowRepository workflowRepository;
    private final ApprovalStepRepository approvalStepRepository;
    private final DocumentApprovalRepository documentApprovalRepository;
    private final DocumentRepository documentRepository;
    private final AuditService auditService;

    public ApprovalService(ApprovalWorkflowTemplateRepository templateRepository,
                           ApprovalTemplateStepRepository templateStepRepository,
                           DocumentTypeRepository documentTypeRepository,
                           UserRepository userRepository,
                           ApprovalWorkflowRepository workflowRepository,
                           ApprovalStepRepository approvalStepRepository,
                           DocumentApprovalRepository documentApprovalRepository,
                           DocumentRepository documentRepository,
                           AuditService auditService) {
        this.templateRepository = templateRepository;
        this.templateStepRepository = templateStepRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.userRepository = userRepository;
        this.workflowRepository = workflowRepository;
        this.approvalStepRepository = approvalStepRepository;
        this.documentApprovalRepository = documentApprovalRepository;
        this.documentRepository = documentRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTemplates() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (ApprovalWorkflowTemplate template : templateRepository.findAll()) {
            rows.add(describeTemplate(template));
        }
        return rows;
    }

    @Transactional
    public Map<String, Object> createTemplate(String name, String description, UUID documentTypeId,
                                              Boolean isActive, List<UUID> approverIds) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template name is required");
        }
        if (templateRepository.findByName(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A template with this name already exists");
        }
        if (approverIds == null || approverIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At least one approver is required for a workflow template");
        }
        ApprovalWorkflowTemplate template = new ApprovalWorkflowTemplate();
        template.setName(name.trim());
        template.setDescription(description);
        if (documentTypeId != null) {
            template.setDocumentType(documentTypeRepository.findById(documentTypeId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found")));
        }
        template.setIsActive(isActive != null ? isActive : true);
        template = templateRepository.save(template);
        replaceSteps(template, approverIds);
        return describeTemplate(template);
    }

    @Transactional
    public Map<String, Object> updateTemplate(UUID id, String name, String description, UUID documentTypeId,
                                              Boolean isActive, List<UUID> approverIds) {
        ApprovalWorkflowTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
        if (name != null && !name.isBlank()) {
            template.setName(name.trim());
        }
        if (description != null) {
            template.setDescription(description);
        }
        if (documentTypeId != null) {
            template.setDocumentType(documentTypeRepository.findById(documentTypeId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found")));
        }
        if (isActive != null) {
            template.setIsActive(isActive);
        }
        template = templateRepository.save(template);
        if (approverIds != null) {
            replaceSteps(template, approverIds);
        }
        return describeTemplate(template);
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        if (!templateRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found");
        }
        templateStepRepository.deleteByTemplate_Id(id);
        templateRepository.deleteById(id);
    }

    private void replaceSteps(ApprovalWorkflowTemplate template, List<UUID> approverIds) {
        templateStepRepository.deleteByTemplate_Id(template.getId());
        if (approverIds == null || approverIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At least one approver is required for a workflow template");
        }
        int number = 1;
        for (UUID userId : approverIds) {
            User approver = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Approver not found: " + userId));
            ApprovalTemplateStep step = new ApprovalTemplateStep();
            step.setTemplate(template);
            step.setStepNumber(number++);
            step.setApprover(approver);
            templateStepRepository.save(step);
        }
    }

    private Map<String, Object> describeTemplate(ApprovalWorkflowTemplate template) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", template.getId());
        row.put("name", template.getName());
        row.put("description", template.getDescription());
        row.put("isActive", template.getIsActive());
        row.put("createdAt", template.getCreatedAt());
        row.put("documentTypeId", template.getDocumentType() != null ? template.getDocumentType().getId() : null);
        row.put("documentTypeName", template.getDocumentType() != null ? template.getDocumentType().getName() : null);

        List<Map<String, Object>> steps = new ArrayList<>();
        for (ApprovalTemplateStep step : templateStepRepository.findByTemplate_IdOrderByStepNumberAsc(template.getId())) {
            Map<String, Object> stepRow = new LinkedHashMap<>();
            stepRow.put("stepNumber", step.getStepNumber());
            stepRow.put("approverId", step.getApprover() != null ? step.getApprover().getId() : null);
            stepRow.put("approverUsername", step.getApprover() != null ? step.getApprover().getUsername() : null);
            steps.add(stepRow);
        }
        row.put("steps", steps);
        return row;
    }

    // ===================== Approval Execution (FR-25) =====================

    @Transactional
    public Map<String, Object> submitForApproval(UUID documentId, UUID templateId, String username) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"DRAFT".equals(doc.getStatus()) && !"PUBLISHED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Document must be in DRAFT or PUBLISHED status to submit for approval. Current: " + doc.getStatus());
        }

        // Only document owner (author) or admin can submit for approval
        User caller = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        boolean isOwner = doc.getAuthor() != null && doc.getAuthor().getId().equals(caller.getId());
        boolean isAdmin = "ROLE_ADMIN".equals(caller.getRoleName());
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the document owner or an admin can submit for approval");
        }

        if (workflowRepository.findByDocumentId(documentId)
                .filter(w -> "PENDING".equals(w.getStatus()) || "IN_PROGRESS".equals(w.getStatus()))
                .isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Document already has an active approval workflow");
        }

        ApprovalWorkflowTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Approval template not found"));
        if (!Boolean.TRUE.equals(template.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Approval template is not active");
        }

        List<ApprovalTemplateStep> templateSteps = templateStepRepository
                .findByTemplate_IdOrderByStepNumberAsc(template.getId());
        if (templateSteps.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Approval template has no steps");
        }

        User submitter = userRepository.findByUsername(username).orElse(null);

        ApprovalWorkflow workflow = new ApprovalWorkflow();
        workflow.setDocument(doc);
        workflow.setTemplate(template);
        workflow.setSubmittedBy(submitter);
        workflow.setTitle(doc.getTitle() + " — " + template.getName());
        workflow.setStatus("IN_PROGRESS");
        workflow = workflowRepository.save(workflow);

        for (ApprovalTemplateStep ts : templateSteps) {
            ApprovalStep step = new ApprovalStep();
            step.setWorkflow(workflow);
            step.setStepNumber(ts.getStepNumber());
            step.setApprover(ts.getApprover());
            step.setStatus(ts.getStepNumber() == 1 ? "PENDING" : "WAITING");
            approvalStepRepository.save(step);
        }

        doc.setStatus("UNDER_REVIEW");
        documentRepository.save(doc);

        auditService.recordAuditLog(username, null,
                "DOCUMENT_SUBMITTED_FOR_APPROVAL", "DOCUMENT", documentId.toString(), null,
                "{\"workflowId\":\"" + workflow.getId() + "\",\"templateName\":\"" + template.getName() + "\"}");

        return describeWorkflow(workflow);
    }

    /**
     * FR-25 auto-submit: called immediately after a fresh upload so a new document
     * starts its life in review (UNDER_REVIEW) with an approval workflow already
     * routed through the first active template (if any). If no active template
     * exists the document is left UNDER_REVIEW so it stays hidden from the public
     * library until someone approves it.
     */
    @Transactional
    public boolean autoSubmitNewDocument(Document doc, String username) {
        List<ApprovalWorkflowTemplate> templates = templateRepository.findByIsActiveTrue();
        ApprovalWorkflowTemplate template = templates.isEmpty() ? null : templates.get(0);

        List<ApprovalTemplateStep> templateSteps = template == null
                ? java.util.Collections.emptyList()
                : templateStepRepository.findByTemplate_IdOrderByStepNumberAsc(template.getId());
        if (template == null || templateSteps.isEmpty()) {
            return false;
        }

        if (workflowRepository.findByDocumentId(doc.getId())
                .filter(w -> "PENDING".equals(w.getStatus()) || "IN_PROGRESS".equals(w.getStatus()))
                .isPresent()) {
            return false;
        }

        User submitter = userRepository.findByUsername(username).orElse(null);

        ApprovalWorkflow workflow = new ApprovalWorkflow();
        workflow.setDocument(doc);
        workflow.setTemplate(template);
        workflow.setSubmittedBy(submitter);
        workflow.setTitle(doc.getTitle() + " \u2014 " + template.getName());
        workflow.setStatus("IN_PROGRESS");
        workflow = workflowRepository.save(workflow);

        for (ApprovalTemplateStep ts : templateSteps) {
            ApprovalStep step = new ApprovalStep();
            step.setWorkflow(workflow);
            step.setStepNumber(ts.getStepNumber());
            step.setApprover(ts.getApprover());
            step.setStatus(ts.getStepNumber() == 1 ? "PENDING" : "WAITING");
            approvalStepRepository.save(step);
        }

        doc.setStatus("UNDER_REVIEW");
        documentRepository.save(doc);

        auditService.recordAuditLog(username, null,
                "DOCUMENT_SUBMITTED_FOR_APPROVAL", "DOCUMENT", doc.getId().toString(), null,
                "{\"workflowId\":\"" + workflow.getId() + "\",\"templateName\":\"" + template.getName() + "\"}");
        return true;
    }

    @Transactional
    public Map<String, Object> decideStep(UUID workflowId, UUID stepId, String decision, String username, String comments) {
        if (!"APPROVED".equals(decision) && !"REJECTED".equals(decision)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "decision must be APPROVED or REJECTED");
        }

        ApprovalWorkflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow not found"));
        if (!"IN_PROGRESS".equals(workflow.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workflow is not in progress. Status: " + workflow.getStatus());
        }

        ApprovalStep step = approvalStepRepository.findById(stepId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Step not found"));
        if (!step.getWorkflow().getId().equals(workflowId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step does not belong to this workflow");
        }
        if (!"PENDING".equals(step.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step is not pending. Status: " + step.getStatus());
        }

        User caller = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        boolean isOversight = "ROLE_ADMIN".equals(caller.getRoleName())
                || "ROLE_CONTENT_OWNER".equals(caller.getRoleName())
                || "ROLE_COMPLIANCE_OFFICER".equals(caller.getRoleName());
        if (step.getApprover() == null
                || (!isOversight && !step.getApprover().getId().equals(caller.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the approver for this step");
        }

        step.setStatus(decision);
        step.setDecidedAt(OffsetDateTime.now());
        approvalStepRepository.save(step);

        DocumentApproval record = new DocumentApproval();
        record.setWorkflow(workflow);
        record.setStep(step);
        record.setApprover(caller);
        record.setDecision(decision);
        record.setComments(comments);
        documentApprovalRepository.save(record);

        auditService.recordAuditLog(username, null,
                "APPROVAL_STEP_" + decision, "APPROVAL_WORKFLOW", workflowId.toString(), null,
                "{\"stepNumber\":" + step.getStepNumber() + ",\"documentId\":\"" + workflow.getDocument().getId() + "\"}");

        if ("REJECTED".equals(decision)) {
            workflow.setStatus("REJECTED");
            workflow.setCompletedAt(OffsetDateTime.now());
            workflowRepository.save(workflow);
            Document doc = workflow.getDocument();
            doc.setStatus("DRAFT");
            documentRepository.save(doc);
            return describeWorkflow(workflow);
        }

        List<ApprovalStep> allSteps = approvalStepRepository.findByWorkflowIdOrderByStepNumberAsc(workflowId);
        boolean allApproved = allSteps.stream().allMatch(s -> "APPROVED".equals(s.getStatus()));

        if (allApproved) {
            workflow.setStatus("APPROVED");
            workflow.setCompletedAt(OffsetDateTime.now());
            workflowRepository.save(workflow);
            Document doc = workflow.getDocument();
            doc.setStatus("PUBLISHED");
            documentRepository.save(doc);
            auditService.recordAuditLog(username, null,
                    "DOCUMENT_APPROVAL_COMPLETED", "DOCUMENT", doc.getId().toString(), null,
                    "{\"workflowId\":\"" + workflow.getId() + "\"}");
        } else {
            ApprovalStep nextStep = allSteps.stream()
                    .filter(s -> "WAITING".equals(s.getStatus()))
                    .min((a, b) -> Integer.compare(a.getStepNumber(), b.getStepNumber()))
                    .orElse(null);
            if (nextStep != null) {
                nextStep.setStatus("PENDING");
                approvalStepRepository.save(nextStep);
            }
        }

        return describeWorkflow(workflow);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPendingApprovals(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        boolean isAdmin = "ROLE_ADMIN".equals(user.getRoleName());

        List<ApprovalStep> pendingSteps = approvalStepRepository.findByStatus("PENDING");

        // Admins (and oversight roles) see every in-progress workflow with a pending
        // step; a regular approver only sees the steps actually assigned to them.
        List<Map<String, Object>> result = new ArrayList<>();
        java.util.LinkedHashSet<UUID> seen = new java.util.LinkedHashSet<>();
        for (ApprovalStep step : pendingSteps) {
            ApprovalWorkflow wf = step.getWorkflow();
            if (wf == null
                    || !"IN_PROGRESS".equals(wf.getStatus())
                    || wf.getId() == null
                    || seen.contains(wf.getId())) {
                continue;
            }
            boolean assignedToCaller = step.getApprover() != null
                    && user.getId() != null
                    && step.getApprover().getId().equals(user.getId());
            if (!isAdmin && !assignedToCaller) {
                continue;
            }
            seen.add(wf.getId());
            Map<String, Object> row = describeWorkflow(wf);
            row.put("submittedBy", wf.getSubmittedBy() != null ? wf.getSubmittedBy().getUsername() : null);
            result.add(row);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> describeWorkflow(ApprovalWorkflow workflow) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", workflow.getId());
        row.put("documentId", workflow.getDocument() != null ? workflow.getDocument().getId() : null);
        row.put("documentTitle", workflow.getDocument() != null ? workflow.getDocument().getTitle() : null);
        row.put("documentStatus", workflow.getDocument() != null ? workflow.getDocument().getStatus() : null);
        row.put("documentAuthor", workflow.getDocument() != null && workflow.getDocument().getAuthor() != null ? workflow.getDocument().getAuthor().getUsername() : null);
        row.put("title", workflow.getTitle());
        row.put("status", workflow.getStatus());
        row.put("templateName", workflow.getTemplate() != null ? workflow.getTemplate().getName() : null);
        row.put("documentStatus", workflow.getDocument() != null ? workflow.getDocument().getStatus() : null);
        row.put("createdAt", workflow.getCreatedAt());
        row.put("completedAt", workflow.getCompletedAt());

        List<Map<String, Object>> steps = new ArrayList<>();
        for (ApprovalStep step : approvalStepRepository.findByWorkflowIdOrderByStepNumberAsc(workflow.getId())) {
            Map<String, Object> stepRow = new LinkedHashMap<>();
            stepRow.put("id", step.getId());
            stepRow.put("stepId", step.getId());
            stepRow.put("stepNumber", step.getStepNumber());
            stepRow.put("approverId", step.getApprover() != null ? step.getApprover().getId() : null);
            stepRow.put("approverUsername", step.getApprover() != null ? step.getApprover().getUsername() : null);
            stepRow.put("status", step.getStatus());
            stepRow.put("decidedAt", step.getDecidedAt());
            documentApprovalRepository.findByWorkflowIdAndStepId(workflow.getId(), step.getId())
                    .ifPresent(ap -> {
                        stepRow.put("decision", ap.getDecision());
                        stepRow.put("comments", ap.getComments());
                    });
            steps.add(stepRow);
        }
        row.put("steps", steps);
        return row;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> describeWorkflowById(UUID workflowId) {
        ApprovalWorkflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow not found"));
        return describeWorkflow(workflow);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAllWorkflows(String statusFilter) {
        List<ApprovalWorkflow> workflows = statusFilter != null && !statusFilter.isBlank()
                ? workflowRepository.findByStatus(statusFilter)
                : workflowRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (ApprovalWorkflow wf : workflows) {
            result.add(describeWorkflow(wf));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listMySubmissions(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<ApprovalWorkflow> workflows = workflowRepository.findBySubmittedByIdOrderByCreatedAtDesc(user.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (ApprovalWorkflow wf : workflows) {
            result.add(describeWorkflow(wf));
        }
        return result;
    }
}
