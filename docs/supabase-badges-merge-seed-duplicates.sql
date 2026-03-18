-- (Parcial) Solo fusiona duplicados seed. Para nombres EN + catálogo completo usar:
-- docs/supabase-badges-restore-production.sql
--
-- Unificar badges duplicados: filas del seed (a0000001-…a0000006) + otras con el mismo condition_type.
-- Solo borra cada id seed si existe OTRO badge con ese mismo condition_type.
--
-- Supabase → SQL Editor. Vista previa:
-- SELECT condition_type, id, name FROM badges ORDER BY condition_type, id;

CREATE TEMP TABLE _badge_seed_merge AS
WITH seed_ids AS (
  SELECT unnest(
    ARRAY[
      'a0000001-0000-0000-0000-000000000001'::uuid,
      'a0000002-0000-0000-0000-000000000002'::uuid,
      'a0000003-0000-0000-0000-000000000003'::uuid,
      'a0000004-0000-0000-0000-000000000004'::uuid,
      'a0000005-0000-0000-0000-000000000005'::uuid,
      'a0000006-0000-0000-0000-000000000006'::uuid
    ]
  ) AS seed_id
),
seed_rows AS (
  SELECT b.id AS seed_id, b.condition_type
  FROM badges b
  INNER JOIN seed_ids s ON b.id = s.seed_id
)
SELECT
  sr.seed_id,
  (
    SELECT MIN(b2.id)
    FROM badges b2
    WHERE
      b2.condition_type = sr.condition_type
      AND b2.id NOT IN (SELECT seed_id FROM seed_ids)
  ) AS keeper_id
FROM seed_rows sr;

DELETE FROM _badge_seed_merge WHERE keeper_id IS NULL;

UPDATE user_badges ub
SET badge_id = m.keeper_id
FROM _badge_seed_merge m
WHERE
  ub.badge_id = m.seed_id
  AND NOT EXISTS (
    SELECT 1
    FROM user_badges x
    WHERE
      x.user_id = ub.user_id
      AND x.badge_id = m.keeper_id
  );

DELETE FROM user_badges ub
USING _badge_seed_merge m
WHERE ub.badge_id = m.seed_id;

DELETE FROM badges b
USING _badge_seed_merge m
WHERE b.id = m.seed_id;

DROP TABLE _badge_seed_merge;
