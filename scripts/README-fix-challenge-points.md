# Script: `fix-challenge-points.mjs`

Corrige `user_course_points` cuando las entregas se aprobaron con una **lógica vieja** y ahora la app suma **valor del reto + 30** por entrega a tiempo.

## Qué necesitas

| Dónde | Qué |
|--------|-----|
| Entorno | `SUPABASE_URL` y **`SUPABASE_SERVICE_ROLE_KEY`** (rol servicio; no la anon key) |
| Obligatorio | `--legacy-model=…` (ver abajo) |
| Opcional | `--user-id=…` (Clerk, ej. `user_xxx`) para un solo alumno |
| Opcional | `--course-id=…` (UUID del curso en Supabase) |
| Opcional | `--reviewed-before=2026-03-20T12:00:00.000Z` solo entregas aprobadas **antes** de esa fecha (útil para no tocar lo ya corregido) |

## Modelos legacy (`--legacy-model`)

- **`rewardOnly`** — Lo que tenías recién: al aprobar a tiempo se sumaba **solo** `points_reward` (ej. 50), **sin** el +30 de “entrega a tiempo”.  
  - Delta típico por entrega a tiempo: **+30**.

- **`fixed30`** — Muy antiguo: **30** a tiempo / **15** tarde, sin usar `points_reward`.  
  - El delta depende del `points_reward` del reto (ej. si el reto vale 50 y a tiempo: pasa de 30 a 80 → **+50**).

Elige el modelo que refleje **cómo se sumaron en realidad** esos puntos cuando aprobaste.

## Uso

```bash
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# 1) Ver qué haría (no escribe nada)
node scripts/fix-challenge-points.mjs --legacy-model=rewardOnly --dry-run

# 2) Un solo usuario
node scripts/fix-challenge-points.mjs --legacy-model=rewardOnly --dry-run --user-id=user_ABC123

# 3) Aplicar
node scripts/fix-challenge-points.mjs --legacy-model=rewardOnly --apply --user-id=user_ABC123
```

También puedes añadir en `package.json`:

```json
"scripts": {
  "fix:challenge-points": "node scripts/fix-challenge-points.mjs"
}
```

y luego: `npm run fix:challenge-points -- --legacy-model=rewardOnly --dry-run`

## Importante

- Corre siempre **`--dry-run`** primero y revisa el listado por submission y el resumen Δ.
- **`--apply`** suma los deltas sobre el total actual de `user_course_points`. Si corres dos veces el mismo ajuste, **duplicarías** puntos: usa `--reviewed-before` o `--user-id` para acotar.
- Si mezclas aprobaciones viejas y nuevas, limita por **`--reviewed-before`** a la fecha en que subiste el código nuevo.
