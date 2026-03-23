# Acceso a plataforma, cohortes y retos

## 1 año de contenido

- **`enrollments.access_expires_at`**: fin de la ventana para ver cursos, clases y retos on-demand. La API de admin la setea al inscribir (típicamente **+1 año** desde `enrolled_at`).
- Si `access_expires_at` y `enrolled_at` faltan (legacy), la app **no corta** el acceso hasta migrar datos.
- Migración SQL: `docs/supabase-enrollments-access-expires-at.sql`.

## Cohortes en paralelo y cursos distintos

- **Un curso por cohorte** (filas distintas en `courses` con su propio `ends_at`) evita mezclar alumnos y fechas.
- **`courses.ends_at`**: fin de la fase **en vivo** (UTC, fin de día). Después de esa fecha, alumnos **cohorte** dejan de ver retos “live” en UI y en `POST /api/challenges`, pero siguen viendo contenido mientras **`hasPlatformAccess`** sea verdadero.
- **On-demand**: retos marcados `available_for_on_demand` mientras haya acceso de plataforma (no dependen de `ends_at` para mostrarse).

## Puntos

- Van por **`user_course_id` / `course_id`** en `user_course_points` — no se cruzan entre cursos.

## Correos (futuro)

- Usar **`shouldReceiveCohortChallengeComms`** en `src/lib/course-access.ts` para el mismo criterio que la UI (plataforma vigente + cohorte en vivo, no on-demand).

## Archivos clave

- `src/lib/course-access.ts` — reglas centralizadas.
- Listados y bloqueos: `dashboard`, `DashboardLayout`, `courses/*`, `challenges`, `POST /api/challenges`.
