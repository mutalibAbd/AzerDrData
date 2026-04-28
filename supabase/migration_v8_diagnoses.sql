-- migration_v8_diagnoses.sql
-- Creates the diagnoses table: one diagnosis per anomaly (UPSERT-safe)
-- Apply via Supabase Dashboard → SQL Editor

-- 1. Create diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_id           INT NOT NULL UNIQUE REFERENCES anomalies(id) ON DELETE CASCADE,
  icd11_foundation_uri VARCHAR(255) NOT NULL DEFAULT '',
  icd11_mms_code       VARCHAR(50)  NOT NULL,
  diagnosis_title      VARCHAR(500) NOT NULL,
  is_postcoordinated   BOOLEAN NOT NULL DEFAULT FALSE,
  cluster_details_json JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_diagnoses_anomaly_id ON diagnoses(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_mms_code ON diagnoses(icd11_mms_code);

-- 3. Permissions
GRANT ALL ON TABLE diagnoses TO anon, authenticated;

-- 4. Optional: RLS (disabled for now, consistent with other tables)
-- ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
