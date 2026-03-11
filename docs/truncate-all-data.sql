-- Elimina TODA la data de Supabase para empezar con datos reales.
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.
--
-- IMPORTANTE después de ejecutar:
-- 1. Los usuarios de Clerk siguen existiendo; al iniciar sesión se crearán de nuevo en users.
-- 2. Vuelve a asignar el rol admin: node scripts/set-admin-role.mjs TU_USER_ID
-- 3. (Opcional) Ejecuta docs/badges-seed.sql para restaurar los badges por defecto.
--
-- Orden: primero tablas hijas (que referencian otras), luego las raíz.

TRUNCATE TABLE admin_audit_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE attendance RESTART IDENTITY CASCADE;
TRUNCATE TABLE submissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_badges RESTART IDENTITY CASCADE;
TRUNCATE TABLE enrollments RESTART IDENTITY CASCADE;
TRUNCATE TABLE challenges RESTART IDENTITY CASCADE;
TRUNCATE TABLE lessons RESTART IDENTITY CASCADE;
TRUNCATE TABLE courses RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE badges RESTART IDENTITY CASCADE;

-- Opcional: si quieres volver a tener los badges por defecto, ejecuta después:
-- docs/badges-seed.sql
