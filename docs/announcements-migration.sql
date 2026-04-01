-- Avisos dinámicos (admin → estudiantes en dashboard).
-- Ejecutar en Supabase SQL Editor.
--
-- Nota: users.id en este proyecto es text (Clerk), no uuid — created_by debe ser text.
--
-- Storage (opcional, para subir imagen desde admin):
--   Crear bucket público `announcement-images` con política de lectura pública
--   y solo service role / políticas para upload (el app usa service role en API).

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text references public.users (id) on delete set null,
  is_active boolean not null default true,
  sort_order int not null default 0,

  badge_text text,
  title text,
  subtitle text,
  image_url text,

  content_mode text not null default 'text'
    check (content_mode in ('text', 'bullets')),
  body_section_label text,
  body_text text,
  body_items jsonb not null default '[]'::jsonb,
  buttons jsonb not null default '[]'::jsonb,

  audience text not null default 'all'
    check (audience in ('all', 'course')),
  course_id uuid references public.courses (id) on delete set null,

  starts_at timestamptz,
  ends_at timestamptz,

  min_points int,
  require_enrolled_course_id uuid references public.courses (id) on delete set null,
  visibility_conditions jsonb not null default '{"match":"all","rules":[]}'::jsonb,

  constraint announcements_course_audience_ck check (
    (audience = 'all' and course_id is null)
    or (audience = 'course' and course_id is not null)
  ),
  constraint announcements_min_points_nonneg_ck check (min_points is null or min_points >= 0)
);

create index if not exists announcements_active_sort_idx
  on public.announcements (is_active, sort_order, created_at desc);

create index if not exists announcements_course_idx
  on public.announcements (course_id)
  where audience = 'course';

comment on table public.announcements is 'Avisos del dashboard: contenido, audiencia, ventana de fechas.';
