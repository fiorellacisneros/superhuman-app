-- Limpieza: quitar la insignia "En racha" a quien la tiene pero NO tiene
-- 3 o más entregas aprobadas (incluye 0 aprobadas: 1 entrega sin aprobar, etc.).
-- Ejecutar en Supabase: Dashboard → SQL Editor.

DELETE FROM user_badges ub
WHERE ub.badge_id = (SELECT id FROM badges WHERE condition_type = 'streak_3' LIMIT 1)
  AND (
    ub.user_id NOT IN (
      SELECT s.user_id
      FROM submissions s
      WHERE s.approved = true
      GROUP BY s.user_id
      HAVING COUNT(*) >= 3
    )
  );

-- Opcional: actualizar la descripción del badge en la tabla (por si no usas el seed).
UPDATE badges
SET description = '3 entregas aprobadas en retos distintos'
WHERE condition_type = 'streak_3';
