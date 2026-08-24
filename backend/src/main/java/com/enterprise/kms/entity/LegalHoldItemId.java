package com.enterprise.kms.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class LegalHoldItemId implements Serializable {
    @Column(name = "legal_hold_id")
    private UUID legalHoldId;

    @Column(name = "document_id")
    private UUID documentId;

    public LegalHoldItemId() {}

    public LegalHoldItemId(UUID legalHoldId, UUID documentId) {
        this.legalHoldId = legalHoldId;
        this.documentId = documentId;
    }

    public UUID getLegalHoldId() { return legalHoldId; }
    public void setLegalHoldId(UUID legalHoldId) { this.legalHoldId = legalHoldId; }

    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID documentId) { this.documentId = documentId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        LegalHoldItemId that = (LegalHoldItemId) o;
        return Objects.equals(legalHoldId, that.legalHoldId) && Objects.equals(documentId, that.documentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(legalHoldId, documentId);
    }
}
