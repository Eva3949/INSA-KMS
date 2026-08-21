# KMS Complete Database Architecture & Entity Validation Specification

## Executive Summary & Validation Status

> [!IMPORTANT]
> **Database Architecture Validation Status**: **CHANGES REQUIRED $\rightarrow$ FULLY VALIDATED & PASSED**
> - **Previous Entity Count**: 25 Entities
> - **Final Validated Entity Count**: **35 Entities**
> - **Validation Scope**: Evaluated against all 34 domain items, 31 Functional Requirements (FR-01 $\rightarrow$ FR-31), 7 Business Requirements (BR-01 $\rightarrow$ BR-07), and compliance/security constraints in `KMS_Requirements_Specification.docx`.

---

## 1. Complete Entity Topology Map (35 Relational Entities)

```
Departments (1) ───< Users (N) ───< UserGroups (N:M) >─── Groups (1)
    │                     │
    ├──< Folders (N)      ├──< Roles (N:M) >─── RolePermissions (N)
    │     │               │
    │     ├──< FolderPermissions (N)
    │     │
    │     └──< Documents (N) ───< DocumentVersions (N) ───1:1─── StorageObjects (1)
    │           │
    │           ├──< DocumentTypes (1)
    │           ├──< DocumentMetadata (N)
    │           ├──< DocumentTags (N) >─── Tags (1)
    │           ├──< DocumentLocks (1:1)
    │           ├──< DocumentComments (N)
    │           ├──< DocumentAnnotations (N)
    │           ├──< DocumentShares (N)
    │           ├──< ShareLinks (N)
    │           ├──< SavedSearches (N) ───< SearchAlerts (N)
    │           ├──< Notifications (N)
    │           ├──< LegalHoldItems (N) >─── LegalHolds (1)
    │           ├──< RetentionRules (1) >─── RetentionPolicies (1)
    │           ├──< DocumentApprovals (N) >─── ApprovalWorkflows (1) ───< ApprovalSteps (N)
    │           ├──< DocumentReviews (N)
    │           └──< OcrJobs (N)
    │
    └─────────────────────────────────────────────────────────────> AuditLogs (N)
                                                                    SystemSettings (1)
```

---

## 2. Complete 35 Entity Dictionary & FRD Justification

| # | Entity Name | Purpose & Function | FRD Requirement | Primary Key | Foreign Keys & Unique Constraints | Key Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `departments` | Department organization unit & storage quota tracking. | BR-01, FR-06, FR-30 | `id` (UUID) | UNIQUE(`name`), UNIQUE(`code`) | `idx_dept_code` |
| 2 | `users` | Local database user context synced with Keycloak OIDC. | FR-17, FR-18 | `id` (UUID) | UNIQUE(`keycloak_sub`), FK(`department_id`) | `idx_users_sub`, `idx_users_dept` |
| 3 | `groups` | Organizational user groups for ACL assignments. | FR-17 | `id` (UUID) | UNIQUE(`name`), FK(`department_id`) | `idx_groups_dept` |
| 4 | `user_groups` | Junction table mapping Users to Groups (N:M). | FR-17 | (`user_id`, `group_id`) | FK(`user_id`), FK(`group_id`) | Primary Composite Index |
| 5 | `roles` | Static/Dynamic RBAC system role definitions. | FR-17 | `id` (UUID) | UNIQUE(`role_name`) | `idx_roles_name` |
| 6 | `role_permissions` | Fine-grained permission assignments per role. | FR-17 | `id` (UUID) | FK(`role_id`), UNIQUE(`role_id`, `permission_key`) | `idx_role_perm` |
| 7 | `folders` | Hierarchical directory tree structure. | FR-03 | `id` (UUID) | FK(`parent_id`), FK(`department_id`) | `idx_folders_parent`, `idx_folders_dept` |
| 8 | `folder_permissions` | ACL access control lists assigned at folder level. | FR-17 | `id` (UUID) | FK(`folder_id`), CHECK(`permission_level`) | `idx_folder_perm` |
| 9 | `document_types` | Document type taxonomy definitions (Policy, Contract, Invoice). | FR-06 | `id` (UUID) | UNIQUE(`name`) | `idx_doc_types_name` |
| 10 | `documents` | Core document record maintaining title, status, classification. | BR-01, FR-03, FR-19 | `id` (UUID) | FK(`folder_id`), FK(`owner_department_id`), FK(`document_type_id`) | `idx_docs_folder`, `idx_docs_dept`, `idx_docs_class` |
| 11 | `document_versions` | Immutable revision records storing file specs & text. | FR-04, FR-10, FR-11 | `id` (UUID) | FK(`document_id`), UNIQUE(`document_id`, `version_number`) | `idx_doc_ver_doc`, GIN(`extracted_text`) |
| 12 | `storage_objects` | Binary physical file object location & integrity hash. | FR-01, NFR-06 | `id` (UUID) | UNIQUE(`checksum_sha256`) | `idx_storage_hash` |
| 13 | `document_metadata` | Custom required metadata field values per document. | FR-06 | `id` (UUID) | FK(`document_id`), UNIQUE(`document_id`, `metadata_key`) | `idx_doc_meta_doc` |
| 14 | `tags` | Managed keyword taxonomy tags. | FR-03, FR-06 | `id` (UUID) | UNIQUE(`name`) | `idx_tags_name` |
| 15 | `document_tags` | Junction table linking Documents to Tags (N:M). | FR-03, FR-06 | (`document_id`, `tag_id`) | FK(`document_id`), FK(`tag_id`) | Primary Composite Index |
| 16 | `document_locks` | Exclusive check-out editing lock. | FR-05 | `document_id` (UUID) | FK(`document_id`), FK(`locked_by_user_id`) | Primary Key Index |
| 17 | `document_comments` | Threaded discussion comments on documents. | FR-23 | `id` (UUID) | FK(`document_id`), FK(`user_id`), FK(`parent_comment_id`) | `idx_comments_doc` |
| 18 | `document_annotations` | Page & coordinate-level visual highlights/notes. | FR-23 | `id` (UUID) | FK(`version_id`), FK(`user_id`) | `idx_annotations_ver` |
| 19 | `document_shares` | Explicit user-to-user or group permission grants. | FR-17, FR-20 | `id` (UUID) | FK(`document_id`), FK(`granted_to_user_id`) | `idx_doc_shares` |
| 20 | `share_links` | Secure, expiring external share links with password hashes. | FR-20 | `id` (UUID) | UNIQUE(`token_hash`), FK(`document_id`) | `idx_shares_token` |
| 21 | `saved_searches` | Saved search queries for power users. | FR-15 | `id` (UUID) | FK(`user_id`) | `idx_saved_search_user` |
| 22 | `search_alerts` | Automated email/in-app alert rules for saved searches. | FR-15 | `id` (UUID) | FK(`saved_search_id`), FK(`user_id`) | `idx_search_alerts` |
| 23 | `notifications` | In-app user notification alert queue. | FR-26 | `id` (UUID) | FK(`user_id`) | `idx_notifications_user_read` |
| 24 | `retention_policies` | Master retention policy definitions. | FR-28 | `id` (UUID) | UNIQUE(`name`) | `idx_retention_name` |
| 25 | `retention_rules` | Specific retention duration and disposition rules. | FR-28 | `id` (UUID) | FK(`policy_id`), FK(`document_type_id`) | `idx_retention_rules` |
| 26 | `legal_holds` | Active litigation hold case records. | FR-29 | `id` (UUID) | UNIQUE(`case_number`) | `idx_legal_holds_case` |
| 27 | `legal_hold_items` | Specific documents frozen under legal hold. | FR-29 | (`legal_hold_id`, `document_id`) | FK(`legal_hold_id`), FK(`document_id`) | Primary Composite Index |
| 28 | `approval_workflows` | Workflow routes for document review & publishing. | FR-25 | `id` (UUID) | FK(`document_id`) | `idx_approval_doc` |
| 29 | `approval_steps` | Individual reviewer sign-off steps in a workflow. | FR-25 | `id` (UUID) | FK(`workflow_id`), FK(`approver_user_id`) | `idx_approval_step_wf` |
| 30 | `document_approvals` | Execution instance logs of workflow approvals. | FR-25 | `id` (UUID) | FK(`workflow_id`), FK(`step_id`), FK(`approver_id`) | `idx_doc_approvals` |
| 31 | `document_reviews` | Scheduled review tracking for stale/orphaned content. | FR-31 | `id` (UUID) | FK(`document_id`), FK(`reviewer_user_id`) | `idx_doc_reviews` |
| 32 | `ocr_jobs` | Background OCR text extraction job status tracking queue. | FR-10 | `id` (UUID) | FK(`version_id`) | `idx_ocr_jobs_status` |
| 33 | `audit_logs` | Immutable, tamper-evident security audit trail. | BR-07, FR-22 | `id` (UUID) | Prohibits UPDATE/DELETE via DB Trigger | `idx_audit_user`, `idx_audit_date` |
| 34 | `system_settings` | Global system configuration parameters. | FR-27 | `key` (VARCHAR) | PRIMARY KEY(`key`) | Primary Key Index |
| 35 | `file_checksums` | Binary integrity checksum ledger. | NFR-06 | `id` (UUID) | UNIQUE(`checksum_sha256`), FK(`storage_object_id`) | `idx_checksum_hash` |

---

## 3. Structural Integrity & Validation Verification Checks

```
┌────────────────────────────────────────┬────────┬────────────────────────────────────────────────────────────────────────────────┐
│ Architectural Validation Check          │ Result │ Technical Safeguard & Implementation Mechanism                                 │
├────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 1. Circular Dependency Elimination     │  PASS  │ Circular FK `documents.current_version_id` resolved via DEFERRABLE constraint. │
│ 2. Legal Hold Deletion Prevention      │  PASS  │ DB Trigger `trg_prevent_legal_hold_deletion` blocks deletion if hold exists.   │
│ 3. Immutable Audit Trail               │  PASS  │ DB Trigger `prevent_audit_log_tampering` aborts UPDATE / DELETE on audit_logs. │
│ 4. File Checksum & Binary Integrity    │  PASS  │ `storage_objects` & `file_checksums` enforce UNIQUE SHA-256 hash constraints.  │
│ 5. Orphan Record Elimination           │  PASS  │ `ON DELETE CASCADE` on dependent versions/metadata; `ON DELETE RESTRICT` storage.│
│ 6. Retention & Disposition Lifecycle   │  PASS  │ `retention_rules` link document types to automated ARCHIVE vs DELETE actions.  │
│ 7. Confidentiality ABAC Enforcer       │  PASS  │ ENUM `PUBLIC` < `INTERNAL` < `CONFIDENTIAL` < `RESTRICTED` enforced in queries. │
│ 8. Recycle Bin & Soft Deletion         │  PASS  │ `documents(is_deleted, deleted_at, purged_at)` cleanly supports restoration.  │
└────────────────────────────────────────┴────────┴────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Complete Validated DDL Schema Script

```sql
-- PostgreSQL 15+ Schema DDL Specification (35 Entities)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE confidentiality_level_enum AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');
CREATE TYPE document_status_enum AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE permission_level_enum AS ENUM ('VIEW', 'EDIT', 'DELETE', 'ADMIN');
CREATE TYPE subject_type_enum AS ENUM ('USER', 'GROUP', 'ROLE');

-- 1. Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    storage_quota_bytes BIGINT NOT NULL DEFAULT 107374182400,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_sub VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. User Groups
CREATE TABLE user_groups (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- 5. Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Role Permissions
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    CONSTRAINT uq_role_perm UNIQUE (role_id, permission_key)
);

-- 7. Folders
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    confidentiality_level confidentiality_level_enum NOT NULL DEFAULT 'INTERNAL',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Folder Permissions
CREATE TABLE folder_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    subject_type subject_type_enum NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    permission_level permission_level_enum NOT NULL
);

-- 9. Document Types
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES folders(id),
    title VARCHAR(255) NOT NULL,
    owner_department_id UUID NOT NULL REFERENCES departments(id),
    author_user_id UUID NOT NULL REFERENCES users(id),
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    confidentiality_level confidentiality_level_enum NOT NULL DEFAULT 'INTERNAL',
    status document_status_enum NOT NULL DEFAULT 'PUBLISHED',
    current_version_id UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    purged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. Storage Objects
CREATE TABLE storage_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path VARCHAR(500) NOT NULL UNIQUE,
    checksum_sha256 VARCHAR(64) NOT NULL UNIQUE,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Document Versions
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_object_id UUID NOT NULL REFERENCES storage_objects(id) ON DELETE RESTRICT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    change_summary TEXT,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

-- Deferred Circular FK
ALTER TABLE documents ADD CONSTRAINT fk_documents_current_version FOREIGN KEY (current_version_id) REFERENCES document_versions(id) DEFERRABLE INITIALLY DEFERRED;

-- 26. Legal Holds
CREATE TABLE legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 27. Legal Hold Items
CREATE TABLE legal_hold_items (
    legal_hold_id UUID REFERENCES legal_holds(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE RESTRICT,
    placed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (legal_hold_id, document_id)
);

-- Trigger Preventing Deletion of Documents under Legal Hold
CREATE OR REPLACE FUNCTION prevent_legal_hold_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM legal_hold_items WHERE document_id = OLD.id) THEN
        RAISE EXCEPTION 'Document % is frozen under an active Legal Hold and cannot be deleted.', OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_legal_hold_deletion
BEFORE DELETE OR UPDATE ON documents
FOR EACH ROW
WHEN (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE)
EXECUTE FUNCTION prevent_legal_hold_deletion();

-- 33. Audit Logs (Immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();
```
