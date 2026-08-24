package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "documents")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @Column(nullable = false, length = 255)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_department_id", nullable = false)
    private Department ownerDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_type_id", nullable = false)
    private DocumentType documentType;

    @Column(name = "confidentiality_level", nullable = false)
    @org.hibernate.annotations.ColumnTransformer(write = "?::confidentiality_level_enum")
    private String confidentialityLevel = "INTERNAL";

    @Column(nullable = false)
    @org.hibernate.annotations.ColumnTransformer(write = "?::document_status_enum")
    private String status = "PUBLISHED";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_version_id")
    private DocumentVersion currentVersion;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "purged_at")
    private OffsetDateTime purgedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Folder getFolder() { return folder; }
    public void setFolder(Folder folder) { this.folder = folder; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Department getOwnerDepartment() { return ownerDepartment; }
    public void setOwnerDepartment(Department ownerDepartment) { this.ownerDepartment = ownerDepartment; }

    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }

    public DocumentType getDocumentType() { return documentType; }
    public void setDocumentType(DocumentType documentType) { this.documentType = documentType; }

    public String getConfidentialityLevel() { return confidentialityLevel; }
    public void setConfidentialityLevel(String confidentialityLevel) { this.confidentialityLevel = confidentialityLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public DocumentVersion getCurrentVersion() { return currentVersion; }
    public void setCurrentVersion(DocumentVersion currentVersion) { this.currentVersion = currentVersion; }

    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; }

    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }

    public OffsetDateTime getPurgedAt() { return purgedAt; }
    public void setPurgedAt(OffsetDateTime purgedAt) { this.purgedAt = purgedAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
