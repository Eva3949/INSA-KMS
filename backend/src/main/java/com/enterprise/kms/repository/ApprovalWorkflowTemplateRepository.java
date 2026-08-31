package com.enterprise.kms.repository;

import com.enterprise.kms.entity.ApprovalWorkflowTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApprovalWorkflowTemplateRepository extends JpaRepository<ApprovalWorkflowTemplate, UUID> {
    Optional<ApprovalWorkflowTemplate> findByName(String name);
    List<ApprovalWorkflowTemplate> findByIsActiveTrue();
}
