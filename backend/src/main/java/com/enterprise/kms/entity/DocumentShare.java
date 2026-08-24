package com.enterprise.kms.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_shares")
public class DocumentShare {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_to_user_id")
    private User grantedToUser;

    @Column(name = "permission_level", nullable = false)
    @org.hibernate.annotations.ColumnTransformer(write = "?::permission_level_enum")
    private String permissionLevel = "VIEW";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }

    public User getGrantedToUser() { return grantedToUser; }
    public void setGrantedToUser(User grantedToUser) { this.grantedToUser = grantedToUser; }

    public String getPermissionLevel() { return permissionLevel; }
    public void setPermissionLevel(String permissionLevel) { this.permissionLevel = permissionLevel; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
