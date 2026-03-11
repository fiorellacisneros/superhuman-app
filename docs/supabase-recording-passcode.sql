-- Add recording_passcode for Zoom recordings.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recording_passcode text;
