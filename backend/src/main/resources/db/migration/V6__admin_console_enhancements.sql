-- V4__admin_console_enhancements.sql
-- Admin console completion:
--   FR-28: retention schedules with document type, duration and disposition action
--   FR-29: legal hold lifecycle (active/released) + document scoping via existing legal_hold_items
--   FR-30: search query logs to power top-search reporting
--   FR-27: default system configuration settings

-- 1. Legal hold lifecycle (release support)
ALTER TABLE legal_holds ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE legal_holds ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;

-- 2. Retention schedule fields on policies
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES document_types(id);
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS retention_days INTEGER;
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS disposition_action VARCHAR(20) NOT NULL DEFAULT 'ARCHIVE';
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_retention_policy_doc_type ON retention_policies(document_type_id);
CREATE INDEX IF NOT EXISTS idx_retention_policy_active ON retention_policies(is_active);

-- 3. Search analytics for usage reports (FR-30 top searches)
CREATE TABLE IF NOT EXISTS search_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text VARCHAR(500) NOT NULL,
    user_id VARCHAR(100),
    result_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON search_query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_text ON search_query_logs(query_text);

-- 4. Legal hold index for fast hold checks during disposition runs
CREATE INDEX IF NOT EXISTS idx_legal_holds_active ON legal_holds(is_active);

-- 5. System settings store (FR-27 system configuration)
--    The SystemSetting entity was mapped before this table existed in the schema,
--    so it is created here (idempotently) prior to seeding defaults.
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
    ('recycle-bin.retention-days', '30', 'Days a deleted document remains recoverable before permanent purge')
ON CONFLICT (setting_key) DO NOTHING;
