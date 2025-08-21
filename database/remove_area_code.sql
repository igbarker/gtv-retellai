-- Migration: Remove redundant area_code field from businesses table
-- Run this in your Supabase SQL editor

-- Remove the area_code column
ALTER TABLE businesses DROP COLUMN area_code;

-- Remove the area_code index (no longer needed)
DROP INDEX IF EXISTS idx_businesses_area_code;

-- Update the phone number index to be more comprehensive
-- (This will help with phone number lookups)
CREATE INDEX IF NOT EXISTS idx_businesses_phone_number_lookup 
ON businesses(phone_number) WHERE is_active = true;
