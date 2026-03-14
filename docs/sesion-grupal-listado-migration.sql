-- Listado de sesiones grupales (varias fechas + links) para on-demand
-- Run in Supabase SQL Editor después de sesion-grupal-migration.sql
--
-- Añadir más sesiones: INSERT INTO sesion_grupal_sesiones (title, link_url, fecha_label, order_index)
--   VALUES ('Título', 'https://...', 'Viernes 3 abril · 7:00pm Perú', 2);

CREATE TABLE IF NOT EXISTS sesion_grupal_sesiones (
  id serial PRIMARY KEY,
  title text,
  link_url text NOT NULL,
  fecha_label text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sesion_grupal_sesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON sesion_grupal_sesiones;
CREATE POLICY "Allow read for authenticated"
  ON sesion_grupal_sesiones FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all for service role" ON sesion_grupal_sesiones;
CREATE POLICY "Allow all for service role"
  ON sesion_grupal_sesiones FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Copiar la sesión actual de sesion_grupal al listado (solo si el listado está vacío)
INSERT INTO sesion_grupal_sesiones (title, link_url, fecha_label, order_index)
SELECT s.title, s.link_url, s.fecha_label, 1
FROM sesion_grupal s
WHERE s.id = 1
  AND NOT EXISTS (SELECT 1 FROM sesion_grupal_sesiones LIMIT 1);
