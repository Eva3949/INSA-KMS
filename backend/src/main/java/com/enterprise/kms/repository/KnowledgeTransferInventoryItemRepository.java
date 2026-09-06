package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferInventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeTransferInventoryItemRepository extends JpaRepository<KnowledgeTransferInventoryItem, UUID> {
    List<KnowledgeTransferInventoryItem> findByTransferCaseIdOrderByOrderIndexAscCreatedAtAsc(UUID caseId);
    List<KnowledgeTransferInventoryItem> findByTransferCaseIdAndCategoryOrderByOrderIndexAscCreatedAtAsc(UUID caseId, String category);
    long countByTransferCaseId(UUID caseId);
    long countByTransferCaseIdAndStatus(UUID caseId, String status);
}
