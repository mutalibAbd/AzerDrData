-- ============================================================
-- AzerDr ICD-11 Migration v5
-- Run FIRST on STAGING, verify, THEN on production.
-- 
-- Steps:
--   1. Create icd11_coding_sessions table
--   2. Create new RPC functions
--   3. Update existing RPC functions
--   4. Grant permissions
--   5. RESET: clear old ICD-10 codings + reset anomaly statuses
-- ============================================================

-- ============================================================
-- 1. NEW TABLE: icd11_coding_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS icd11_coding_sessions (
  id          SERIAL PRIMARY KEY,
  anomaly_id  INT UNIQUE NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- JSON array of {icd11_code, icd11_title, entity_id, source}
  codes       JSONB NOT NULL DEFAULT '[]',
  qeyd        TEXT,
  patient_id  TEXT,   -- denormalized for fast querying
  report_id   TEXT,   -- denormalized for fast querying
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icd11_sessions_doctor  ON icd11_coding_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_icd11_sessions_anomaly ON icd11_coding_sessions(anomaly_id);

-- ============================================================
-- 2. NEW RPC: save_coding_icd11
-- ============================================================

CREATE OR REPLACE FUNCTION save_coding_icd11(
  p_anomaly_id  INT,
  p_doctor_id   UUID,
  p_codes       JSONB,       -- [{icd11_code, icd11_title, entity_id, source}]
  p_qeyd        TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  affected     INT;
  v_patient_id TEXT;
  v_report_id  TEXT;
BEGIN
  -- Get patient_id and report_id
  SELECT patient_id, report_id INTO v_patient_id, v_report_id
  FROM anomalies WHERE id = p_anomaly_id;

  -- Mark anomaly as completed (only if currently assigned to this doctor)
  UPDATE anomalies
  SET status     = 'completed',
      coded_by   = p_doctor_id,
      coded_at   = NOW()
  WHERE id = p_anomaly_id
    AND assigned_to = p_doctor_id
    AND status = 'in_progress';
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 THEN
    RETURN FALSE;
  END IF;

  -- Insert or replace coding session
  INSERT INTO icd11_coding_sessions
    (anomaly_id, doctor_id, codes, qeyd, patient_id, report_id)
  VALUES
    (p_anomaly_id, p_doctor_id, p_codes, p_qeyd, v_patient_id, v_report_id)
  ON CONFLICT (anomaly_id) DO UPDATE
    SET codes      = EXCLUDED.codes,
        qeyd       = EXCLUDED.qeyd,
        doctor_id  = EXCLUDED.doctor_id,
        created_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. NEW RPC: get_my_codings_icd11
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_codings_icd11(
  p_doctor_id UUID,
  p_offset    INT DEFAULT 0,
  p_limit     INT DEFAULT 5
) RETURNS TABLE (
  anomaly_id  INT,
  patient_id  TEXT,
  report_id   TEXT,
  date        TEXT,
  codes       JSONB,
  qeyd        TEXT,
  created_at  TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.anomaly_id,
    s.patient_id,
    s.report_id,
    a.date::TEXT,
    s.codes,
    s.qeyd,
    s.created_at
  FROM icd11_coding_sessions s
  JOIN anomalies a ON a.id = s.anomaly_id
  WHERE s.doctor_id = p_doctor_id
  ORDER BY s.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. UPDATE: get_dashboard_stats (count from icd11_coding_sessions)
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_doctor_id UUID)
RETURNS TABLE (
  total        BIGINT,
  coded        BIGINT,
  pending      BIGINT,
  in_progress  BIGINT,
  my_codings   BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT AS coded,
    COUNT(*) FILTER (WHERE a.status = 'pending')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE a.status = 'in_progress')::BIGINT AS in_progress,
    (SELECT COUNT(*) FROM icd11_coding_sessions s WHERE s.doctor_id = p_doctor_id)::BIGINT AS my_codings
  FROM anomalies a;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. GRANTS
-- ============================================================

GRANT ALL ON TABLE icd11_coding_sessions TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE icd11_coding_sessions_id_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_coding_icd11(INT, UUID, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_codings_icd11(UUID, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO anon, authenticated;

-- ============================================================
-- 6. RESET: clear ICD-10 codings + reset anomaly statuses
--    ⚠️  WARNING: This deletes all existing coding data!
--    Only run after doctors have stopped working.
-- ============================================================

-- Clear old ICD-10 coding records
DELETE FROM anomaly_codings;

-- Reset all anomaly statuses to pending
UPDATE anomalies
SET status      = 'pending',
    assigned_to = NULL,
    assigned_at = NULL,
    coded_by    = NULL,
    coded_at    = NULL;

-- Clear doctor skips (optional - allows doctors to re-see skipped anomalies)
-- DELETE FROM doctor_skips;
