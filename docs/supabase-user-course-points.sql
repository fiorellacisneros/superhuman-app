-- Puntos por cohorte (curso): cada usuario acumula puntos por curso, no globalmente.
-- Si se inscribe en otro curso, empieza con 0 puntos en ese cohorte.
--
-- IMPORTANTE: Ejecuta esta migración ANTES de desplegar el código que usa user_course_points.
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.

-- 1. Tabla de puntos por usuario y curso
CREATE TABLE IF NOT EXISTS user_course_points (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_course_points_course ON user_course_points(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_points_user ON user_course_points(user_id);

COMMENT ON TABLE user_course_points IS 'Puntos acumulados por usuario en cada curso (cohorte).';

-- 2. Migrar puntos existentes de users.points a user_course_points
-- Si el usuario tiene un solo curso, asignamos ahí. Si tiene varios, al primero.
INSERT INTO user_course_points (user_id, course_id, points, updated_at)
SELECT u.id, e.course_id, COALESCE(u.points, 0), now()
FROM users u
JOIN LATERAL (
  SELECT course_id FROM enrollments WHERE user_id = u.id LIMIT 1
) e ON true
WHERE COALESCE(u.points, 0) > 0
ON CONFLICT (user_id, course_id) DO UPDATE SET
  points = GREATEST(user_course_points.points, EXCLUDED.points),
  updated_at = now();

-- 3. Opcional: vaciar users.points tras migrar (descomenta si quieres deprecar la columna)
-- UPDATE users SET points = 0 WHERE points > 0;
