-- V13__approval_workflow_columns.sql
-- Add missing columns to approval_workflows and approval_steps
-- that are defined in the JPA entities but were never migrated.

ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES approval_workflow_templates(id);
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;
