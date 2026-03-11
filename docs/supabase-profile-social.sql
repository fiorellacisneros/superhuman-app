-- Perfil: redes sociales, portafolio y foto
-- Ejecuta en Supabase SQL Editor (Dashboard → SQL Editor).

ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url text;

COMMENT ON COLUMN users.linkedin_url IS 'URL del perfil de LinkedIn';
COMMENT ON COLUMN users.instagram_url IS 'URL del perfil de Instagram';
COMMENT ON COLUMN users.portfolio_url IS 'URL del portafolio';
COMMENT ON COLUMN users.profile_photo_url IS 'URL de la foto de perfil (subida o enlace externo)';
