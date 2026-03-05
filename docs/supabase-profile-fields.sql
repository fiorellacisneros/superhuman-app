-- Nuevos campos en la tabla `users` para perfil público y directorio
-- Ejecuta esto en el SQL Editor de Supabase (Dashboard → SQL Editor).

-- 1. Descripción / bio (texto corto para el perfil público)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS description text;

-- 2. Rol autodeclarado (ej: "Diseñador UX", "Frontend Developer") — distinto del rol del sistema (admin/student)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS self_declared_role text;

-- 3. Si el usuario quiere aparecer en el directorio de estudiantes (público)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS show_in_directory boolean NOT NULL DEFAULT false;

-- Comentarios opcionales para documentar
COMMENT ON COLUMN users.description IS 'Bio o descripción que el usuario escribe en su perfil';
COMMENT ON COLUMN users.self_declared_role IS 'Rol profesional que el usuario declara (ej: Diseñador, Developer)';
COMMENT ON COLUMN users.show_in_directory IS 'Si true, el perfil aparece en el directorio de estudiantes';
