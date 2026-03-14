-- Sesión grupal on-demand: link y fecha editables desde BD
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
--
-- Para cambiar enlace o fecha más adelante:
--   UPDATE sesion_grupal SET title = '...', link_url = '...', fecha_label = '...' WHERE id = 1;

-- Tabla singleton: una sola fila con el enlace y fecha de la sesión grupal actual
CREATE TABLE IF NOT EXISTS sesion_grupal (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text,
  link_url text,
  fecha_label text,
  updated_at timestamptz DEFAULT now()
);

-- RLS: solo lectura para usuarios autenticados (la página ya exige login on-demand)
ALTER TABLE sesion_grupal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON sesion_grupal;
CREATE POLICY "Allow read for authenticated"
  ON sesion_grupal FOR SELECT
  TO authenticated
  USING (true);

-- Solo el backend (service role) puede insertar/actualizar; admins pueden editar desde el SQL Editor o un panel futuro
DROP POLICY IF EXISTS "Allow all for service role" ON sesion_grupal;
CREATE POLICY "Allow all for service role"
  ON sesion_grupal FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed: sesión Webflow Camp - On Demand (insertar solo si no existe)
INSERT INTO sesion_grupal (id, title, link_url, fecha_label)
VALUES (
  1,
  'Webflow Camp - On Demand',
  'https://meet.google.com/vmv-ykxx-kxk',
  'Viernes, 27 marzo · 7:00 – 8:00pm Perú'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  link_url = EXCLUDED.link_url,
  fecha_label = EXCLUDED.fecha_label,
  updated_at = now();

-- Asistencias a sesión grupal (on-demand): máx. 2 por alumno; el admin las registra manualmente
CREATE TABLE IF NOT EXISTS sesion_grupal_asistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sesion_grupal_asistencias_user_id ON sesion_grupal_asistencias(user_id);

ALTER TABLE sesion_grupal_asistencias ENABLE ROW LEVEL SECURITY;

-- Lectura solo vía backend (service_role); la página sesion-grupal usa el user id de Clerk

DROP POLICY IF EXISTS "Allow all for service role" ON sesion_grupal_asistencias;
CREATE POLICY "Allow all for service role"
  ON sesion_grupal_asistencias FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
