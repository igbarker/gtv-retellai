-- Migration: Add call_summary field to calls table
-- Run this in your Supabase SQL editor

-- Add call_summary column to calls table
ALTER TABLE calls ADD COLUMN call_summary TEXT;

-- Add comment for documentation
COMMENT ON COLUMN calls.call_summary IS 'Concise summary of the call reason (max ~10 words)';

-- Update existing records to have a default call_summary
UPDATE calls 
SET call_summary = COALESCE(reason, 'Customer inquiry') 
WHERE call_summary IS NULL;

-- Add index for phone number lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_businesses_phone_number_lookup ON businesses(phone_number) WHERE is_active = true;
