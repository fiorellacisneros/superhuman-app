-- Número de retos previstos por curso (para mostrar "1/5" en el dashboard).
-- Ejecutar en Supabase SQL Editor.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS expected_challenges_count integer DEFAULT 1 NOT NULL;
COMMENT ON COLUMN courses.expected_challenges_count IS 'Número de retos que tendrá el curso; se usa en el dashboard para mostrar progreso ej. 1/5.';
