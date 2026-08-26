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
    /**
     * Filtered audit query (FR-22). Any filter may be null. Sorting is fixed to
     * newest-first because Spring Data does not append ORDER BY to native queries.
     */
    @Query(value = "SELECT * FROM audit_logs al WHERE " +
                   "(:action IS NULL OR al.action = :action) AND " +
                   "(:userText IS NULL OR al.user_id ILIKE '%' || :userText || '%' OR al.user_email ILIKE '%' || :userText || '%') AND " +
                   "(CAST(:fromTs AS timestamptz) IS NULL OR al.created_at >= :fromTs) AND " +
                   "(CAST(:toTs AS timestamptz) IS NULL OR al.created_at <= :toTs) " +
                   "ORDER BY al.created_at DESC",
           countQuery = "SELECT COUNT(*) FROM audit_logs al WHERE " +
                   "(:action IS NULL OR al.action = :action) AND " +
                   "(:userText IS NULL OR al.user_id ILIKE '%' || :userText || '%' OR al.user_email ILIKE '%' || :userText || '%') AND " +
                   "(CAST(:fromTs AS timestamptz) IS NULL OR al.created_at >= :fromTs) AND " +
                   "(CAST(:toTs AS timestamptz) IS NULL OR al.created_at <= :toTs)",
           nativeQuery = true)
    Page<AuditLogEntity> findFiltered(@Param("action") String action,
                                      @Param("userText") String userText,
                                      @Param("fromTs") OffsetDateTime fromTs,
                                      @Param("toTs") OffsetDateTime toTs,
                                      Pageable pageable);
}
