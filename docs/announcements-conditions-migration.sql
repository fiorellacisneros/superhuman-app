-- Condiciones extra en avisos: puntos mínimos e inscripción en un curso.
-- Ejecutar en Supabase si ya creaste `announcements` con la migración inicial.

alter table public.announcements
  add column if not exists min_points int,
  add column if not exists require_enrolled_course_id uuid references public.courses (id) on delete set null;

alter table public.announcements
  add column if not exists visibility_conditions jsonb not null default '{"match":"all","rules":[]}'::jsonb;

alter table public.announcements
  drop constraint if exists announcements_min_points_nonneg_ck;

alter table public.announcements
  add constraint announcements_min_points_nonneg_ck
  check (min_points is null or min_points >= 0);

comment on column public.announcements.min_points is 'Si no es null, solo alumnos con puntos totales (dashboard) >= este valor.';
comment on column public.announcements.require_enrolled_course_id is 'Si no es null, el alumno debe estar inscrito en este curso (además de pasar audiencia y fechas).';
comment on column public.announcements.visibility_conditions is 'Reglas extra JSON: { match: all|any, rules: [...] }. Preferido frente a columnas legacy.';
