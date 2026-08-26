-- Add submitted_by column to approval_workflows to track who submitted each workflow
ALTER TABLE approval_workflows
    ADD COLUMN submitted_by UUID REFERENCES users(id);

CREATE INDEX idx_approval_workflows_submitted_by ON approval_workflows(submitted_by);
