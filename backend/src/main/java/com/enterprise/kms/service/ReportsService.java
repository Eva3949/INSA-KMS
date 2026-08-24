package com.enterprise.kms.service;

import com.enterprise.kms.repository.AuditLogRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.SearchQueryLogRepository;
import com.enterprise.kms.repository.StorageObjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportsService {
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final SearchQueryLogRepository searchQueryLogRepository;
    private final StorageObjectRepository storageObjectRepository;

    public ReportsService(DocumentRepository documentRepository,
                          AuditLogRepository auditLogRepository,
                          SearchQueryLogRepository searchQueryLogRepository,
                          StorageObjectRepository storageObjectRepository) {
        this.documentRepository = documentRepository;
        this.auditLogRepository = auditLogRepository;
        this.searchQueryLogRepository = searchQueryLogRepository;
        this.storageObjectRepository = storageObjectRepository;
    }

    public List<Map<String, Object>> getStorageGrowth(int months) {
        OffsetDateTime since = OffsetDateTime.now().minusMonths(Math.max(1, months));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : documentRepository.aggregateGrowthByMonth(since)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", r[0]);
            row.put("documentCount", ((Number) r[1]).longValue());
            row.put("bytesAdded", ((Number) r[2]).longValue());
            rows.add(row);
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveUsers(int days, int limit) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(Math.max(1, days));
        List<Object[]> data = auditLogRepository.findActiveUsers(since, limit);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : data) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("userId", r[0]);
            row.put("userEmail", r[1]);
            row.put("actionCount", ((Number) r[2]).longValue());
            row.put("lastActivity", r[3]);
            rows.add(row);
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTopSearches(int days, int limit) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(Math.max(1, days));
        List<Object[]> data = searchQueryLogRepository.findTopSearches(since, limit);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : data) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("query", r[0]);
            row.put("hitCount", ((Number) r[1]).longValue());
            row.put("lastSearched", r[2]);
            rows.add(row);
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStaleOrOrphanedContent(int days, int limit) {
        OffsetDateTime cutoff = OffsetDateTime.now().minusDays(Math.max(1, days));
        List<Object[]> data = documentRepository.findStaleOrOrphanedContent(cutoff, limit);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : data) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("documentId", r[0]);
            row.put("title", r[1]);
            row.put("owner", r[2]);
            row.put("ownerEmail", r[3]);
            row.put("department", r[4]);
            row.put("confidentialityLevel", r[5]);
            row.put("orphaned", !((Boolean) r[6]));
            row.put("lastActivity", r[7]);
            rows.add(row);
        }
        return rows;
    }
}
