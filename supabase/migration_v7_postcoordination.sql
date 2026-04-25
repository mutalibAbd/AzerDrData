-- ============================================================
-- AzerDr ICD-11 Migration v7 — Postcoordination Support
-- Run FIRST on STAGING, verify, THEN on production.
--
-- Changes:
--   1. Add postcoordination JSONB column to icd11_codes
--   2. Update save_coding_icd11 RPC to persist postcoordination
--   3. Update get_my_codings_icd11 RPC to return postcoordination
-- ============================================================

-- ============================================================
-- 1. ADD COLUMN
-- ============================================================

ALTER TABLE icd11_codes ADD COLUMN IF NOT EXISTS postcoordination JSONB;

-- ============================================================
-- 2. UPDATE RPC: save_coding_icd11
--    p_codes format:
--    [{icd11_code, icd11_title, entity_id, source, post_coordination}]
--    post_coordination is JSONB array of:
--    [{axisName, required, icd11Code, icd11Title, entityId}]
-- ============================================================

CREATE OR REPLACE FUNCTION save_coding_icd11(
  p_anomaly_id  INT,
  p_doctor_id   UUID,
  p_codes       JSONB,
  p_qeyd        TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  affected INT;
  code_row JSONB;
BEGIN
  UPDATE anomalies
  SET status   = 'completed',
      coded_by = p_doctor_id,
      coded_at = NOW()
  WHERE id          = p_anomaly_id
    AND assigned_to = p_doctor_id
    AND status      = 'in_progress';
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO icd11_sessions (anomaly_id, doctor_id, qeyd, coded_at)
  VALUES (p_anomaly_id, p_doctor_id, p_qeyd, NOW())
  ON CONFLICT (anomaly_id) DO UPDATE
    SET doctor_id = EXCLUDED.doctor_id,
        qeyd      = EXCLUDED.qeyd,
        coded_at  = NOW();

  DELETE FROM icd11_codes WHERE anomaly_id = p_anomaly_id;

  FOR code_row IN SELECT * FROM jsonb_array_elements(p_codes)
  LOOP
    INSERT INTO icd11_codes
      (anomaly_id, doctor_id, icd11_code, icd11_title, entity_id, source, postcoordination, coded_at)
    VALUES (
      p_anomaly_id,
      p_doctor_id,
      code_row->>'icd11_code',
      COALESCE(code_row->>'icd11_title', ''),
      code_row->>'entity_id',
      COALESCE(code_row->>'source', 'tree'),
      code_row->'post_coordination',   -- JSONB (not ->>'')
      NOW()
    )
    ON CONFLICT (anomaly_id, icd11_code) DO NOTHING;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. UPDATE RPC: get_my_codings_icd11
--    Returns postCoordination as-is from DB (already camelCase)
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
    a.patient_id,
    a.report_id,
    a.date::TEXT,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'icd11Code',       c.icd11_code,
          'icd11Title',      c.icd11_title,
          'entityId',        c.entity_id,
          'source',          c.source,
          'postCoordination', COALESCE(c.postcoordination, '[]'::jsonb)
        ) ORDER BY c.coded_at
      ) FILTER (WHERE c.icd11_code IS NOT NULL),
      '[]'::JSONB
    ) AS codes,
    s.qeyd,
    s.coded_at AS created_at
  FROM icd11_sessions s
  JOIN anomalies a ON a.id = s.anomaly_id
  LEFT JOIN icd11_codes c ON c.anomaly_id = s.anomaly_id
  WHERE s.doctor_id = p_doctor_id
  GROUP BY s.anomaly_id, a.patient_id, a.report_id, a.date, s.qeyd, s.coded_at
  ORDER BY s.coded_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. GRANTS (idempotent)
-- ============================================================

GRANT ALL ON TABLE icd11_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_coding_icd11(INT, UUID, JSONB, TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_codings_icd11(UUID, INT, INT)         TO anon, authenticated;
