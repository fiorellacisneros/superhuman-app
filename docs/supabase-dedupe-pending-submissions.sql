-- Duplicados en entregas pendientes (mismo alumno + mismo reto, varias filas).
-- Causa habitual: doble clic / dos pestañas al enviar (condición de carrera).
-- Ejecutar en Supabase SQL Editor. Deja solo la entrega más reciente por (user_id, challenge_id).

DELETE FROM submissions
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, challenge_id
        ORDER BY submitted_at DESC NULLS LAST
      ) AS rn
    FROM submissions
    WHERE reviewed = false
  ) sub
  WHERE rn > 1
);

-- Comprobar antes (opcional): ver duplicados
-- SELECT user_id, challenge_id, COUNT(*) AS n
-- FROM submissions WHERE reviewed = false
-- GROUP BY user_id, challenge_id HAVING COUNT(*) > 1;
