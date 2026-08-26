package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.DocumentVersion;
import com.enterprise.kms.entity.StorageObject;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.DocumentVersionRepository;
import com.enterprise.kms.repository.LegalHoldItemRepository;
import com.enterprise.kms.repository.StorageObjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * FR-08 Recycle Bin / Recovery: documents soft-deleted more than the configured
 * window ago (system setting recycle-bin.retention-days) are permanently purged.
 * Documents frozen under an active Legal Hold are never purged (FR-29 override).
 */
@Service
public class RecycleBinPurgeJob {
    private static final Logger log = LoggerFactory.getLogger(RecycleBinPurgeJob.class);

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final StorageObjectRepository storageObjectRepository;
    private final StorageService storageService;
    private final LegalHoldItemRepository legalHoldItemRepository;
    private final AuditService auditService;
    private final SystemSettingService systemSettingService;

    public RecycleBinPurgeJob(DocumentRepository documentRepository,
                              DocumentVersionRepository documentVersionRepository,
                              StorageObjectRepository storageObjectRepository,
                              StorageService storageService,
                              LegalHoldItemRepository legalHoldItemRepository,
                              AuditService auditService,
                              SystemSettingService systemSettingService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageObjectRepository = storageObjectRepository;
        this.storageService = storageService;
        this.legalHoldItemRepository = legalHoldItemRepository;
        this.auditService = auditService;
        this.systemSettingService = systemSettingService;
    }

    @Scheduled(cron = "${kms.recycle-bin.cron:0 0 3 * * *}")
    public void runScheduled() {
        try {
            purgeExpired(null);
        } catch (Exception e) {
            log.error("Scheduled recycle-bin purge failed", e);
        }
    }

    @Transactional
    public Map<String, Object> purgeExpired(Integer overrideDays) {
        int retentionDays = overrideDays != null ? overrideDays : Integer.parseInt(
                systemSettingService.getSettingValue("recycle-bin.retention-days", "30"));
        OffsetDateTime cutoff = OffsetDateTime.now().minusDays(Math.max(1, retentionDays));

        List<Document> expired = documentRepository
                .findByIsDeletedTrueAndDeletedAtBeforeAndPurgedAtIsNull(cutoff);

        long purged = 0;
        long skippedOnHold = 0;

        for (Document doc : expired) {
            if (legalHoldItemRepository.existsByIdDocumentId(doc.getId())) {
                skippedOnHold++;
                continue;
            }
            removeBinaryIfUnreferenced(doc);

            auditService.recordAuditLog("system", null, "DOCUMENT_PURGED", "DOCUMENT",
                    doc.getId().toString(), null,
                    "{\"reason\":\"RECYCLE_BIN_RETENTION_EXPIRED\",\"retentionDays\":" + retentionDays + "}");
            documentRepository.delete(doc);
            purged++;
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("purged", purged);
        summary.put("skippedOnLegalHold", skippedOnHold);
        summary.put("retentionDays", retentionDays);
        log.info("Recycle-bin purge complete: {}", summary);
        return summary;
    }

    /** Deletes the stored binary when no other version still references it (dedup-aware). */
    private void removeBinaryIfUnreferenced(Document doc) {
        DocumentVersion version = doc.getCurrentVersion();
        if (version == null || version.getStorageObject() == null) {
            return;
        }
        StorageObject so = version.getStorageObject();
        if (documentVersionRepository.countByStorageObject_Id(so.getId()) > 1) {
            return;
        }
        try {
            Path path = storageService.resolve(so.getStoragePath());
            if (path != null) {
                Files.deleteIfExists(path);
            }
        } catch (Exception e) {
            log.warn("Could not delete binary {} during purge: {}", so.getStoragePath(), e.getMessage());
        }
        storageObjectRepository.delete(so);
    }
}
