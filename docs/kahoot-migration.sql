-- Kahoot: resultados y puntos por clase
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- Puntos: 1º=50, 2º=40, 3º=30, 4º=20, 5º=15, participación=5
--
-- Si ya ejecutaste antes y falló: DROP TABLE IF EXISTS kahoot_results CASCADE;

CREATE TABLE IF NOT EXISTS kahoot_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position smallint,  -- 1, 2, 3, 4, 5 o null (participación)
  points_earned int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_kahoot_results_lesson ON kahoot_results(lesson_id);

COMMENT ON TABLE kahoot_results IS 'Resultados Kahoot por clase: podio (1-5) y participación';
