package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeTransferAssetRepository extends JpaRepository<KnowledgeTransferAsset, UUID> {
    List<KnowledgeTransferAsset> findByTransferCaseIdOrderByCreatedAtDesc(UUID caseId);
    long countByTransferCaseId(UUID caseId);
    long countByTransferCaseIdAndReturnStatusNot(UUID caseId, String returnStatus);
    long countByTransferCaseIdAndAcceptanceStatus(UUID caseId, String acceptanceStatus);
}
