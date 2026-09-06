package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_transfer_assets")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KnowledgeTransferAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private KnowledgeTransferCase transferCase;

    @Column(name = "asset_type", nullable = false, length = 50)
    private String assetType; // LAPTOP, DESKTOP, MOBILE_DEVICE, STORAGE_MEDIA, SECURITY_TOKEN, ACCESS_CARD, OTHER

    @Column(name = "asset_identifier", nullable = false, length = 100)
    private String assetIdentifier; // Serial Number, Asset Tag, Barcode

    @Column(nullable = false, length = 255)
    private String description;

    @Column(name = "condition_status", length = 50)
    private String conditionStatus = "GOOD"; // EXCELLENT, GOOD, FAIR, DAMAGED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_holder_id")
    private User currentHolder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    @Column(name = "handover_date")
    private LocalDate handoverDate;

    @Column(name = "return_status", nullable = false, length = 50)
    private String returnStatus = "PENDING"; // PENDING, RETURNED_TO_IT, HANDED_TO_SUCCESSOR, RETAINED

    @Column(name = "acceptance_status", nullable = false, length = 50)
    private String acceptanceStatus = "PENDING"; // PENDING, ACCEPTED, REJECTED

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

    public String getAssetType() { return assetType; }
    public void setAssetType(String assetType) { this.assetType = assetType; }

    public String getAssetIdentifier() { return assetIdentifier; }
    public void setAssetIdentifier(String assetIdentifier) { this.assetIdentifier = assetIdentifier; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getConditionStatus() { return conditionStatus; }
    public void setConditionStatus(String conditionStatus) { this.conditionStatus = conditionStatus; }

    public User getCurrentHolder() { return currentHolder; }
    public void setCurrentHolder(User currentHolder) { this.currentHolder = currentHolder; }

    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }

    public LocalDate getHandoverDate() { return handoverDate; }
    public void setHandoverDate(LocalDate handoverDate) { this.handoverDate = handoverDate; }

    public String getReturnStatus() { return returnStatus; }
    public void setReturnStatus(String returnStatus) { this.returnStatus = returnStatus; }

    public String getAcceptanceStatus() { return acceptanceStatus; }
    public void setAcceptanceStatus(String acceptanceStatus) { this.acceptanceStatus = acceptanceStatus; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
