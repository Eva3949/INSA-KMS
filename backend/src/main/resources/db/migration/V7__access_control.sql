-- V7__access_control.sql
-- FR-16 / FR-17 / FR-19 enforcement support:
--   * document_permissions: per-document ACL for USER / GROUP / ROLE subjects
--     (mirrors the existing folder_permissions model — document_shares only
--      supported user/group grants and had no role support)
--   * uniqueness + lookup indexes so ACL checks and permission-aware search are fast

CREATE TABLE IF NOT EXISTS document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    subject_type subject_type_enum NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    permission_level permission_level_enum NOT NULL DEFAULT 'VIEW',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_perm
    ON document_permissions(document_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_document_perm_subject
    ON document_permissions(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_document_perm_document
    ON document_permissions(document_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_folder_perm
    ON folder_permissions(folder_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_folder_perm_subject
    ON folder_permissions(subject_type, subject_id);

-- Folder tree walking for inherited permissions
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

