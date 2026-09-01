package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeTransferSubmissionRepository extends JpaRepository<KnowledgeTransferSubmission, UUID> {
    List<KnowledgeTransferSubmission> findByTransferCaseIdOrderByCreatedAtDesc(UUID caseId);
    List<KnowledgeTransferSubmission> findBySubmittedByIdOrderByCreatedAtDesc(UUID submittedById);
    long countByTransferCaseIdAndValidationStatus(UUID caseId, String validationStatus);
}
