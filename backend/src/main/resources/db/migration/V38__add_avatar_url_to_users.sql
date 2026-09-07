-- V38: Add avatar_url column to users table for persistent user profile photos
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
