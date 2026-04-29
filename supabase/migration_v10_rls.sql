-- Migration v10: Row-Level Security (RLS) for diagnoses table
-- Apply in Supabase Dashboard → SQL Editor
-- This ensures doctors can only read/write their own diagnoses.

-- ─── Enable RLS on diagnoses ───────────────────────────────────────────────

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

-- Doctors can INSERT their own diagnoses
CREATE POLICY "diagnoses_insert_own" ON diagnoses
    FOR INSERT
    WITH CHECK (doctor_id = auth.uid());

-- Doctors can SELECT only their own diagnoses
CREATE POLICY "diagnoses_select_own" ON diagnoses
    FOR SELECT
    USING (doctor_id = auth.uid());

-- Doctors can UPDATE only their own diagnoses
CREATE POLICY "diagnoses_update_own" ON diagnoses
    FOR UPDATE
    USING (doctor_id = auth.uid())
    WITH CHECK (doctor_id = auth.uid());

-- Doctors can DELETE only their own diagnoses
CREATE POLICY "diagnoses_delete_own" ON diagnoses
    FOR DELETE
    USING (doctor_id = auth.uid());

-- ─── Note on backend service role ─────────────────────────────────────────
-- The backend uses the Supabase ServiceRoleKey which bypasses RLS.
-- This is correct: the backend enforces doctor_id at the application layer
-- (see DiagnosesController + SupabaseDiagnosisService).
-- RLS is a second line of defense for direct DB access.

-- ─── Optional: restrict anomalies table ────────────────────────────────────
-- Uncomment below if you want to restrict anomaly access via PostgREST.
-- Currently the backend uses ServiceRoleKey (bypasses RLS) so this is
-- mainly for direct Supabase client access.

-- ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anomalies_select_assigned" ON anomalies
--     FOR SELECT
--     USING (coded_by = auth.uid() OR coded_by IS NULL);
