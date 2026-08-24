package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.RetentionPolicy;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.LegalHoldItemRepository;
import com.enterprise.kms.repository.RetentionPolicyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-28 Retention & Disposition engine.
 * Periodically evaluates active retention policies and applies the configured
 * disposition action (ARCHIVE / PURGE / REVIEW) to expired documents.
 * Documents frozen under an active Legal Hold are always skipped (FR-29).
 */
@Service
public class RetentionDispositionJob {
    private static final Logger log = LoggerFactory.getLogger(RetentionDispositionJob.class);

    private final RetentionPolicyRepository retentionPolicyRepository;
    private final DocumentRepository documentRepository;
    private final LegalHoldItemRepository legalHoldItemRepository;
    private final AuditService auditService;

    public RetentionDispositionJob(RetentionPolicyRepository retentionPolicyRepository,
                                   DocumentRepository documentRepository,
                                   LegalHoldItemRepository legalHoldItemRepository,
                                   AuditService auditService) {
        this.retentionPolicyRepository = retentionPolicyRepository;
        this.documentRepository = documentRepository;
        this.legalHoldItemRepository = legalHoldItemRepository;
        this.auditService = auditService;
    }

    @Scheduled(cron = "${kms.retention.cron:0 0 2 * * *}")
    public Map<String, Long> runScheduled() {
        return runDispositions();
    }

    @Transactional
    public Map<String, Long> runDispositions() {
        long archived = 0;
        long purged = 0;
        long reviewFlagged = 0;
        long skippedOnHold = 0;

        List<RetentionPolicy> policies = retentionPolicyRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .filter(p -> p.getRetentionDays() != null && p.getRetentionDays() > 0)
                .toList();

        OffsetDateTime now = OffsetDateTime.now();
        for (RetentionPolicy policy : policies) {
            OffsetDateTime cutoff = now.minusDays(policy.getRetentionDays());
            List<Document> candidates = policy.getDocumentType() != null
                    ? documentRepository.findByDocumentTypeIdAndIsDeletedFalse(policy.getDocumentType().getId())
                    : documentRepository.findAll().stream().filter(d -> !Boolean.TRUE.equals(d.getIsDeleted())).toList();

            for (Document doc : candidates) {
                OffsetDateTime referenceDate = doc.getUpdatedAt() != null ? doc.getUpdatedAt() : doc.getCreatedAt();
                if (referenceDate == null || referenceDate.isAfter(cutoff)) {
                    continue;
                }
                if (legalHoldItemRepository.existsByIdDocumentId(doc.getId())) {
                    skippedOnHold++;
                    continue;
                }
                String action = policy.getDispositionAction() != null ? policy.getDispositionAction().toUpperCase() : "ARCHIVE";
                switch (action) {
                    case "PURGE" -> {
                        documentRepository.softDeleteById(doc.getId());
                        purged++;
                    }
                    case "REVIEW" -> {
                        // UNDER_REVIEW is the matching document_status_enum label
                        if (!"UNDER_REVIEW".equals(doc.getStatus())) {
                            documentRepository.updateStatus(doc.getId(), "UNDER_REVIEW");
                            reviewFlagged++;
                        } else {
                            continue;
                        }
                    }
                    default -> {
                        if (!"ARCHIVED".equals(doc.getStatus())) {
                            documentRepository.updateStatus(doc.getId(), "ARCHIVED");
                            archived++;
                        } else {
                            continue;
                        }
                    }
                }
                auditService.recordAuditLog("system", null,
                        "RETENTION_" + action + "_APPLIED", "DOCUMENT", doc.getId().toString(), null,
                        "{\"policyId\":\"" + policy.getId() + "\",\"policyName\":\"" + policy.getName() + "\"}");
            }
        }

        Map<String, Long> summary = new LinkedHashMap<>();
        summary.put("archived", archived);
        summary.put("purged", purged);
        summary.put("reviewFlagged", reviewFlagged);
        summary.put("skippedOnLegalHold", skippedOnHold);
        log.info("Retention disposition run complete: {}", summary);
        return summary;
    }

    public boolean isDocumentUnderLegalHold(UUID documentId) {
        return legalHoldItemRepository.existsByIdDocumentId(documentId);
    }
}
