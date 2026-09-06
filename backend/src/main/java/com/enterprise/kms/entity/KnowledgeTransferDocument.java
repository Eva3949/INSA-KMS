package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_transfer_documents",
       uniqueConstraints = {@UniqueConstraint(name = "uk_kt_case_doc", columnNames = {"case_id", "document_id"})})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KnowledgeTransferDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private KnowledgeTransferCase transferCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "transfer_action", nullable = false, length = 50)
    private String transferAction = "REFERENCE"; // REFERENCE, HANDOVER, REASSIGN_AUTHOR

    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, ACCEPTED, TRANSFERRED

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public KnowledgeTransferCase getTransferCase() { return transferCase; }
    public void setTransferCase(KnowledgeTransferCase transferCase) { this.transferCase = transferCase; }

    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }

    public String getTransferAction() { return transferAction; }
    public void setTransferAction(String transferAction) { this.transferAction = transferAction; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
