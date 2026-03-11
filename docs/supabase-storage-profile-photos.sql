-- Bucket de Supabase Storage para fotos de perfil
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- O crea el bucket manualmente: Dashboard → Storage → New bucket
--   - Name: profile-photos
--   - Public: Sí (para que las fotos sean accesibles)
--   - File size limit: 0.5 MB (500 KB)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  524288,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
