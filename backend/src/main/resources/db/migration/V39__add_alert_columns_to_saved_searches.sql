-- V39: Add alert configuration columns to saved_searches table
ALTER TABLE saved_searches
    ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS alert_frequency VARCHAR(20) DEFAULT 'DAILY',
    ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMP WITH TIME ZONE;
