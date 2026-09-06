package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeTransferDocumentRepository extends JpaRepository<KnowledgeTransferDocument, UUID> {
    List<KnowledgeTransferDocument> findByTransferCaseIdOrderByCreatedAtDesc(UUID caseId);
    Optional<KnowledgeTransferDocument> findByTransferCaseIdAndDocumentId(UUID caseId, UUID documentId);
    boolean existsByTransferCaseIdAndDocumentId(UUID caseId, UUID documentId);
    void deleteByTransferCaseIdAndDocumentId(UUID caseId, UUID documentId);
    long countByTransferCaseId(UUID caseId);
}
