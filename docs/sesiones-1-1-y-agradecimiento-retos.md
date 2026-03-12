# Sesiones 1:1 y tablero de agradecimientos / shoutouts

Documento de lógica actualizado. Revisar y luego implementar.

---

## 1. Tablero de agradecimientos / mensajes (general, no por reto)

### Idea

- Es **general**: no va atado a una entrega ni a un reto concreto.
- Cualquier alumno puede publicar algo tipo: “Felicito a X por proponer esto”, “Gracias a Y por la ayuda”, o cosas random que quieran compartir.
- Cada mensaje tiene:
  - **Categoría** que eligen (ej. Agradecimiento, Felicitación, Shoutout, Otro).
  - **Texto libre**.
  - **Anónimo o con nombre** (checkbox).

### Dónde se muestra

- Un **tablero** (página o sección) donde se listan estos mensajes.
- Con **animaciones con GSAP**: que “salten”, aparezcan con efecto, etc., para que se sienta vivo.

### Modelo de datos sugerido

Tabla nueva, ej. **`shoutouts`** (o `agradecimientos`):

| Campo            | Tipo      | Descripción                                      |
|------------------|-----------|--------------------------------------------------|
| id               | uuid      | PK                                               |
| user_id          | uuid      | FK users, nullable si `is_anonymous`              |
| message          | text      | Contenido del mensaje                            |
| category         | text      | Ej. `agradecimiento`, `felicitacion`, `shoutout` |
| is_anonymous     | boolean   | Si es true, no mostrar nombre                    |
| course_id        | uuid (FK) | Opcional, para filtrar por curso                 |
| created_at       | timestamptz | Cuándo se publicó                              |

- **Categorías**: definir lista fija (select en el formulario) o permitir texto libre; recomendación: lista fija (Agradecimiento, Felicitación, Shoutout, Otro).
- Quién puede publicar: alumnos (y opcionalmente admin). Solo lectura para todos en el tablero.

### Flujo

1. Alumno entra a “Agradecimientos” o “Tablero” (link en nav o dashboard).
2. Formulario: mensaje, categoría, checkbox “Publicar como anónimo”.
3. Submit → se guarda en `shoutouts`.
4. Tablero: se listan los mensajes (más recientes primero o aleatorio); si `is_anonymous` → mostrar “Alumno/a anónimo”; si no, nombre (y opcional avatar). Animaciones GSAP al montar o al hacer scroll.

---

## 2. Sesiones 1:1 (en vivo) – solo durante el curso

### Reglas

- **Cohort / live**: cada alumno tiene **2 sesiones 1:1** por curso.
- Esas 2 sesiones **solo se pueden agendar mientras el curso está vigente**. Si el curso termina el 24 de abril, a partir de esa fecha ya no pueden agendar (aunque no hayan usado las 2).
- Necesitamos una **fecha de fin de curso** (ej. en `courses`: `ends_at` o `end_date`). Si no existe, se puede usar la última `scheduled_at` de las lecciones del curso como proxy.

### Cómo saber si ya agendaron 2 veces (y el tema Calendly)

Usamos **Calendly** para que los alumnos reserven. El link se muestra solo si en nuestra BD ese alumno tiene &lt; 2 reservas para ese curso. Cuando el alumno reserva en Calendly, el **admin registra la reserva manualmente** en la página Sesiones 1:1 (formulario “Registrar reserva manual”): elige alumno, fecha/hora y guarda. Así el contador en la app es fiable y no dependemos de webhooks ni integraciones extra.

### Modelo de datos sugerido (1:1 en vivo)

- **`one_on_one_bookings`**: `id`, `user_id`, `course_id`, `scheduled_at` (lo pone el admin al registrar), `status` (scheduled | completed | cancelled), `source` (our_app cuando es registro manual), `created_at`.
- **`courses`**: `ends_at` para ocultar/deshabilitar la reserva cuando `today > ends_at`; `calendly_link_1to1` con la URL de Calendly.

### Lógica en la app

- Al cargar “Sesiones 1:1” para un curso en vivo:
  - Si `now > course.ends_at` → mensaje “Este curso ya terminó; no puedes agendar más sesiones 1:1.”
  - Si no: contar `one_on_one_bookings` donde `user_id = X` y `course_id = Y` y `status IN ('scheduled','completed')` (o solo scheduled, según cómo quieran contar).
  - Si count &lt; 2: mostrar botón/link a Calendly (o a nuestro selector de slots).
  - Si count >= 2: “Ya usaste tus 2 sesiones 1:1 para este curso.”

---

## 3. Sesiones on-demand: mensual grupal

### Reglas

- **On-demand** no tienen 1:1 individuales con esta lógica; tienen una **sesión grupal mensual**.
- Esa sesión la **agenda el admin cada mes** (fecha + link). Nosotros podemos:
  - Mostrar la **fecha sugerida** (último miércoles del mes 7pm Perú, o viernes si ese miércoles es feriado) como referencia, y/o
  - Dejar que el admin suba o pegue el **link** (Zoom/Meet) y la fecha real en nuestra app.
- Los alumnos **se unen con el link**; no “reservan” en nuestra app, solo ven “Próxima sesión grupal: [fecha] – [link]”.
- Si mencionas “tienen 2 también pero ese es grupal”: asumimos que son **2 sesiones grupales** (o 2 eventos al mes) hasta que lo aclares; se puede modelar como “hasta 2 sesiones grupales por mes” o simplemente “1 sesión mensual” y el admin pone el link. Cuando definas el “2” exacto, lo reflejamos en la UI (ej. listar 2 fechas/links).

### Modelo de datos sugerido (sesión grupal on-demand)

- Tabla **`on_demand_group_sessions`** (o similar): `id`, `scheduled_at`, `link` (url), `title` (opcional), `created_at`. El admin crea/edita un registro por sesión mensual y opcionalmente nosotros pre-rellenamos `scheduled_at` con “último miércoles 7pm Lima” o “viernes si feriado” para ayudarle.

### Feriados Perú

- Para la **fecha sugerida** del mes: si el último miércoles cae en feriado Perú → sugerir el viernes de esa semana, 7pm Lima. Lista de feriados en código o tabla `peru_holidays` (solo fecha). Ver lista de referencia en la sección anterior del doc o en web.

---

## 4. Resumen de implementación

| Feature | Qué hacer |
|--------|-----------|
| **Tablero agradecimientos** | Tabla `shoutouts` (message, category, is_anonymous, user_id, course_id opcional). Formulario público + página tablero con GSAP (entradas que salten / animen). |
| **1:1 en vivo** | Cuota 2 por curso; solo si `now <= course.ends_at`. Calendly para reservar; el admin registra cada reserva en la app. Tabla `one_on_one_bookings`. |
| **On-demand grupal** | Tabla `on_demand_group_sessions`; admin carga fecha + link cada mes. UI alumno: “Próxima sesión grupal: [fecha] [link]”. Opcional: sugerir fecha con lógica último miércoles / viernes si feriado. |

Cuando definas si siguen con Calendly o pasan a slots propios, y cómo quieres el “2” en on-demand (1 vs 2 sesiones grupales), se puede bajar esto a migraciones y código paso a paso.
