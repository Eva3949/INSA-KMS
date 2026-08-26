-- V12__restore_render_database.sql
-- Consolidated, idempotent schema restore for features whose migration files
-- were removed from the repository while (partially) applied to the database.
-- Safe on every environment: IF NOT EXISTS / ON CONFLICT DO NOTHING throughout.
--
--   FR-29  legal hold lifecycle columns        (was V6 content)
--   FR-28  retention schedule columns          (was V6 content)
--   FR-30  search query analytics              (was V6 content)
--   FR-27  system settings store + defaults    (was V6/V8/V9 content)
--   FR-17  document-level ACL                  (was V7 content)
--   FR-06  custom metadata field definitions   (was V9 content)
--   FR-25  approval workflow templates         (was V9 content)
--   Sec.7  SIEM webhook configuration keys     (was V8 content)
--   NFR-06 backup bookkeeping keys             (was V9 content)

-- ---------- 1. Legal hold lifecycle (FR-29) ----------
ALTER TABLE legal_holds ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE legal_holds ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_legal_holds_active ON legal_holds(is_active);

-- ---------- 2. Retention schedules (FR-28) ----------
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES document_types(id);
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS retention_days INTEGER;
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS disposition_action VARCHAR(20) NOT NULL DEFAULT 'ARCHIVE';
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_retention_policy_doc_type ON retention_policies(document_type_id);
CREATE INDEX IF NOT EXISTS idx_retention_policy_active ON retention_policies(is_active);

-- ---------- 3. Search analytics (FR-30 top searches) ----------
CREATE TABLE IF NOT EXISTS search_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text VARCHAR(500) NOT NULL,
    user_id VARCHAR(100),
    result_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON search_query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_text ON search_query_logs(query_text);

-- ---------- 4. System settings store (FR-27) ----------
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('keycloak.server.url', 'http://localhost:8080', 'Keycloak OIDC issuer base URL'),
    ('keycloak.realm', 'kms-realm', 'Keycloak realm name used by the KMS'),
    ('keycloak.client.id', 'kms-frontend-client', 'OIDC public client ID used by the web frontend'),
    ('upload.max-file-size-mb', '500', 'Maximum multipart file upload size in MB'),
    ('retention.default-days', '2555', 'Default retention window in days when no policy applies (7 years)'),
    ('recycle-bin.retention-days', '30', 'Days a deleted document remains recoverable before permanent purge'),
    ('siem.webhook-url', '', 'Webhook URL receiving audit events for central SIEM monitoring. Empty = disabled.'),
    ('siem.last-forwarded-at', '', 'Watermark of the last successfully forwarded audit event.'),
    ('backup.last-run-at', '', 'Timestamp of the last database backup taken with scripts/backup-database.ps1.'),
    ('backup.location', './backups', 'Directory where database backups are written.')
ON CONFLICT (setting_key) DO NOTHING;

-- ---------- 5. Document-level ACL (FR-17) ----------
CREATE TABLE IF NOT EXISTS document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    subject_type subject_type_enum NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    permission_level permission_level_enum NOT NULL DEFAULT 'VIEW',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_perm ON document_permissions(document_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_document_perm_subject ON document_permissions(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_document_perm_document ON document_permissions(document_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_folder_perm ON folder_permissions(folder_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_folder_perm_subject ON folder_permissions(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- ---------- 6. Custom metadata field definitions (FR-06) ----------
CREATE TABLE IF NOT EXISTS document_type_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    data_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_type_field UNIQUE (document_type_id, field_key),
    CONSTRAINT ck_doc_type_field_type CHECK (data_type IN ('TEXT','NUMBER','DATE','BOOLEAN'))
);
CREATE INDEX IF NOT EXISTS idx_doc_type_fields ON document_type_fields(document_type_id);

-- ---------- 7. Approval workflow templates (FR-25) ----------
CREATE TABLE IF NOT EXISTS approval_workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    document_type_id UUID REFERENCES document_types(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_template_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES approval_workflow_templates(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    approver_user_id UUID NOT NULL REFERENCES users(id),
    CONSTRAINT uq_template_step UNIQUE (template_id, step_number)
);
CREATE INDEX IF NOT EXISTS idx_approval_template_steps ON approval_template_steps(template_id);
