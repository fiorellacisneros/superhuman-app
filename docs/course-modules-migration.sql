-- Módulos por curso: agrupar clases por módulo (ej. Intro, Maquetado).
-- Ejecutar en Supabase SQL Editor.

-- Tabla de módulos (uno por curso, ordenados)
CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  "order" int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);

COMMENT ON TABLE course_modules IS 'Módulos de un curso (ej. Intro, Maquetado). Las clases se agrupan por módulo.';

-- En lessons: referencia opcional al módulo
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES course_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);

COMMENT ON COLUMN lessons.module_id IS 'Módulo al que pertenece la clase. Si es null, la clase se muestra sin módulo o al final.';
