-- V2__user_management_enhancements.sql
-- Add is_active and role_name fields to users table for User Management CRUD compliance

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_name VARCHAR(50) DEFAULT 'ROLE_VIEWER';
