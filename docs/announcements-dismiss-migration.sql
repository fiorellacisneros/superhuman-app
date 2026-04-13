-- Comportamiento al cerrar un aviso en el dashboard del estudiante.
-- Ejecutar en Supabase si la tabla announcements ya existe.

alter table public.announcements
  add column if not exists dismiss_behavior text not null default 'always_show'
  check (dismiss_behavior in ('always_show', 'remember_dismissal'));

comment on column public.announcements.dismiss_behavior is
  'always_show: al cerrar solo se oculta en esta sesión; remember_dismissal: al cerrar no vuelve a mostrarse en este navegador.';
