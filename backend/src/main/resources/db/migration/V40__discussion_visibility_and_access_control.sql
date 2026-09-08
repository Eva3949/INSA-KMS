-- ============================================================================
-- V40: Discussion Visibility and Access Control Subsystem
-- ============================================================================

-- 1. Add visibility column to discussion_topics (PUBLIC, INTERNAL, CONFIDENTIAL)
ALTER TABLE discussion_topics 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC';

-- 2. Create join table for INTERNAL discussions (allowed departments)
CREATE TABLE IF NOT EXISTS discussion_allowed_departments (
    discussion_id UUID NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (discussion_id, department_id)
);

-- 3. Create join table for CONFIDENTIAL discussions (selected user participants)
CREATE TABLE IF NOT EXISTS discussion_participants (
    discussion_id UUID NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (discussion_id, user_id)
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_disc_topics_visibility ON discussion_topics(visibility);
CREATE INDEX IF NOT EXISTS idx_disc_allowed_depts_dept ON discussion_allowed_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_disc_participants_user ON discussion_participants(user_id);
