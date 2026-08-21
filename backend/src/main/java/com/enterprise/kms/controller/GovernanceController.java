package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.AuditLogEntity;
import com.enterprise.kms.entity.LegalHold;
import com.enterprise.kms.entity.RetentionPolicy;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.GovernanceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/governance")
public class GovernanceController {
    private final GovernanceService governanceService;
    private final AuditService auditService;

    public GovernanceController(GovernanceService governanceService, AuditService auditService) {
        this.governanceService = governanceService;
        this.auditService = auditService;
    }

    @GetMapping("/retention")
    @PreAuthorize("hasAnyRole('ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')")
    @AuditLog(action = "RETENTION_VIEW", resourceType = "GOVERNANCE")
    public ResponseEntity<List<RetentionPolicy>> getRetentionPolicies() {
        return ResponseEntity.ok(governanceService.getRetentionPolicies());
    }

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

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "AUDIT_LOG_QUERY", resourceType = "AUDIT")
    public ResponseEntity<Page<AuditLogEntity>> getAuditLogs(Pageable pageable) {
        return ResponseEntity.ok(auditService.getAuditLogs(pageable));
    }
}
