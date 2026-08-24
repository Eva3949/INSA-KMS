package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.AuditLogEntity;
import com.enterprise.kms.entity.LegalHold;
import com.enterprise.kms.entity.LegalHoldItem;
import com.enterprise.kms.entity.RetentionPolicy;
import com.enterprise.kms.repository.AuditLogRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.GovernanceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/governance")
public class GovernanceController {
    private final GovernanceService governanceService;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;

    public GovernanceController(GovernanceService governanceService,
                                AuditService auditService,
                                AuditLogRepository auditLogRepository) {
        this.governanceService = governanceService;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
    }

    // ================= Retention & Disposition (FR-28) =================

    @GetMapping("/retention")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "RETENTION_VIEW", resourceType = "GOVERNANCE")
    public ResponseEntity<List<RetentionPolicy>> getRetentionPolicies() {
        return ResponseEntity.ok(governanceService.getRetentionPolicies());
    }

    @PostMapping("/retention")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "RETENTION_POLICY_CREATED", resourceType = "GOVERNANCE")
    public ResponseEntity<RetentionPolicy> createRetentionPolicy(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        UUID documentTypeId = body.get("documentTypeId") != null && !body.get("documentTypeId").toString().isBlank()
                ? UUID.fromString(body.get("documentTypeId").toString()) : null;
        Integer retentionDays = body.get("retentionDays") != null
                ? Integer.valueOf(body.get("retentionDays").toString()) : null;
        String dispositionAction = (String) body.getOrDefault("dispositionAction", "ARCHIVE");

        RetentionPolicy saved = governanceService.createRetentionPolicy(name, description, documentTypeId,
                retentionDays, dispositionAction);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/retention/{id}")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "RETENTION_POLICY_UPDATED", resourceType = "GOVERNANCE")
    public ResponseEntity<RetentionPolicy> updateRetentionPolicy(@PathVariable("id") UUID id,
                                                                 @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        UUID documentTypeId = body.get("documentTypeId") != null && !body.get("documentTypeId").toString().isBlank()
                ? UUID.fromString(body.get("documentTypeId").toString()) : null;
        Integer retentionDays = body.get("retentionDays") != null
                ? Integer.valueOf(body.get("retentionDays").toString()) : null;
        String dispositionAction = (String) body.get("dispositionAction");
        Boolean isActive = body.get("isActive") != null ? Boolean.valueOf(body.get("isActive").toString()) : null;

        return ResponseEntity.ok(governanceService.updateRetentionPolicy(id, name, description, documentTypeId,
                retentionDays, dispositionAction, isActive));
    }

    @DeleteMapping("/retention/{id}")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "RETENTION_POLICY_DELETED", resourceType = "GOVERNANCE")
    public ResponseEntity<Map<String, String>> deleteRetentionPolicy(@PathVariable("id") UUID id) {
        governanceService.deleteRetentionPolicy(id);
        return ResponseEntity.ok(Map.of("message", "Retention policy deleted successfully", "id", id.toString()));
    }

    // ================= Legal Holds (FR-29) =================

    @GetMapping("/legal-holds")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "LEGAL_HOLD_VIEW", resourceType = "GOVERNANCE")
    public ResponseEntity<List<LegalHold>> getLegalHolds() {
        return ResponseEntity.ok(governanceService.getLegalHolds());
    }

    @PostMapping("/legal-holds")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "LEGAL_HOLD_APPLY", resourceType = "LEGAL_HOLD")
    public ResponseEntity<LegalHold> createLegalHold(@RequestParam("caseNumber") String caseNumber,
                                                     @RequestParam("title") String title,
                                                     @RequestParam(value = "description", required = false) String description) {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(governanceService.createLegalHold(caseNumber, title, description, username));
    }

    @PutMapping("/legal-holds/{id}/release")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "LEGAL_HOLD_RELEASED", resourceType = "LEGAL_HOLD")
    public ResponseEntity<LegalHold> releaseLegalHold(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(governanceService.releaseLegalHold(id));
    }

    @GetMapping("/legal-holds/{id}/items")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "LEGAL_HOLD_ITEMS_VIEW", resourceType = "LEGAL_HOLD")
    public ResponseEntity<List<Map<String, Object>>> getHoldItems(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(governanceService.getHoldItems(id));
    }

    @PostMapping("/legal-holds/{id}/items")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "LEGAL_HOLD_ITEM_ADDED", resourceType = "LEGAL_HOLD")
    public ResponseEntity<LegalHoldItem> addDocumentToHold(@PathVariable("id") UUID id,
                                                           @RequestBody Map<String, String> body) {
        String documentId = body.get("documentId");
        if (documentId == null || documentId.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "documentId is required");
        }
        return ResponseEntity.ok(governanceService.addDocumentToHold(id, UUID.fromString(documentId)));
    }

    @DeleteMapping("/legal-holds/{id}/items/{documentId}")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "LEGAL_HOLD_ITEM_REMOVED", resourceType = "LEGAL_HOLD")
    public ResponseEntity<Map<String, String>> removeDocumentFromHold(@PathVariable("id") UUID id,
                                                                      @PathVariable("documentId") UUID documentId) {
        governanceService.removeDocumentFromHold(id, documentId);
        return ResponseEntity.ok(Map.of("message", "Document released from legal hold",
                "holdId", id.toString(), "documentId", documentId.toString()));
    }

    // ================= Audit Logs (FR-22 / Section 7 SIEM export) =================

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "AUDIT_LOG_QUERY", resourceType = "AUDIT")
    public ResponseEntity<Page<AuditLogEntity>> getAuditLogs(Pageable pageable) {
        return ResponseEntity.ok(auditService.getAuditLogs(pageable));
    }

    @GetMapping("/audit-logs/export")
    @PreAuthorize("hasAnyRole('ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "AUDIT_LOG_EXPORTED", resourceType = "AUDIT")
    public ResponseEntity<byte[]> exportAuditLogs(
            @RequestParam(value = "since", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime since) {

        List<AuditLogEntity> logs = (since != null)
                ? auditLogRepository.findByCreatedAtAfterOrderByCreatedAtAsc(since)
                : auditLogRepository.findByOrderByCreatedAtAsc();

        StringBuilder csv = new StringBuilder();
        csv.append("id,user_id,user_email,action,resource_type,resource_id,ip_address,created_at\n");
        for (AuditLogEntity logEntry : logs) {
            csv.append(escapeCsv(logEntry.getId())).append(',')
                    .append(escapeCsv(logEntry.getUserId())).append(',')
                    .append(escapeCsv(logEntry.getUserEmail())).append(',')
                    .append(escapeCsv(logEntry.getAction())).append(',')
                    .append(escapeCsv(logEntry.getResourceType())).append(',')
                    .append(escapeCsv(logEntry.getResourceId())).append(',')
                    .append(escapeCsv(logEntry.getIpAddress())).append(',')
                    .append(escapeCsv(logEntry.getCreatedAt() != null ? logEntry.getCreatedAt().toString() : ""))
                    .append('\n');
        }

        byte[] payload = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"kms-audit-logs.csv\"")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(payload);
    }

    private String escapeCsv(Object value) {
        if (value == null) {
            return "";
        }
        String text = value.toString();
        if (text.contains(",") || text.contains("\"") || text.contains("\n")) {
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }
}
