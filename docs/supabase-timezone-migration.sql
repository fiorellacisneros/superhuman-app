-- Zona horaria en perfil de usuario
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- Permite que cada usuario elija su zona horaria/país en el perfil.
-- Las horas de clase se mostrarán en su zona local.
-- Por defecto: America/Lima (Perú).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Lima';

COMMENT ON COLUMN users.timezone IS 'IANA timezone (ej: America/Lima, America/Mexico_City) para mostrar fechas/horas en zona local';

-- Asegura que admins tengan Lima por defecto
UPDATE users SET timezone = 'America/Lima' WHERE role = 'admin' AND (timezone IS NULL OR timezone = '');
