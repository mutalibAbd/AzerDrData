-- migration_v3.sql — Add parent_id to icd_qeydler for hierarchical qeydlər
-- Run this in Supabase SQL Editor

-- 1. Add parent_id column (self-referencing)
ALTER TABLE icd_qeydler ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES icd_qeydler(id) ON DELETE CASCADE;

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_qeydler_parent ON icd_qeydler(parent_id) WHERE parent_id IS NOT NULL;
