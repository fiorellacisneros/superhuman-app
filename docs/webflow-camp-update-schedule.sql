-- Actualiza horarios y duraciones del Webflow Camp - Cohort 1
-- Ejecuta docs/lessons-duration-migration.sql PRIMERO si no lo has hecho.
-- Luego ejecuta esto en Supabase SQL Editor.

-- 7pm Peru = 00:00 UTC día siguiente. Demo 10am = 15:00 UTC. Automatizaciones 8:15pm = 01:15 UTC día siguiente.

UPDATE lessons SET scheduled_at = '2026-02-26 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Onboarding' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-04 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Intro a Webflow + Client-First' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-06 01:15:00+00'::timestamptz, duration_minutes = 60
WHERE title = 'Automatizaciones con Make' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-11 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Relume Deep Dive' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-13 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Figma to Webflow' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-18 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Fundamentos de Layout' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-20 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Navbar & Footer' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-25 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Secciones Hero & Content' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-27 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'CMS - Collections' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-08 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'CMS - Collection Page' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-10 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Responsive Design' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-15 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'Animaciones & Interactions' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-19 00:00:00+00'::timestamptz, duration_minutes = 120
WHERE title = 'SEO & Performance' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-18 15:00:00+00'::timestamptz, duration_minutes = 180
WHERE title = 'Demo Day' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');
