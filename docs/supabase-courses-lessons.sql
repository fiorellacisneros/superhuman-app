-- Course experience: new columns for courses and lessons.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).

-- Courses: cover image (path/filename, e.g. "cover-1.jpg" → served from /courses/cover-1.jpg)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug text;

-- Lessons: notes, ppt_url, recording_url, resources_url, scheduled_at
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ppt_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recording_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS resources_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
