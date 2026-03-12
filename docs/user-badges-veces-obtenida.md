# Conteo "veces obtenida" en insignias

En el dashboard, las insignias muestran un número cuando el usuario ha obtenido la misma insignia más de una vez (ej. "Builder" en Webflow y en Figma = 2).

## Estado actual

- **Frontend:** Ya se calcula `earnedCount` contando filas en `user_badges` por `badge_id` para el usuario.
- **Base de datos:** Si `user_badges` tiene restricción `UNIQUE(user_id, badge_id)`, solo puede haber una fila por usuario e insignia, por lo que el conteo siempre será 1.

## Para soportar múltiples veces por insignia

Hay dos opciones:

### Opción A: Añadir `course_id` a `user_badges`

Permitir la misma insignia por curso: una fila por (user_id, badge_id, course_id).

- Añadir columna `course_id` (UUID, nullable o not null según si hay insignias globales).
- Sustituir `UNIQUE(user_id, badge_id)` por `UNIQUE(user_id, badge_id, course_id)` (o el equivalente).
- Al otorgar una insignia, pasar el `course_id` del contexto (lección/desafío/curso).
- El frontend ya cuenta filas; seguirá funcionando sin cambios.

### Opción B: Columna `earned_count`

Mantener una sola fila por (user_id, badge_id) y un contador.

- Añadir columna `earned_count` (integer, default 1).
- Al otorgar de nuevo la misma insignia, hacer `UPDATE ... SET earned_count = earned_count + 1` (o insertar si no existe).
- En el dashboard, leer `earned_count` en lugar de contar filas.

Si quieres que prepare la migración SQL para la opción A o B, indícalo.
