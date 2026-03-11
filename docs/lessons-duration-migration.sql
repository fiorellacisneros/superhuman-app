-- Duración por clase (minutos)
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- Por defecto 120 min (7pm-9pm). Demo Day 180 (10am-1pm). Automatizaciones 60 (8:15-9:15pm).

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_minutes int DEFAULT 120;

COMMENT ON COLUMN lessons.duration_minutes IS 'Duración de la clase en minutos. Default 120 (7-9pm).';
