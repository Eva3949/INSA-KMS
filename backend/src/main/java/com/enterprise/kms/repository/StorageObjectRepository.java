package com.enterprise.kms.repository;

import com.enterprise.kms.entity.StorageObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StorageObjectRepository extends JpaRepository<StorageObject, UUID> {
    Optional<StorageObject> findByChecksumSha256(String checksumSha256);

    @Query("SELECT COALESCE(SUM(s.fileSizeBytes), 0) FROM StorageObject s")
    long sumTotalBytes();

    @Query(value = "SELECT checksum_sha256, COUNT(*) AS copies, COALESCE(SUM(file_size_bytes), 0) AS wasted_bytes " +
                   "FROM storage_objects GROUP BY checksum_sha256 HAVING COUNT(*) > 1 " +
                   "ORDER BY copies DESC, wasted_bytes DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findDuplicateChecksums(@Param("limit") int limit);

    @Query(value = "SELECT so.id, so.storage_path, so.file_size_bytes, so.checksum_sha256, so.created_at, " +
                   "(SELECT COUNT(*) FROM document_versions dv WHERE dv.storage_object_id = so.id) AS version_references, " +
                   "CASE WHEN EXISTS (SELECT 1 FROM document_versions dv WHERE dv.storage_object_id = so.id) THEN false ELSE true END AS is_orphaned " +
                   "FROM storage_objects so " +
                   "ORDER BY so.created_at DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findRecentObjectsWithUsage(@Param("limit") int limit);

    @Query(value = "SELECT COUNT(*) FROM storage_objects so " +
                   "WHERE NOT EXISTS (SELECT 1 FROM document_versions dv WHERE dv.storage_object_id = so.id)",
           nativeQuery = true)
    long countOrphanedObjects();
}
