-- ============================================================
-- PRODUCTION DB RESET SCRIPT
-- Run this in Supabase SQL Editor (Production project)
-- This will:
--   1. Delete all codings, error reports, skips
--   2. Reset all anomalies to 'pending' (uncoded)
--   3. Delete all users and create single admin: Fedai/1234
-- ============================================================

-- Step 1: Clear all coding data
DELETE FROM anomaly_codings;
DELETE FROM error_reports;
DELETE FROM doctor_skips;

-- Step 2: Reset all anomalies to initial state
UPDATE anomalies SET
  status = 'pending',
  assigned_to = NULL,
  assigned_at = NULL,
  coded_by = NULL,
  coded_at = NULL;

-- Step 3: Delete ALL existing users
DELETE FROM users;

-- Step 4: Create the single admin user (Fedai / 1234)
INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at)
VALUES (
  gen_random_uuid(),
  'Fedai',
  '$2b$10$3QyPpgbdQTv8XHyrIjvRs..yb7obMQvr2ZdcvOSgT7k2f8bzqfILO',
  'Fedai',
  'admin',
  true,
  NOW()
);

-- Verify results
SELECT 'Users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'Anomalies (total)', COUNT(*) FROM anomalies
UNION ALL
SELECT 'Anomalies (pending)', COUNT(*) FROM anomalies WHERE status = 'pending'
UNION ALL
SELECT 'Codings', COUNT(*) FROM anomaly_codings
UNION ALL
SELECT 'Error Reports', COUNT(*) FROM error_reports
UNION ALL
SELECT 'Skips', COUNT(*) FROM doctor_skips;
