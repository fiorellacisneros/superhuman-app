-- Dani Test Seed — Data dummy para pruebas en producción
-- Usuario: mfcisnerosr@gmail.com (user_3AmeIgBcDZtxME6wQoHCAozEzOI)
--
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
-- Requisito: Dani debe haber iniciado sesión al menos una vez (para que exista en users).
--
-- Para eliminar todo: ejecuta docs/dani-test-cleanup.sql
--
-- Si el curso ya existe (script ejecutado antes), ejecuta primero dani-test-cleanup.sql

-- 1. Crear curso y lecciones
WITH new_course AS (
  INSERT INTO courses (title, slug, description, cover_image, zoom_link, created_by)
  SELECT
    'Dani Test - Curso Demo',
    'dani-test-demo',
    'Curso de prueba para casuísticas. Se puede eliminar con dani-test-cleanup.sql.',
    'https://cdn.prod.website-files.com/6970f8699831ea17b96f041e/69b09e1432229050bc16d465_camp-app.jpg',
    'https://zoom.us/j/1234567890',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
  RETURNING id
),
_ AS (
  INSERT INTO lessons (course_id, title, notes, "order", scheduled_at, zoom_link)
  SELECT id, 'Sesión 1 - Intro', 'Introducción al curso de prueba', 0, (NOW() - INTERVAL '7 days')::timestamptz, NULL FROM new_course
  UNION ALL SELECT id, 'Sesión 2 - Contenido', 'Contenido de ejemplo', 1, (NOW() - INTERVAL '2 days')::timestamptz, NULL FROM new_course
  UNION ALL SELECT id, 'Sesión 3 - Próxima', 'Clase por empezar', 2, (NOW() + INTERVAL '2 days')::timestamptz, NULL FROM new_course
  UNION ALL SELECT id, 'Sesión 4 - Futura', 'Otra clase futura', 3, (NOW() + INTERVAL '5 days')::timestamptz, NULL FROM new_course
)
INSERT INTO enrollments (user_id, course_id, access_type)
SELECT 'user_3AmeIgBcDZtxME6wQoHCAozEzOI', id, 'live'
FROM new_course;

-- 2. Challenges y submission (para puntos)
WITH course AS (SELECT id FROM courses WHERE slug = 'dani-test-demo' LIMIT 1),
new_challenges AS (
  INSERT INTO challenges (course_id, title, description, deadline, points_reward, is_active, available_for_on_demand)
  SELECT id, 'Challenge 1 - Diseño', 'Crea un diseño en Figma', (NOW() + INTERVAL '7 days')::timestamptz, 30, true, false FROM course
  UNION ALL SELECT id, 'Challenge 2 - Webflow', 'Publica un sitio en Webflow', (NOW() + INTERVAL '14 days')::timestamptz, 30, true, false FROM course
  RETURNING id
),
first_chal AS (SELECT id FROM new_challenges LIMIT 1)
INSERT INTO submissions (challenge_id, user_id, link, submitted_at, reviewed, approved)
SELECT id, 'user_3AmeIgBcDZtxME6wQoHCAozEzOI', 'https://figma.com/file/demo', NOW(), true, true
FROM first_chal;

-- 3. Asistencia a clases pasadas (10 pts cada una)
INSERT INTO attendance (user_id, lesson_id, confirmed_at)
SELECT 'user_3AmeIgBcDZtxME6wQoHCAozEzOI', l.id, NOW()
FROM lessons l
JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'dani-test-demo' AND l.scheduled_at < NOW()
LIMIT 2;

-- 4. Sumar puntos: 20 (asistencia x2) + 30 (challenge aprobado) = 50
UPDATE users
SET points = COALESCE(points, 0) + 50
WHERE id = 'user_3AmeIgBcDZtxME6wQoHCAozEzOI';

-- 5. Insignias de prueba (fáciles de eliminar en cleanup)
INSERT INTO badges (id, name, description, image_url, condition_type)
VALUES
  ('da010001-0000-0000-0000-000000000001', 'Dani Test - Primera entrega', 'Badge de prueba', NULL, 'manual'),
  ('da010002-0000-0000-0000-000000000002', 'Dani Test - En racha', 'Badge de prueba', NULL, 'manual')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES
  ('user_3AmeIgBcDZtxME6wQoHCAozEzOI', 'da010001-0000-0000-0000-000000000001', NOW()),
  ('user_3AmeIgBcDZtxME6wQoHCAozEzOI', 'da010002-0000-0000-0000-000000000002', NOW())
ON CONFLICT (user_id, badge_id) DO NOTHING;
