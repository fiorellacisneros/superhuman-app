-- Quitar insignia Puntual (manual) y renombrar Primera entrega → First Submission.
-- Ejecutar en Supabase SQL Editor.

DELETE FROM user_badges WHERE badge_id = 'a0000005-0000-0000-0000-000000000005'::uuid;
DELETE FROM badges WHERE id = 'a0000005-0000-0000-0000-000000000005'::uuid;

UPDATE badges
SET name = 'First Submission'
WHERE condition_type = 'first_submission';
