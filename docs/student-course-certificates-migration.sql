-- Certificados por alumno y curso (PDF o URL). Ejecutar en Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS student_course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  title text,
  credential_public_id text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_student_course_certificates_user ON student_course_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_student_course_certificates_course ON student_course_certificates(course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_course_certificates_public_id
ON student_course_certificates (credential_public_id)
WHERE credential_public_id IS NOT NULL;

COMMENT ON TABLE student_course_certificates IS 'Certificado de finalización (URL pública o PDF subido a Storage) por alumno y curso.';
COMMENT ON COLUMN student_course_certificates.created_by IS 'user_id (Clerk) del admin que cargó el certificado.';
COMMENT ON COLUMN student_course_certificates.credential_public_id IS 'Código SHS-… para LinkedIn y /verify/cert/…';

-- Storage (Dashboard → Storage): bucket público de solo lectura para alumnos, ej. nombre: course-certificates
-- Políticas: el upload lo hace la app con service role; lectura pública si usás URL firmada o bucket público.
