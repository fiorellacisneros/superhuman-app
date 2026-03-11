-- Campo cumpleaños en perfil
-- Ejecuta en Supabase SQL Editor (Dashboard → SQL Editor).

ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday date;

COMMENT ON COLUMN users.birthday IS 'Fecha de cumpleaños del usuario';
