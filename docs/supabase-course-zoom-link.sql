-- Course-level Zoom link: default for all lessons in the course.
-- If a lesson has its own zoom_link, that takes precedence.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).

ALTER TABLE courses ADD COLUMN IF NOT EXISTS zoom_link text;
