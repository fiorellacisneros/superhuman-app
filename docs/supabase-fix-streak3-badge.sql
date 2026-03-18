-- Limpieza: quitar la insignia "En racha" (On a Roll) a quienes la tienen
-- pero tienen menos de 3 entregas aprobadas (se dio por error por 3 asistencias).
-- Ejecutar en Supabase: Dashboard → SQL Editor.
-- La insignia solo se vuelve a dar cuando tengan 3 entregas aprobadas en retos distintos (ver src/lib/badges.ts).

DELETE FROM user_badges ub
WHERE ub.badge_id = (SELECT id FROM badges WHERE condition_type = 'streak_3' LIMIT 1)
  AND ub.user_id IN (
    SELECT s.user_id
    FROM submissions s
    WHERE s.approved = true
    GROUP BY s.user_id
    HAVING COUNT(*) < 3
  );

-- Opcional: actualizar la descripción del badge en la tabla (por si no usas el seed).
UPDATE badges
SET description = '3 entregas aprobadas en retos distintos'
WHERE condition_type = 'streak_3';
