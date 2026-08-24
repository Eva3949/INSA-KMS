package com.enterprise.kms.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "legal_hold_items")
public class LegalHoldItem {
    @EmbeddedId
    private LegalHoldItemId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("legalHoldId")
    @JoinColumn(name = "legal_hold_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private LegalHold legalHold;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("documentId")
    @JoinColumn(name = "document_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Document document;

    @Column(name = "placed_at", nullable = false, updatable = false)
    private OffsetDateTime placedAt = OffsetDateTime.now();

    public LegalHoldItemId getId() { return id; }
    public void setId(LegalHoldItemId id) { this.id = id; }

    public LegalHold getLegalHold() { return legalHold; }
    public void setLegalHold(LegalHold legalHold) { this.legalHold = legalHold; }

    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }

    public OffsetDateTime getPlacedAt() { return placedAt; }
    public void setPlacedAt(OffsetDateTime placedAt) { this.placedAt = placedAt; }
}
