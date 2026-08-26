package com.enterprise.kms.repository;

import com.enterprise.kms.entity.ApprovalTemplateStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApprovalTemplateStepRepository extends JpaRepository<ApprovalTemplateStep, UUID> {
    List<ApprovalTemplateStep> findByTemplate_IdOrderByStepNumberAsc(UUID templateId);
    void deleteByTemplate_Id(UUID templateId);
}
