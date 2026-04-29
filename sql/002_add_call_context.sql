-- Migration: 002
-- Add JSONB context column to calls table for storing in-flight IVR data
-- (collected fields, quote result, available slots, cancellation target)

ALTER TABLE calls ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}';
