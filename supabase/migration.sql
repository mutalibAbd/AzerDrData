-- ============================================================
-- AzerDr ICD-10 Coding Platform - Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users (doctors + admin)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'doctor',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ICD-10 Hierarchy: Rubrikas → Bashliqlar → Diaqnozlar → Qeydler
CREATE TABLE IF NOT EXISTS icd_rubrikas (
  id INT PRIMARY KEY,
  code VARCHAR(200) NOT NULL,
  name VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS icd_bashliqlar (
  id INT PRIMARY KEY,
  rubrika_id INT NOT NULL REFERENCES icd_rubrikas(id) ON DELETE CASCADE,
  code VARCHAR(200) NOT NULL,
  name VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS icd_diaqnozlar (
  id INT PRIMARY KEY,
  bashliq_id INT NOT NULL REFERENCES icd_bashliqlar(id) ON DELETE CASCADE,
  code VARCHAR(200) NOT NULL,
  name VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS icd_qeydler (
  id INT PRIMARY KEY,
  diaqnoz_id INT NOT NULL REFERENCES icd_diaqnozlar(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL
);

-- Patient Anomalies
CREATE TABLE IF NOT EXISTS anomalies (
  id INT PRIMARY KEY,
  report_id VARCHAR(20) NOT NULL,
  patient_id VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  diagnosis TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  coded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  coded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_assigned_to ON anomalies(assigned_to);
CREATE INDEX IF NOT EXISTS idx_anomalies_patient_id ON anomalies(patient_id);

-- Anomaly Codings (doctor's ICD selections)
CREATE TABLE IF NOT EXISTS anomaly_codings (
  id SERIAL PRIMARY KEY,
  anomaly_id INT UNIQUE NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rubrika_code TEXT NOT NULL,
  rubrika_name VARCHAR(200) NOT NULL,
  bashliq_code TEXT NOT NULL,
  bashliq_name VARCHAR(200) NOT NULL,
  diaqnoz_code TEXT NOT NULL,
  diaqnoz_name VARCHAR(200) NOT NULL,
  icd_qeyd_name VARCHAR(300),
  qeyd TEXT,
  patient_id TEXT,
  report_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Error Reports
CREATE TABLE IF NOT EXISTS error_reports (
  id SERIAL PRIMARY KEY,
  anomaly_id INT NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_name VARCHAR(20) NOT NULL,
  corrected_text TEXT NOT NULL,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Doctor Skips (prevents same anomaly showing twice to same doctor)
CREATE TABLE IF NOT EXISTS doctor_skips (
  id SERIAL PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anomaly_id INT NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  skipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, anomaly_id)
);

-- ============================================================
-- PERMISSIONS (allow REST API access with anon/authenticated keys)
-- ============================================================

GRANT ALL ON TABLE users TO anon, authenticated;
GRANT ALL ON TABLE icd_rubrikas TO anon, authenticated;
GRANT ALL ON TABLE icd_bashliqlar TO anon, authenticated;
GRANT ALL ON TABLE icd_diaqnozlar TO anon, authenticated;
GRANT ALL ON TABLE icd_qeydler TO anon, authenticated;
GRANT ALL ON TABLE anomalies TO anon, authenticated;
GRANT ALL ON TABLE anomaly_codings TO anon, authenticated;
GRANT ALL ON TABLE error_reports TO anon, authenticated;
GRANT ALL ON TABLE doctor_skips TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- FUNCTIONS (for atomic operations via RPC)
-- ============================================================

-- Get next unassigned anomaly with SKIP LOCKED concurrency
CREATE OR REPLACE FUNCTION get_next_anomaly(p_doctor_id UUID)
RETURNS TABLE (
  id INT,
  report_id VARCHAR,
  patient_id VARCHAR,
  date TEXT,
  diagnosis TEXT,
  explanation TEXT
) AS $$
BEGIN
  -- Release any current assignment for this doctor
  UPDATE anomalies a
  SET status = 'pending', assigned_to = NULL, assigned_at = NULL
  WHERE a.assigned_to = p_doctor_id AND a.status = 'in_progress';

  -- Release stale assignments (older than 30 minutes)
  UPDATE anomalies a
  SET status = 'pending', assigned_to = NULL, assigned_at = NULL
  WHERE a.status = 'in_progress' AND a.assigned_at < NOW() - INTERVAL '30 minutes';

  -- Atomically pick and assign one anomaly using SKIP LOCKED
  RETURN QUERY
  UPDATE anomalies a2
  SET status = 'in_progress', assigned_to = p_doctor_id, assigned_at = NOW()
  WHERE a2.id = (
    SELECT a3.id FROM anomalies a3
    WHERE a3.status = 'pending'
      AND a3.id NOT IN (
        SELECT ds.anomaly_id FROM doctor_skips ds WHERE ds.doctor_id = p_doctor_id
      )
    ORDER BY a3.id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING a2.id, a2.report_id, a2.patient_id,
            a2.date::TEXT, a2.diagnosis, a2.explanation;
END;
$$ LANGUAGE plpgsql;

-- Skip an anomaly (release + track)
CREATE OR REPLACE FUNCTION skip_anomaly(p_anomaly_id INT, p_doctor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE anomalies
  SET status = 'pending', assigned_to = NULL, assigned_at = NULL
  WHERE id = p_anomaly_id AND assigned_to = p_doctor_id AND status = 'in_progress';
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected > 0 THEN
    INSERT INTO doctor_skips (doctor_id, anomaly_id)
    VALUES (p_doctor_id, p_anomaly_id)
    ON CONFLICT (doctor_id, anomaly_id) DO NOTHING;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Save anomaly coding atomically
CREATE OR REPLACE FUNCTION save_coding(
  p_anomaly_id INT,
  p_doctor_id UUID,
  p_rubrika_code TEXT,
  p_rubrika_name TEXT,
  p_bashliq_code TEXT,
  p_bashliq_name TEXT,
  p_diaqnoz_code TEXT,
  p_diaqnoz_name TEXT,
  p_icd_qeyd_name TEXT DEFAULT NULL,
  p_qeyd TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  affected INT;
  v_patient_id TEXT;
  v_report_id TEXT;
BEGIN
  -- Get patient_id and report_id from anomaly
  SELECT patient_id, report_id INTO v_patient_id, v_report_id
  FROM anomalies WHERE id = p_anomaly_id;

  -- Mark anomaly as completed
  UPDATE anomalies
  SET status = 'completed', coded_by = p_doctor_id, coded_at = NOW()
  WHERE id = p_anomaly_id AND assigned_to = p_doctor_id AND status = 'in_progress';
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 THEN
    RETURN FALSE;
  END IF;

  -- Insert the coding record with patient_id and report_id
  INSERT INTO anomaly_codings (
    anomaly_id, doctor_id,
    rubrika_code, rubrika_name,
    bashliq_code, bashliq_name,
    diaqnoz_code, diaqnoz_name,
    icd_qeyd_name, qeyd,
    patient_id, report_id
  ) VALUES (
    p_anomaly_id, p_doctor_id,
    p_rubrika_code, p_rubrika_name,
    p_bashliq_code, p_bashliq_name,
    p_diaqnoz_code, p_diaqnoz_name,
    p_icd_qeyd_name, p_qeyd,
    v_patient_id, v_report_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_doctor_id UUID)
RETURNS TABLE (
  total BIGINT,
  coded BIGINT,
  pending BIGINT,
  in_progress BIGINT,
  my_codings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT AS coded,
    COUNT(*) FILTER (WHERE a.status = 'pending')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE a.status = 'in_progress')::BIGINT AS in_progress,
    (SELECT COUNT(*) FROM anomaly_codings c WHERE c.doctor_id = p_doctor_id)::BIGINT AS my_codings
  FROM anomalies a;
END;
$$ LANGUAGE plpgsql;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_next_anomaly(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION skip_anomaly(INT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_coding(INT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO anon, authenticated;
