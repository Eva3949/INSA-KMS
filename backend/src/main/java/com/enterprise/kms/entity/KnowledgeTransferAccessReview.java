package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_transfer_access_reviews")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KnowledgeTransferAccessReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private KnowledgeTransferCase transferCase;

    @Column(name = "system_or_resource", nullable = false, length = 150)
    private String systemOrResource;

    @Column(name = "current_access_level", nullable = false, length = 100)
    private String currentAccessLevel;

    @Column(name = "revoke_required", nullable = false)
    private Boolean revokeRequired = true;

    @Column(name = "revocation_status", nullable = false, length = 50)
    private String revocationStatus = "PENDING"; // PENDING, REVOKED, NOT_APPLICABLE

    @Column(name = "successor_access_required", length = 100)
    private String successorAccessRequired;

    @Column(name = "provisioning_status", nullable = false, length = 50)
    private String provisioningStatus = "PENDING"; // PENDING, PROVISIONED, REJECTED, NOT_REQUIRED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

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

    public String getSystemOrResource() { return systemOrResource; }
    public void setSystemOrResource(String systemOrResource) { this.systemOrResource = systemOrResource; }

    public String getCurrentAccessLevel() { return currentAccessLevel; }
    public void setCurrentAccessLevel(String currentAccessLevel) { this.currentAccessLevel = currentAccessLevel; }

    public Boolean getRevokeRequired() { return revokeRequired; }
    public void setRevokeRequired(Boolean revokeRequired) { this.revokeRequired = revokeRequired; }

    public String getRevocationStatus() { return revocationStatus; }
    public void setRevocationStatus(String revocationStatus) { this.revocationStatus = revocationStatus; }

    public String getSuccessorAccessRequired() { return successorAccessRequired; }
    public void setSuccessorAccessRequired(String successorAccessRequired) { this.successorAccessRequired = successorAccessRequired; }

    public String getProvisioningStatus() { return provisioningStatus; }
    public void setProvisioningStatus(String provisioningStatus) { this.provisioningStatus = provisioningStatus; }

    public User getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(User reviewedBy) { this.reviewedBy = reviewedBy; }

    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
