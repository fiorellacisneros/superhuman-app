-- Webflow Camp - Cohort 1: grabaciones y recursos
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- Requisito: docs/supabase-courses-lessons.sql (ppt_url, recording_url ya existen)

-- Añadir columna resources_url si no existe (para PDFs, carpetas Drive, etc.)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS resources_url text;

-- Onboarding: grabación + PDF
UPDATE lessons SET
  recording_url = 'https://us06web.zoom.us/rec/share/meX6iPtKE5Vfq8-d-7Fj3S28Rkh96odyvLh5ghwmq24HPotHkXv1eNrkKt6Lld0u.M0oKvL_EBVe_WVn5',
  resources_url = 'https://drive.google.com/file/d/1CY4H3UYgWZmAg9hzLhxeYzs6qw2xcmXr/view?usp=drive_link'
FROM courses c
WHERE lessons.course_id = c.id AND c.slug = 'webflow-camp-cohort-1' AND lessons.title = 'Onboarding';

-- Intro a Webflow + Client-First: PPT + recursos (carpeta) + grabación
UPDATE lessons SET
  ppt_url = 'https://drive.google.com/file/d/1oAMmSPMUTvqGBtHii9-p72Wd1Pnl-CHG/view?usp=sharing',
  resources_url = 'https://drive.google.com/drive/u/1/folders/10e_1tSuEQpkZ8G1g-5TfPZti9QDdj4eZ',
  recording_url = 'https://us06web.zoom.us/rec/share/rTzAPyvFz_NkQHm4KxEzh9qeICy00WtxQTc8i1PWw-SDwK73yV94imSj3JHhLa7N.feigM78US0xeglj2'
FROM courses c
WHERE lessons.course_id = c.id AND c.slug = 'webflow-camp-cohort-1' AND lessons.title = 'Intro a Webflow + Client-First';

-- Automatizaciones con Make: grabación
UPDATE lessons SET
  recording_url = 'https://us06web.zoom.us/rec/share/5B22QJzDJyX2vXJg3d40BNKlL2r0joqRiCPgfwy1Ax5Dg-fUuISgT5y-AbRZkJ33.11oyNKNINpqbnmrF'
FROM courses c
WHERE lessons.course_id = c.id AND c.slug = 'webflow-camp-cohort-1' AND lessons.title = 'Automatizaciones con Make';
