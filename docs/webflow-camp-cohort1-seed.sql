-- Webflow Camp - Cohort 1
-- Horarios Perú: 7-9pm (2h), Demo Day 10am-1pm (3h), Automatizaciones fue 8:15-9:15pm (1h)
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- Requisito: docs/lessons-duration-migration.sql y usuario admin (created_by).
--
-- Si el curso YA existe y solo quieres actualizar horarios/duraciones, ejecuta el UPDATE al final.

WITH new_course AS (
  INSERT INTO courses (title, slug, description, cover_image, created_by)
  SELECT
    'Webflow Camp - Cohort 1',
    'webflow-camp-cohort-1',
    'Cohort 1 del Webflow Camp. Curso de Webflow con metodología Client-First, Relume, CMS y más.',
    'https://cdn.prod.website-files.com/6970f8699831ea17b96f041e/69b09e1432229050bc16d465_camp-app.jpg',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
  RETURNING id
)
INSERT INTO lessons (course_id, title, notes, "order", scheduled_at, duration_minutes)
SELECT id, 'Onboarding', 'Bienvenida, setup cuentas Webflow + Relume', 0, '2026-02-26 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Intro a Webflow + Client-First', 'Qué es Webflow, qué se puede construir, interfaz básica, metodología Client-First para naming y organización', 1, '2026-03-04 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Automatizaciones con Make', 'Integraciones y automatizaciones con Make (Integromat)', 2, '2026-03-06 01:15:00+00'::timestamptz, 60 FROM new_course
UNION ALL SELECT id, 'Relume Deep Dive', 'Setup Relume Pro, cómo usar la librería, AI Site Builder', 3, '2026-03-11 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Figma to Webflow', 'Exportar variables de Figma, plugin Figma to Webflow, workflow optimizado diseño → código', 4, '2026-03-13 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Fundamentos de Layout', 'Margin, Padding, Flexbox en detalle, CSS Grid, buenas prácticas de layout', 5, '2026-03-18 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Navbar & Footer', 'Construcción de navegación profesional, footer con links, estructura reusable', 6, '2026-03-20 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Secciones Hero & Content', 'Hero section, secciones de contenido (about, services, features)', 7, '2026-03-25 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'CMS - Collections', 'Crear collections, configurar fields', 8, '2026-03-27 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'CMS - Collection Page', 'Contenido dinámico, collection list, template pages', 9, '2026-04-08 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Responsive Design', 'Uso de breakpoints, buenas prácticas de diseño adaptable', 10, '2026-04-10 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Animaciones & Interactions', 'Uso de animaciones con scroll, hover, transiciones y microinteracciones para mejorar la experiencia del usuario', 11, '2026-04-15 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'SEO & Performance', 'Técnicas clave para optimizar el SEO y el rendimiento web en Webflow', 12, '2026-04-19 00:00:00+00'::timestamptz, 120 FROM new_course
UNION ALL SELECT id, 'Demo Day', 'Presentación final de proyectos', 13, '2026-04-18 15:00:00+00'::timestamptz, 180 FROM new_course;

-- Si el curso ya existe: ejecuta docs/lessons-duration-migration.sql y luego docs/webflow-camp-update-schedule.sql
