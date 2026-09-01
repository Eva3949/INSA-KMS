package com.enterprise.kms.service;

import com.enterprise.kms.entity.AuditLogEntity;
import com.enterprise.kms.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLogEntity recordAuditLog(String userId, String userEmail, String action, String resourceType, String resourceId, String ipAddress, String detailsJson) {
        AuditLogEntity log = new AuditLogEntity();
        log.setUserId(userId != null ? userId : "anonymous");
        log.setUserEmail(userEmail);
        log.setAction(action != null ? action : "UNKNOWN");
        log.setResourceType(resourceType != null ? resourceType : "SYSTEM");
        log.setResourceId(resourceId != null ? resourceId : "N/A");
        log.setIpAddress(ipAddress);
        log.setDetailsJson(detailsJson);
        return auditLogRepository.save(log);
    }

    public Page<AuditLogEntity> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }
}
