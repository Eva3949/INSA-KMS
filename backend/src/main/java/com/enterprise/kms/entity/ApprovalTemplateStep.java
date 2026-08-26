package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.UUID;

/** FR-25: ordered approver step inside a workflow template. */
@Entity
@Table(name = "approval_template_steps")
public class ApprovalTemplateStep {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @JsonIgnore
    private ApprovalWorkflowTemplate template;

    @Column(name = "step_number", nullable = false)
    private Integer stepNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_user_id", nullable = false)
    @JsonIgnore
    private User approver;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public ApprovalWorkflowTemplate getTemplate() { return template; }
    public void setTemplate(ApprovalWorkflowTemplate template) { this.template = template; }

    public Integer getStepNumber() { return stepNumber; }
    public void setStepNumber(Integer stepNumber) { this.stepNumber = stepNumber; }

    public User getApprover() { return approver; }
    public void setApprover(User approver) { this.approver = approver; }
}
