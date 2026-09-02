-- V25__ensure_notification_columns_exist.sql
-- Ensure event metadata, entity linkage, and deep linking columns exist on notifications table

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_event_target ON notifications(user_id, event_type, target_id, created_at DESC);
