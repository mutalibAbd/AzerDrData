-- Migration v9: Add doctor_note column to diagnoses table
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE diagnoses
  ADD COLUMN IF NOT EXISTS doctor_note text;

COMMENT ON COLUMN diagnoses.doctor_note IS 'Optional note written by the coding doctor';
