package com.enterprise.kms.repository;

import com.enterprise.kms.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {
    Page<AuditLogEntity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<AuditLogEntity> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
    List<AuditLogEntity> findByCreatedAtAfterOrderByCreatedAtAsc(OffsetDateTime since);
    List<AuditLogEntity> findByOrderByCreatedAtAsc();

    @Query(value = "SELECT user_id, MAX(user_email) AS user_email, COUNT(*) AS action_count, MAX(created_at) AS last_activity " +
                   "FROM audit_logs WHERE created_at >= :since " +
                   "GROUP BY user_id ORDER BY action_count DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findActiveUsers(@Param("since") OffsetDateTime since, @Param("limit") int limit);
}
