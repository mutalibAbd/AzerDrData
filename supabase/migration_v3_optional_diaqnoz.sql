-- Migration: Make diaqnoz_code and diaqnoz_name optional in anomaly_codings
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Remove NOT NULL constraint from diaqnoz columns
ALTER TABLE anomaly_codings ALTER COLUMN diaqnoz_code DROP NOT NULL;
ALTER TABLE anomaly_codings ALTER COLUMN diaqnoz_name DROP NOT NULL;

-- 2. Update save_coding function to accept optional diaqnoz parameters
CREATE OR REPLACE FUNCTION save_coding(
  p_anomaly_id INT,
  p_doctor_id UUID,
  p_rubrika_code TEXT,
  p_rubrika_name TEXT,
  p_bashliq_code TEXT,
  p_bashliq_name TEXT,
  p_diaqnoz_code TEXT DEFAULT NULL,
  p_diaqnoz_name TEXT DEFAULT NULL,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant execute permission (function signature changed)
GRANT EXECUTE ON FUNCTION save_coding(INT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
