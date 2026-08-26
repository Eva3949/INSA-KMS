package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentApprovalRepository extends JpaRepository<DocumentApproval, UUID> {
    Optional<DocumentApproval> findByWorkflowIdAndStepId(UUID workflowId, UUID stepId);
    List<DocumentApproval> findByWorkflowIdOrderByDecidedAtAsc(UUID workflowId);
    Optional<DocumentApproval> findByApproverIdAndWorkflowIdAndDecision(UUID approverId, UUID workflowId, String decision);
}