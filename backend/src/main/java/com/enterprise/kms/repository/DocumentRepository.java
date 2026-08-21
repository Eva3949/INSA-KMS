package com.enterprise.kms.repository;

import com.enterprise.kms.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    Page<Document> findByIsDeletedFalse(Pageable pageable);
    Page<Document> findByIsDeletedTrue(Pageable pageable);
    List<Document> findByAuthorIdAndIsDeletedFalse(UUID authorUserId);
    List<Document> findByOwnerDepartmentIdAndIsDeletedFalse(UUID departmentId);

    @Query(value = "SELECT d.* FROM documents d " +
                   "JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "WHERE d.is_deleted = false AND " +
                   "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || dv.file_name || ' ' || d.title) @@ plainto_tsquery('english', :query)",
           countQuery = "SELECT count(d.id) FROM documents d " +
                        "JOIN document_versions dv ON d.current_version_id = dv.id " +
                        "WHERE d.is_deleted = false AND " +
                        "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || dv.file_name || ' ' || d.title) @@ plainto_tsquery('english', :query)",
           nativeQuery = true)
    Page<Document> fullTextSearch(@Param("query") String query, Pageable pageable);
}
