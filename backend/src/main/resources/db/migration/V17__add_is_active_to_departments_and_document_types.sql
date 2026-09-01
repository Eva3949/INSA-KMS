-- Flyway Migration V17__add_is_active_to_departments_and_document_types.sql
-- Adds active/inactive status flag to departments and document_types for administrative lifecycle management

ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE departments SET is_active = TRUE WHERE is_active IS NULL;
UPDATE document_types SET is_active = TRUE WHERE is_active IS NULL;
