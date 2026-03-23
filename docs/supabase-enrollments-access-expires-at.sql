-- Ventana de acceso a la plataforma (1 año desde inscripción por defecto en la app).
-- Ejecutar en Supabase SQL Editor antes de desplegar código que usa access_expires_at.

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

COMMENT ON COLUMN enrollments.access_expires_at IS 'Hasta cuándo el alumno puede ver el curso en la plataforma. Si NULL, la app usa enrolled_at + 365 días.';

-- Opcional: rellenar filas existentes (1 año desde enrolled_at)
UPDATE enrollments
SET access_expires_at = enrolled_at + interval '1 year'
WHERE access_expires_at IS NULL
  AND enrolled_at IS NOT NULL;

-- Si no tenías enrolled_at en filas viejas, ajustá manualmente o dejá NULL (la app cae a now+365 solo al leer enrolled_at vacío).
