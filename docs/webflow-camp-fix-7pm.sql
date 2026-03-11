-- Corrige horarios a 7pm Perú (00:00 UTC día siguiente)
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- Solo actualiza scheduled_at. Si tienes duration_minutes, ejecuta webflow-camp-update-schedule.sql para duraciones también.

UPDATE lessons SET scheduled_at = '2026-02-26 00:00:00+00'::timestamptz
WHERE title = 'Onboarding' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-04 00:00:00+00'::timestamptz
WHERE title = 'Intro a Webflow + Client-First' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-06 01:15:00+00'::timestamptz
WHERE title = 'Automatizaciones con Make' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-11 00:00:00+00'::timestamptz
WHERE title = 'Relume Deep Dive' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-13 00:00:00+00'::timestamptz
WHERE title = 'Figma to Webflow' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-18 00:00:00+00'::timestamptz
WHERE title = 'Fundamentos de Layout' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-20 00:00:00+00'::timestamptz
WHERE title = 'Navbar & Footer' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-25 00:00:00+00'::timestamptz
WHERE title = 'Secciones Hero & Content' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-03-27 00:00:00+00'::timestamptz
WHERE title = 'CMS - Collections' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-08 00:00:00+00'::timestamptz
WHERE title = 'CMS - Collection Page' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-10 00:00:00+00'::timestamptz
WHERE title = 'Responsive Design' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-15 00:00:00+00'::timestamptz
WHERE title = 'Animaciones & Interactions' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-19 00:00:00+00'::timestamptz
WHERE title = 'SEO & Performance' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');

UPDATE lessons SET scheduled_at = '2026-04-18 15:00:00+00'::timestamptz
WHERE title = 'Demo Day' AND course_id IN (SELECT id FROM courses WHERE slug = 'webflow-camp-cohort-1');
