-- Flyway Migration V3__seed_default_data.sql
-- Seed initial default departments and test users into PostgreSQL

-- 1. Insert Default Departments
INSERT INTO departments (id, name, code, storage_quota_bytes)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'IT Security', 'ITSEC', 107374182400),
    ('22222222-2222-2222-2222-222222222222', 'Legal & Compliance', 'LEGAL', 107374182400),
    ('33333333-3333-3333-3333-333333333333', 'Content Management', 'CONTENT', 107374182400),
    ('44444444-4444-4444-4444-444444444444', 'General', 'GEN', 107374182400)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Default Test Users
INSERT INTO users (id, keycloak_sub, username, email, department_id, is_active, role_name)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'sub-admin-001', 'admin', 'admin@kms.internal', '11111111-1111-1111-1111-111111111111', TRUE, 'ROLE_ADMIN'),
    ('b2222222-2222-2222-2222-222222222222', 'sub-owner-002', 'owner', 'owner@kms.internal', '33333333-3333-3333-3333-333333333333', TRUE, 'ROLE_CONTENT_OWNER'),
    ('c3333333-3333-3333-3333-333333333333', 'sub-contrib-003', 'contributor', 'user@kms.internal', '44444444-4444-4444-4444-444444444444', TRUE, 'ROLE_CONTRIBUTOR'),
    ('d4444444-4444-4444-4444-444444444444', 'sub-viewer-004', 'viewer', 'viewer@kms.internal', '44444444-4444-4444-4444-444444444444', TRUE, 'ROLE_VIEWER'),
    ('e5555555-5555-5555-5555-555555555555', 'sub-compl-005', 'compliance', 'compliance@kms.internal', '22222222-2222-2222-2222-222222222222', TRUE, 'ROLE_COMPLIANCE_OFFICER'),
    ('f6666666-6666-6666-6666-666666666666', 'sub-sec-006', 'security', 'security@kms.internal', '11111111-1111-1111-1111-111111111111', TRUE, 'ROLE_IT_SECURITY')
ON CONFLICT (keycloak_sub) DO NOTHING;
