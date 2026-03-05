-- Default badges for Superhuman School.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- Table: badges (id, name, description, image_url, condition_type)
-- If your table has a primary key on id, the ON CONFLICT block runs; otherwise use only the INSERT below.

INSERT INTO badges (id, name, description, image_url, condition_type)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Primera entrega', 'Submitted first challenge', NULL, 'first_submission'),
  ('a0000002-0000-0000-0000-000000000002', 'En racha', 'Attended 3 lessons in a row', NULL, 'streak_3'),
  ('a0000003-0000-0000-0000-000000000003', 'Early bird', 'First student to submit a challenge', NULL, 'early_bird'),
  ('a0000004-0000-0000-0000-000000000004', 'Módulo completo', 'Completed all lessons in a module', NULL, 'module_complete'),
  ('a0000005-0000-0000-0000-000000000005', 'Puntual', 'Submitted before deadline', NULL, 'manual'),
  ('a0000006-0000-0000-0000-000000000006', 'Curso completo', 'Finished entire course', NULL, 'course_complete')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = COALESCE(EXCLUDED.image_url, badges.image_url),
  condition_type = EXCLUDED.condition_type;

-- Alternative if id is generated (e.g. default gen_random_uuid()): remove id from INSERT and run once.
-- If you get "ON CONFLICT do not match any unique constraint", use: INSERT INTO badges (name, description, image_url, condition_type) VALUES (...);
