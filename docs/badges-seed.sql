-- Default badges for Superhuman School (sin Puntual/manual).
-- SOLO proyecto nuevo o tras limpiar duplicados. Ver docs/supabase-badges-merge-your-uuids.sql

INSERT INTO badges (id, name, description, image_url, condition_type)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'First Submission', 'Completaste tu primer desafío con entrega aprobada.', NULL, 'first_submission'),
  ('a0000002-0000-0000-0000-000000000002', 'On a Roll', 'Tres entregas aprobadas en retos distintos.', NULL, 'streak_3'),
  ('a0000003-0000-0000-0000-000000000003', 'Early bird', 'Fuiste la primera persona en entregar ese desafío.', NULL, 'early_bird'),
  ('a0000004-0000-0000-0000-000000000004', 'Builder', 'Completaste todas las lecciones del módulo.', NULL, 'module_complete'),
  ('a0000006-0000-0000-0000-000000000006', 'Superhuman', 'Terminaste todo el curso.', NULL, 'course_complete')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = COALESCE(EXCLUDED.image_url, badges.image_url),
  condition_type = EXCLUDED.condition_type;
