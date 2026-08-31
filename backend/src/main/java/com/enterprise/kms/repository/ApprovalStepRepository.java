package com.enterprise.kms.repository;

import com.enterprise.kms.entity.ApprovalStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, UUID> {
    List<ApprovalStep> findByWorkflowIdOrderByStepNumberAsc(UUID workflowId);
    List<ApprovalStep> findByWorkflowIdAndStatus(UUID workflowId, String status);
    List<ApprovalStep> findByStatus(String status);
}