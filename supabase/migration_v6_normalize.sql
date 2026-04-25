-- ============================================================
-- AzerDr ICD-11 Migration v6 — Normalize Coding Structure
-- Run FIRST on STAGING, verify, THEN on production.
--
-- Changes:
--   1. Create icd11_sessions  (one row per anomaly session)
--   2. Create icd11_codes     (one row per ICD code)
--   3. Migrate data from old icd11_coding_sessions
--   4. Drop icd11_coding_sessions
--   5. Update RPC functions
--   6. Grant permissions
-- ============================================================

-- ============================================================
-- 1. NEW TABLE: icd11_sessions (session metadata, one per anomaly)
-- ============================================================

CREATE TABLE IF NOT EXISTS icd11_sessions (
  anomaly_id  INT  UNIQUE NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qeyd        TEXT,
  coded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icd11_sessions_doctor  ON icd11_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_icd11_sessions_anomaly ON icd11_sessions(anomaly_id);

-- ============================================================
-- 2. NEW TABLE: icd11_codes (one row per code, fully queryable)
-- ============================================================

CREATE TABLE IF NOT EXISTS icd11_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_id  INT  NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  icd11_code  TEXT NOT NULL,
  icd11_title TEXT NOT NULL,
  entity_id   TEXT,
  source      TEXT NOT NULL CHECK (source IN ('tree', 'search')),
  coded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(anomaly_id, icd11_code)
);

CREATE INDEX IF NOT EXISTS idx_icd11_codes_anomaly  ON icd11_codes(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_icd11_codes_doctor   ON icd11_codes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_icd11_codes_code     ON icd11_codes(icd11_code);

-- ============================================================
-- 3. MIGRATE: icd11_coding_sessions → new tables
--    NOTE: Any test data in staging is cleared (only 1 test row exists).
--    For production: run migration_v5 RESET section first (anomaly reset),
--    then this migration will start with a clean slate.
-- ============================================================

-- Reset anomaly statuses back to pending for any anomalies coded with old structure
UPDATE anomalies
SET status      = 'pending',
    coded_by    = NULL,
    coded_at    = NULL,
    assigned_to = NULL,
    assigned_at = NULL
WHERE id IN (SELECT anomaly_id FROM icd11_coding_sessions);

-- Clear existing coding data — avoids importing bad structure
DELETE FROM icd11_coding_sessions;

-- ============================================================
-- 4. DROP old table
-- ============================================================

DROP TABLE IF EXISTS icd11_coding_sessions;

-- ============================================================
-- 5. UPDATE RPC: save_coding_icd11
--    Accepts same JSONB array — inserts into icd11_sessions + icd11_codes
-- ============================================================

CREATE OR REPLACE FUNCTION save_coding_icd11(
  p_anomaly_id  INT,
  p_doctor_id   UUID,
  p_codes       JSONB,      -- [{icd11_code, icd11_title, entity_id, source}]
  p_qeyd        TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  affected INT;
  code_row JSONB;
BEGIN
  -- Mark anomaly as completed (only if in_progress and assigned to this doctor)
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

  -- Upsert session metadata
  INSERT INTO icd11_sessions (anomaly_id, doctor_id, qeyd, coded_at)
  VALUES (p_anomaly_id, p_doctor_id, p_qeyd, NOW())
  ON CONFLICT (anomaly_id) DO UPDATE
    SET doctor_id = EXCLUDED.doctor_id,
        qeyd      = EXCLUDED.qeyd,
        coded_at  = NOW();

  -- Replace existing codes for this anomaly
  DELETE FROM icd11_codes WHERE anomaly_id = p_anomaly_id;

  FOR code_row IN SELECT * FROM jsonb_array_elements(p_codes)
  LOOP
    INSERT INTO icd11_codes
      (anomaly_id, doctor_id, icd11_code, icd11_title, entity_id, source, coded_at)
    VALUES (
      p_anomaly_id,
      p_doctor_id,
      code_row->>'icd11_code',
      COALESCE(code_row->>'icd11_title', ''),
      code_row->>'entity_id',
      COALESCE(code_row->>'source', 'tree'),
      NOW()
    )
    ON CONFLICT (anomaly_id, icd11_code) DO NOTHING;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. UPDATE RPC: get_my_codings_icd11
--    Returns same format as before (codes aggregated as JSONB)
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
          'icd11Code',  c.icd11_code,
          'icd11Title', c.icd11_title,
          'entityId',   c.entity_id,
          'source',     c.source
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
-- 7. UPDATE RPC: get_dashboard_stats
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
    (SELECT COUNT(*) FROM icd11_sessions s WHERE s.doctor_id = p_doctor_id)::BIGINT AS my_codings
  FROM anomalies a;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. GRANTS
-- ============================================================

GRANT ALL ON TABLE icd11_sessions TO anon, authenticated;
GRANT ALL ON TABLE icd11_codes    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_coding_icd11(INT, UUID, JSONB, TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_codings_icd11(UUID, INT, INT)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID)                    TO anon, authenticated;
