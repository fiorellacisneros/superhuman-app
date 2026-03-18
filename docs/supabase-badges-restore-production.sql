-- =============================================================================
-- Restaurar insignias como las teníais (nombres en inglés / marca Superhuman).
-- El repo no guarda un dump viejo: este catálogo sale de lo que mostrabais en app
-- (On a Roll, Early bird, Night owl, On Time, Present, Builder, Superhuman, etc.).
--
-- ORDEN: 1) Vista previa  2) Quitar duplicados seed (a000…)  3) Fusionar mismo
-- condition_type  4) Renombrar  5) Opcional: borrar tipos que no uséis
-- =============================================================================

-- --- Vista previa: qué hay ahora
-- SELECT id, name, condition_type FROM badges ORDER BY condition_type, id;

-- =============================================================================
-- A) Quitar filas duplicadas del seed (a0000001…a0000006) si aún existen
-- =============================================================================
CREATE TEMP TABLE _seed_merge AS
WITH seed_ids AS (
  SELECT unnest(ARRAY[
    'a0000001-0000-0000-0000-000000000001'::uuid,
    'a0000002-0000-0000-0000-000000000002'::uuid,
    'a0000003-0000-0000-0000-000000000003'::uuid,
    'a0000004-0000-0000-0000-000000000004'::uuid,
    'a0000005-0000-0000-0000-000000000005'::uuid,
    'a0000006-0000-0000-0000-000000000006'::uuid
  ]) AS seed_id
),
seed_rows AS (
  SELECT b.id AS seed_id, b.condition_type FROM badges b JOIN seed_ids s ON b.id = s.seed_id
)
SELECT sr.seed_id, (
  SELECT MIN(b2.id) FROM badges b2
  WHERE b2.condition_type = sr.condition_type
    AND b2.id NOT IN (SELECT seed_id FROM seed_ids)
) AS keeper_id FROM seed_rows sr;

DELETE FROM _seed_merge WHERE keeper_id IS NULL;

UPDATE user_badges ub SET badge_id = m.keeper_id FROM _seed_merge m
WHERE ub.badge_id = m.seed_id
  AND NOT EXISTS (SELECT 1 FROM user_badges x WHERE x.user_id = ub.user_id AND x.badge_id = m.keeper_id);

DELETE FROM user_badges ub USING _seed_merge m WHERE ub.badge_id = m.seed_id;
DELETE FROM badges b USING _seed_merge m WHERE b.id = m.seed_id;
DROP TABLE _seed_merge;

-- =============================================================================
-- B) Un solo badge por condition_type (excepto manual: pueden ser varias)
-- =============================================================================
WITH ranked AS (
  SELECT id, condition_type,
    FIRST_VALUE(id) OVER (PARTITION BY condition_type ORDER BY id) AS keeper_id
  FROM badges
  WHERE condition_type IS NOT NULL AND condition_type <> 'manual'
),
dup AS (SELECT id, keeper_id FROM ranked WHERE id <> keeper_id)
UPDATE user_badges ub SET badge_id = d.keeper_id FROM dup d
WHERE ub.badge_id = d.id
  AND NOT EXISTS (SELECT 1 FROM user_badges x WHERE x.user_id = ub.user_id AND x.badge_id = d.keeper_id);

WITH ranked AS (
  SELECT id, condition_type,
    FIRST_VALUE(id) OVER (PARTITION BY condition_type ORDER BY id) AS keeper_id
  FROM badges
  WHERE condition_type IS NOT NULL AND condition_type <> 'manual'
),
dup AS (SELECT id FROM ranked WHERE id <> keeper_id)
DELETE FROM user_badges WHERE badge_id IN (SELECT id FROM dup);

WITH ranked AS (
  SELECT id, condition_type,
    FIRST_VALUE(id) OVER (PARTITION BY condition_type ORDER BY id) AS keeper_id
  FROM badges
  WHERE condition_type IS NOT NULL AND condition_type <> 'manual'
),
dup AS (SELECT id FROM ranked WHERE id <> keeper_id)
DELETE FROM badges WHERE id IN (SELECT id FROM dup);

-- =============================================================================
-- C) Nombres como en producción (ajusta si alguno era distinto)
-- =============================================================================
UPDATE badges SET name = 'First Submission' WHERE condition_type = 'first_submission';
UPDATE badges SET name = 'On a Roll' WHERE condition_type = 'streak_3';
UPDATE badges SET name = 'Early bird' WHERE condition_type = 'early_bird';
UPDATE badges SET name = 'Module Master' WHERE condition_type = 'module_complete';
UPDATE badges SET name = 'Course Crusher' WHERE condition_type = 'course_complete';
UPDATE badges SET name = 'Night owl' WHERE condition_type = 'night_owl';
UPDATE badges SET name = 'On Time' WHERE condition_type = 'on_time';
UPDATE badges SET name = 'Present' WHERE condition_type = 'first_attendance';
UPDATE badges SET name = '3-Peat' WHERE condition_type = 'attendance_streak_3';

-- manual: id menor → Builder; si hay 2+ → la otra → Superhuman (marca). On Time va por condition_type on_time.
UPDATE badges SET name = 'Builder'
WHERE condition_type = 'manual' AND id = (SELECT MIN(id) FROM badges WHERE condition_type = 'manual');

UPDATE badges SET name = 'Superhuman'
WHERE condition_type = 'manual'
  AND id = (SELECT MAX(id) FROM badges WHERE condition_type = 'manual')
  AND (SELECT COUNT(*)::int FROM badges WHERE condition_type = 'manual') >= 2
  AND id <> (SELECT MIN(id) FROM badges WHERE condition_type = 'manual');

-- Una sola fila manual: elige una etiqueta
-- UPDATE badges SET name = 'Builder' WHERE condition_type = 'manual';
-- o: UPDATE badges SET name = 'Superhuman' WHERE condition_type = 'manual';

-- =============================================================================
-- D) OPCIONAL: borrar insignias cuyo condition_type no es de la lista oficial.
-- Descomenta solo tras revisar:
-- SELECT id, name, condition_type FROM badges WHERE condition_type IS NULL
--    OR condition_type NOT IN (
--      'first_submission','streak_3','early_bird','module_complete','course_complete',
--      'manual','night_owl','on_time','first_attendance','attendance_streak_3'
--    );
--
-- DELETE FROM user_badges WHERE badge_id IN (
--   SELECT id FROM badges WHERE condition_type IS NULL
--   OR condition_type NOT IN (
--     'first_submission','streak_3','early_bird','module_complete','course_complete',
--     'manual','night_owl','on_time','first_attendance','attendance_streak_3'
--   )
-- );
-- DELETE FROM badges WHERE id IN (
--   SELECT id FROM badges WHERE condition_type IS NULL
--   OR condition_type NOT IN (
--     'first_submission','streak_3','early_bird','module_complete','course_complete',
--     'manual','night_owl','on_time','first_attendance','attendance_streak_3'
--   )
-- );
