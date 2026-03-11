-- On-demand support: access type per enrollment, challenges available for on-demand
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).

-- Enrollments: how the student accesses the course (live = default)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS access_type text DEFAULT 'live';
-- Valid: 'live' | 'on_demand'

-- Challenges: whether on-demand students can see and submit
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS available_for_on_demand boolean DEFAULT false;
