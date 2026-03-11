-- Dani Test Cleanup — Elimina toda la data dummy creada por dani-test-seed.sql
--
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
-- Elimina: curso, lecciones, inscripción, challenges, submissions, asistencia, insignias de prueba, resta puntos.

-- 1. Eliminar submissions de challenges del curso
DELETE FROM submissions
WHERE challenge_id IN (SELECT id FROM challenges WHERE course_id IN (SELECT id FROM courses WHERE slug = 'dani-test-demo'));

-- 2. Eliminar challenges
DELETE FROM challenges WHERE course_id IN (SELECT id FROM courses WHERE slug = 'dani-test-demo');

-- 3. Eliminar asistencia de lecciones del curso
DELETE FROM attendance
WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id IN (SELECT id FROM courses WHERE slug = 'dani-test-demo'));

-- 4. Eliminar inscripciones del curso
DELETE FROM enrollments
WHERE course_id IN (SELECT id FROM courses WHERE slug = 'dani-test-demo');

-- 5. Eliminar lecciones
DELETE FROM lessons WHERE course_id IN (SELECT id FROM courses WHERE slug = 'dani-test-demo');

-- 6. Eliminar curso
DELETE FROM courses WHERE slug = 'dani-test-demo';

-- 7. Quitar insignias de prueba a Dani
DELETE FROM user_badges
WHERE user_id = 'user_3AmeIgBcDZtxME6wQoHCAozEzOI'
  AND badge_id IN ('da010001-0000-0000-0000-000000000001', 'da010002-0000-0000-0000-000000000002');

-- 8. Eliminar badges de prueba
DELETE FROM badges
WHERE id IN ('da010001-0000-0000-0000-000000000001', 'da010002-0000-0000-0000-000000000002');

-- 9. Restar 50 puntos (los que añadimos en el seed)
UPDATE users
SET points = GREATEST(0, COALESCE(points, 0) - 50)
WHERE id = 'user_3AmeIgBcDZtxME6wQoHCAozEzOI';
