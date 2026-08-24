package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.util.UUID;

/**
 * FR-17 folder-level ACL entry. Grants a permission level to a USER, GROUP or ROLE.
 * subject_id holds a user UUID, a group UUID, or a role name (e.g. ROLE_VIEWER).
 */
@Entity
@Table(name = "folder_permissions")
public class FolderPermission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", nullable = false)
    @JsonIgnore
    private Folder folder;

    // subject_type / permission_level are PostgreSQL ENUM columns, so values must be
    // cast on write — Hibernate would otherwise bind them as VARCHAR and Postgres rejects it.
    @Column(name = "subject_type", nullable = false)
    @ColumnTransformer(write = "?::subject_type_enum")
    private String subjectType;

    @Column(name = "subject_id", nullable = false, length = 100)
    private String subjectId;

    @Column(name = "permission_level", nullable = false)
    @ColumnTransformer(write = "?::permission_level_enum")
    private String permissionLevel;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Folder getFolder() { return folder; }
    public void setFolder(Folder folder) { this.folder = folder; }

    public String getSubjectType() { return subjectType; }
    public void setSubjectType(String subjectType) { this.subjectType = subjectType; }

    public String getSubjectId() { return subjectId; }
    public void setSubjectId(String subjectId) { this.subjectId = subjectId; }

    public String getPermissionLevel() { return permissionLevel; }
    public void setPermissionLevel(String permissionLevel) { this.permissionLevel = permissionLevel; }
}
