-- Migration v4: Add error_type and description columns to error_reports
-- Run this in Supabase SQL Editor (BOTH staging and production)

-- Add error_type column (spelling or logic)
ALTER TABLE error_reports ADD COLUMN IF NOT EXISTS error_type VARCHAR(20) NOT NULL DEFAULT 'spelling';

-- Add description column (for logic errors)
ALTER TABLE error_reports ADD COLUMN IF NOT EXISTS description TEXT;

-- Make field_name and corrected_text nullable (not needed for logic errors)
ALTER TABLE error_reports ALTER COLUMN field_name DROP NOT NULL;
ALTER TABLE error_reports ALTER COLUMN corrected_text DROP NOT NULL;

-- Verify
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'error_reports' ORDER BY ordinal_position;
