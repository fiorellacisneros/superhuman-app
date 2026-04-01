-- Una sola entrega por alumno y por reto (el último enlace es el que vale).
-- Elimina duplicados y añade UNIQUE para que no vuelvan a crearse por carrera de red/doble clic.
-- Ejecutar en Supabase SQL Editor.

-- 1) Borrar filas duplicadas: se conserva una por (user_id, challenge_id).
--    Prioridad: entrega aprobada; si no hay, la más reciente por submitted_at.
DELETE FROM submissions
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, challenge_id
        ORDER BY
          (reviewed = true AND approved = true) DESC,
          submitted_at DESC NULLS LAST,
          id DESC
      ) AS rn
    FROM submissions
  ) ranked
  WHERE rn > 1
);

-- 2) Evitar nuevos duplicados (idempotente si ya existe el constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'submissions_user_id_challenge_id_key'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_user_id_challenge_id_key UNIQUE (user_id, challenge_id);
  END IF;
END $$;
