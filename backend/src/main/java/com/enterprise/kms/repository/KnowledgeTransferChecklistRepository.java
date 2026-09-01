package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeTransferChecklistRepository extends JpaRepository<KnowledgeTransferChecklist, UUID> {
    List<KnowledgeTransferChecklist> findByTransferCaseIdOrderByOrderIndexAscCreatedAtAsc(UUID caseId);
    long countByTransferCaseIdAndStatusNot(UUID caseId, String status);
    long countByTransferCaseIdAndStatusIn(UUID caseId, List<String> statuses);
}
