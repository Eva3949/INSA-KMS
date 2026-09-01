package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_transfer_plans")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KnowledgeTransferPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false, unique = true)
    private KnowledgeTransferCase transferCase;

    @Column(columnDefinition = "TEXT")
    private String responsibilities;

    @Column(name = "projects_handled", columnDefinition = "TEXT")
    private String projectsHandled;

    @Column(name = "systems_maintained", columnDefinition = "TEXT")
    private String systemsMaintained;

    @Column(name = "business_processes", columnDefinition = "TEXT")
    private String businessProcesses;

    @Column(name = "critical_knowledge_areas", columnDefinition = "TEXT")
    private String criticalKnowledgeAreas;

    @Column(columnDefinition = "TEXT")
    private String risks;

    @Column(name = "required_actions", columnDefinition = "TEXT")
    private String requiredActions;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public KnowledgeTransferCase getTransferCase() { return transferCase; }
    public void setTransferCase(KnowledgeTransferCase transferCase) { this.transferCase = transferCase; }

    public String getResponsibilities() { return responsibilities; }
    public void setResponsibilities(String responsibilities) { this.responsibilities = responsibilities; }

    public String getProjectsHandled() { return projectsHandled; }
    public void setProjectsHandled(String projectsHandled) { this.projectsHandled = projectsHandled; }

    public String getSystemsMaintained() { return systemsMaintained; }
    public void setSystemsMaintained(String systemsMaintained) { this.systemsMaintained = systemsMaintained; }

    public String getBusinessProcesses() { return businessProcesses; }
    public void setBusinessProcesses(String businessProcesses) { this.businessProcesses = businessProcesses; }

    public String getCriticalKnowledgeAreas() { return criticalKnowledgeAreas; }
    public void setCriticalKnowledgeAreas(String criticalKnowledgeAreas) { this.criticalKnowledgeAreas = criticalKnowledgeAreas; }

    public String getRisks() { return risks; }
    public void setRisks(String risks) { this.risks = risks; }

    public String getRequiredActions() { return requiredActions; }
    public void setRequiredActions(String requiredActions) { this.requiredActions = requiredActions; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
