-- =============================================================================
-- Tu caso actual: duplicados seed (a000…) + filas buenas con UUID propios.
-- Ejecutar UNA vez en Supabase SQL Editor. Preserva user_badges de los alumnos.
-- (Puntual a0000005: si aún existe, borrarla con supabase-remove-puntual-first-submission-en.sql)
-- =============================================================================

-- first_submission: seed → 11b3a614
UPDATE user_badges ub
SET badge_id = '11b3a614-5871-435e-9f2e-1cb1a402c59b'::uuid
WHERE ub.badge_id = 'a0000001-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM user_badges x
    WHERE x.user_id = ub.user_id
      AND x.badge_id = '11b3a614-5871-435e-9f2e-1cb1a402c59b'::uuid
  );
DELETE FROM user_badges WHERE badge_id = 'a0000001-0000-0000-0000-000000000001'::uuid;
DELETE FROM badges WHERE id = 'a0000001-0000-0000-0000-000000000001'::uuid;

-- streak_3: seed → On a Roll
UPDATE user_badges ub
SET badge_id = '263c29f3-2adc-491c-b040-e1459c6d7ecf'::uuid
WHERE ub.badge_id = 'a0000002-0000-0000-0000-000000000002'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM user_badges x
    WHERE x.user_id = ub.user_id
      AND x.badge_id = '263c29f3-2adc-491c-b040-e1459c6d7ecf'::uuid
  );
DELETE FROM user_badges WHERE badge_id = 'a0000002-0000-0000-0000-000000000002'::uuid;
DELETE FROM badges WHERE id = 'a0000002-0000-0000-0000-000000000002'::uuid;

-- early_bird: seed → Early Bird
UPDATE user_badges ub
SET badge_id = '6147f102-a48c-4842-abc3-18547e8cec54'::uuid
WHERE ub.badge_id = 'a0000003-0000-0000-0000-000000000003'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM user_badges x
    WHERE x.user_id = ub.user_id
      AND x.badge_id = '6147f102-a48c-4842-abc3-18547e8cec54'::uuid
  );
DELETE FROM user_badges WHERE badge_id = 'a0000003-0000-0000-0000-000000000003'::uuid;
DELETE FROM badges WHERE id = 'a0000003-0000-0000-0000-000000000003'::uuid;

-- module_complete: seed → Builder
UPDATE user_badges ub
SET badge_id = '00af437c-5484-4548-9869-2b3f35dab47e'::uuid
WHERE ub.badge_id = 'a0000004-0000-0000-0000-000000000004'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM user_badges x
    WHERE x.user_id = ub.user_id
      AND x.badge_id = '00af437c-5484-4548-9869-2b3f35dab47e'::uuid
  );
DELETE FROM user_badges WHERE badge_id = 'a0000004-0000-0000-0000-000000000004'::uuid;
DELETE FROM badges WHERE id = 'a0000004-0000-0000-0000-000000000004'::uuid;

-- course_complete: seed → Superhuman
UPDATE user_badges ub
SET badge_id = 'deefc17a-fdf4-4577-baf3-3f3b01d49baa'::uuid
WHERE ub.badge_id = 'a0000006-0000-0000-0000-000000000006'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM user_badges x
    WHERE x.user_id = ub.user_id
      AND x.badge_id = 'deefc17a-fdf4-4577-baf3-3f3b01d49baa'::uuid
  );
DELETE FROM user_badges WHERE badge_id = 'a0000006-0000-0000-0000-000000000006'::uuid;
DELETE FROM badges WHERE id = 'a0000006-0000-0000-0000-000000000006'::uuid;

-- Comprobar resultado (9 filas; luego quitar Puntual con supabase-remove-puntual-first-submission-en.sql):
-- SELECT id, name, condition_type FROM badges ORDER BY condition_type;
