package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * FR-17 document-level ACL entry. Grants a permission level to a USER, GROUP or ROLE.
 * subject_id holds a user UUID, a group UUID, or a role name (e.g. ROLE_VIEWER).
 */
@Entity
@Table(name = "document_permissions")
public class DocumentPermission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnore
    private Document document;

    @Column(name = "subject_type", nullable = false)
    @ColumnTransformer(write = "?::subject_type_enum")
    private String subjectType;

    @Column(name = "subject_id", nullable = false, length = 100)
    private String subjectId;

    @Column(name = "permission_level", nullable = false)
    @ColumnTransformer(write = "?::permission_level_enum")
    private String permissionLevel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }

    public String getSubjectType() { return subjectType; }
    public void setSubjectType(String subjectType) { this.subjectType = subjectType; }

    public String getSubjectId() { return subjectId; }
    public void setSubjectId(String subjectId) { this.subjectId = subjectId; }

    public String getPermissionLevel() { return permissionLevel; }
    public void setPermissionLevel(String permissionLevel) { this.permissionLevel = permissionLevel; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
