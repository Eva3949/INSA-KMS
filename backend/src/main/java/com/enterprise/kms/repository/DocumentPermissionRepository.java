package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, UUID> {
    List<DocumentPermission> findByDocumentId(UUID documentId);
    Optional<DocumentPermission> findByDocumentIdAndSubjectTypeAndSubjectId(UUID documentId, String subjectType, String subjectId);

    @Query(value = "SELECT dp.permission_level::text FROM document_permissions dp " +
                   "WHERE dp.document_id = :documentId AND ( " +
                   "     (dp.subject_type = 'USER'  AND dp.subject_id = :userId) " +
                   "  OR (dp.subject_type = 'ROLE'  AND dp.subject_id = ANY(string_to_array(:roles, ','))) " +
                   "  OR (dp.subject_type = 'GROUP' AND dp.subject_id = ANY(string_to_array(:groups, ','))) )",
           nativeQuery = true)
    List<String> findEffectiveLevels(@Param("documentId") UUID documentId,
                                     @Param("userId") String userId,
                                     @Param("roles") String roles,
                                     @Param("groups") String groups);
}
