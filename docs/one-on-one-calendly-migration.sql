-- Sesiones 1:1 con Calendly
-- Ejecutar en el SQL Editor de Supabase antes de usar sesiones 1:1.
--
-- Si la tabla one_on_one_bookings ya existe con user_id uuid (error de tipos), bórrala primero:
--   DROP TABLE IF EXISTS one_on_one_bookings;
-- Luego ejecuta todo el script de abajo.
--
-- 1. Campos en courses: fecha fin del curso y link de Calendly para 1:1
ALTER TABLE courses ADD COLUMN IF NOT EXISTS ends_at date;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS calendly_link_1to1 text;

-- 2. Reservas 1:1 (registradas por el admin en la app cuando el alumno reserva en Calendly)
-- users.id es text (Clerk); course_id depende de tu tabla courses (uuid o text)
CREATE TABLE IF NOT EXISTS one_on_one_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  calendly_invitee_uri text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  source text NOT NULL DEFAULT 'calendly' CHECK (source IN ('calendly', 'our_app')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_one_on_one_bookings_user_course
  ON one_on_one_bookings (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_one_on_one_bookings_calendly_uri
  ON one_on_one_bookings (calendly_invitee_uri) WHERE calendly_invitee_uri IS NOT NULL;

COMMENT ON TABLE one_on_one_bookings IS 'Reservas de sesiones 1:1 por curso (live). Máximo 2 por user_id + course_id.';
COMMENT ON COLUMN courses.ends_at IS 'Fecha fin del curso; después de esta fecha no se pueden agendar sesiones 1:1.';
COMMENT ON COLUMN courses.calendly_link_1to1 IS 'URL de Calendly para reservar sesión 1:1 de este curso.';
