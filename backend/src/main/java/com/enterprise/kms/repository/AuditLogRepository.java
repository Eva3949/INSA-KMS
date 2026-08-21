package com.enterprise.kms.repository;

import com.enterprise.kms.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {
    Page<AuditLogEntity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<AuditLogEntity> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
}
