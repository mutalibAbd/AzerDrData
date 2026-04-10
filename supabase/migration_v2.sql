-- =========================================================
-- Migration V2: Fix VARCHAR(50) + Add patient_id/report_id
-- Run this in Supabase SQL Editor
-- =========================================================

-- 1. Fix VARCHAR(50) columns that are too small for Azerbaijani ICD text
ALTER TABLE anomaly_codings ALTER COLUMN rubrika_code TYPE TEXT;
ALTER TABLE anomaly_codings ALTER COLUMN bashliq_code TYPE TEXT;
ALTER TABLE anomaly_codings ALTER COLUMN diaqnoz_code TYPE TEXT;

-- 2. Add patient_id and report_id columns
ALTER TABLE anomaly_codings ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE anomaly_codings ADD COLUMN IF NOT EXISTS report_id TEXT;

-- 3. Backfill existing codings with patient_id and report_id from anomalies
UPDATE anomaly_codings ac
SET patient_id = a.patient_id, report_id = a.report_id
FROM anomalies a
WHERE ac.anomaly_id = a.id AND (ac.patient_id IS NULL OR ac.report_id IS NULL);

-- 4. Update save_coding function to auto-populate patient_id and report_id
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
