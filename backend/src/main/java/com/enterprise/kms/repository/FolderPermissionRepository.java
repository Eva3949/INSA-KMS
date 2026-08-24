package com.enterprise.kms.repository;

import com.enterprise.kms.entity.FolderPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FolderPermissionRepository extends JpaRepository<FolderPermission, UUID> {
    List<FolderPermission> findByFolderId(UUID folderId);
    Optional<FolderPermission> findByFolderIdAndSubjectTypeAndSubjectId(UUID folderId, String subjectType, String subjectId);

    /**
     * Highest permission level granted to any of the given subjects on the folder itself
     * or any of its ancestors (FR-17 inheritance).
     */
    @Query(value = "WITH RECURSIVE chain AS ( " +
                   "  SELECT f.id, f.parent_id FROM folders f WHERE f.id = :folderId " +
                   "  UNION ALL " +
                   "  SELECT p.id, p.parent_id FROM folders p JOIN chain c ON p.id = c.parent_id " +
                   ") " +
                   "SELECT fp.permission_level::text FROM folder_permissions fp " +
                   "JOIN chain ch ON fp.folder_id = ch.id " +
                   "WHERE (fp.subject_type = 'USER'  AND fp.subject_id = :userId) " +
                   "   OR (fp.subject_type = 'ROLE'  AND fp.subject_id = ANY(string_to_array(:roles, ','))) " +
                   "   OR (fp.subject_type = 'GROUP' AND fp.subject_id = ANY(string_to_array(:groups, ','))) ",
           nativeQuery = true)
    List<String> findEffectiveLevels(@Param("folderId") UUID folderId,
                                     @Param("userId") String userId,
                                     @Param("roles") String roles,
                                     @Param("groups") String groups);
}
