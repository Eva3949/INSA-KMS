package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeTransferPlanRepository extends JpaRepository<KnowledgeTransferPlan, UUID> {
    Optional<KnowledgeTransferPlan> findByTransferCaseId(UUID caseId);
}
