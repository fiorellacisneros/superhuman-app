-- Si ya ejecutaste student-course-certificates-migration.sql antes, corré solo esto.
-- ID público para LinkedIn (Credential ID) y página /verify/cert/...

ALTER TABLE student_course_certificates
ADD COLUMN IF NOT EXISTS credential_public_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_course_certificates_public_id
ON student_course_certificates (credential_public_id)
WHERE credential_public_id IS NOT NULL;

COMMENT ON COLUMN student_course_certificates.credential_public_id IS 'Código único SHS-… para LinkedIn Credential ID y URL /verify/cert/…';
