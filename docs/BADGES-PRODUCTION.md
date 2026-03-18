# Insignias de producción (referencia)

## Cómo se ganan hoy (en la app)

| Origen | Insignias |
|--------|-----------|
| **Al aprobar entregas** | `first_submission`, `early_bird`, `streak_3` |
| **Al marcar asistencia** | `first_attendance`, `attendance_streak_3` |
| **Resto** | Depende del tipo (p. ej. `night_owl`, `on_time`, `module_complete`, `course_complete` si el código las otorga o las rellenáis en BD). |

## Catálogo (tras merge + sin Puntual)

| `condition_type`       | Nombre en app     |
|------------------------|-------------------|
| `first_submission`     | First Submission  |
| `streak_3`             | On a Roll         |
| `early_bird`           | Early Bird        |
| `module_complete`      | Builder           |
| `course_complete`      | Superhuman        |
| `night_owl`            | Night Owl         |
| `on_time`              | On Time           |
| `first_attendance`     | Present           |
| `attendance_streak_3`  | Consistent        |

**Quitar Puntual y renombrar primera entrega:** `docs/supabase-remove-puntual-first-submission-en.sql`  
**Merge duplicados seed (histórico):** `docs/supabase-badges-merge-your-uuids.sql`

Las **descripciones** en español van en `description` en Supabase.
