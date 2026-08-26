package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentCommentRepository extends JpaRepository<DocumentComment, UUID> {
    List<DocumentComment> findByDocumentIdOrderByCreatedAtAsc(UUID documentId);
    List<DocumentComment> findByDocumentIdAndParentCommentIsNullOrderByCreatedAtAsc(UUID documentId);
    long countByDocumentId(UUID documentId);
}
