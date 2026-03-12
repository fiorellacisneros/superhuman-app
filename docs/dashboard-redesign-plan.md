# Plan: Rediseño del dashboard (sidebar + contenido)

Objetivo: alinear la app con el diseño de referencia (Frame 59): sidebar izquierda, header con logo y usuario, y secciones **Mis cursos**, **Mi horario**, **Ranking general**, **Insignias generales**.

---

## Resumen del diseño de referencia

- **Header (arriba):** logo "SPRhmn School" a la izquierda; a la derecha perfil (nombre, email, avatar, dropdown).
- **Sidebar (izquierda):**
  - Saludo: "Hola, [Nombre]"
  - Nav vertical: dashboard, Mis cursos, Superhumans (directorio), ranking, beneficios, 1:1
  - Abajo: "tema"
- **Contenido principal:**
  - **Mis cursos:** cards de cursos con imagen, título y barra de progreso (amarillo/azul).
  - **Mi horario:** próximas clases de **todos los cursos inscritos** (quien lleva varios en paralelo ve todo junto).
  - **Ranking general:** puntajes **acumulados** (suma de todos los cursos del usuario) y comparación con otros.
  - **Insignias generales:** todas las insignias que el usuario va acumulando (de cualquier curso).

---

## Fase 1: Sidebar izquierda (desktop)

### 1.1 Layout con sidebar

- En **desktop (md+):**
  - Estructura: `[sidebar fija] [header + main]`.
  - Sidebar: ancho fijo (~240–260px), fondo `bg-background`, borde derecho `border-border`.
  - Contenido principal: flex-grow, con header arriba y `<main>` debajo.
- El **header** deja de tener la nav horizontal; solo logo + usuario (como en la referencia).
- La **navegación** pasa a la sidebar (solo desktop por ahora).

### 1.2 Contenido de la sidebar

- Arriba: **"Hola, [displayName]"** (tipografía grande, como en la referencia).
- Lista de enlaces verticales:
  - **dashboard** → `/dashboard`
  - **Mis cursos** → `/courses`
  - **Superhumans (directorio)** → `/superhumans`
  - **ranking** → `/leaderboard`
  - **Retos** → `/challenges` (mantener por funcionalidad; en la referencia no aparece, se puede agrupar o renombrar después).
  - **beneficios** → enlace placeholder (`#` o ruta futura).
  - **1:1** → enlace placeholder.
- Abajo de la lista: **"tema"** (placeholder; luego se puede conectar a toggle claro/oscuro).

### 1.3 Estados del ítem activo (sidebar)

- Ítem activo: fondo tipo pill (negro o muy oscuro en el diseño), texto blanco, icono claro.
- Inactivos: texto blanco/gris, iconos discretos.

### 1.4 Mobile

- **Opción A (recomendada):** mantener la bottom nav actual en móvil; en desktop mostrar la sidebar. Sin hamburger por ahora.
- **Opción B:** en móvil, header con menú hamburger que abre un drawer con la misma lista de la sidebar.

Fase 1 se considera lista cuando: en desktop se ve la sidebar con saludo, enlaces y "tema", y el header solo tiene logo + usuario.

---

## Fase 2: Contenido del dashboard (labels y estructura)

Sin cambiar lógica de datos aún, unificar textos y estructura con el diseño.

### 2.1 Títulos de sección

- **Mis cursos** → ya existe; mantener.
- **Próximas clases / Mi horario** → usar siempre **"Mi horario"** y opcionalmente un subtítulo tipo "Próximas clases de todos tus cursos".
- **Ranking** (en el widget del dashboard) → **"Ranking general"** y aclarar en copy que son puntos acumulados (todos los cursos).
- **Insignias** → **"Insignias generales"** y subtítulo tipo "Completa cursos y desafíos".

### 2.2 Orden y maquetas (desktop)

- Orden sugerido en la referencia: Mis cursos (arriba) → Mi horario → Ranking general → Insignias generales.
- En desktop se puede usar grid:
  - Columna ancha: Mis cursos (grid de cards) + bloque Mi horario (lista con línea amarilla en el ítem actual/próximo).
  - Columna estrecha: Ranking general (lista numerada con iconos azules) + Insignias generales (grid de badges).
- Ajustar espaciado y cards para que coincidan con el diseño (fondos `gray`, bordes, tipografía).

### 2.3 Barras de progreso (Mis cursos)

- En la referencia las barras usan **amarillo** y **azul** (dos segmentos). Opción: implementar dos tramos (ej. completado = amarillo, en progreso = azul) o dejar una sola barra amarilla y en una segunda iteración añadir el azul.

### 2.4 Mi horario

- Mantener datos actuales: `upcomingLessons` ya viene de **todos** los cursos inscritos (`in('course_id', enrolledIds)`).
- En la lista, línea amarilla vertical en el ítem de la próxima clase (ya se hace con `isNext` y `border-l-lime`).
- Formato de cada ítem: fecha/hora, título de la clase, curso (ej. "Webflow Camp - Cohort 01").

Fase 2 lista cuando: el dashboard muestra los cuatro bloques con los títulos "Mis cursos", "Mi horario", "Ranking general", "Insignias generales" y la estructura se acerca al diseño.

---

## Fase 3: Datos y comportamiento (opcional / refinamiento)

### 3.1 Ranking general

- **Hoy:** ranking por cohorte (mismos cursos) y puntos sumados por `user_course_points` en esos cursos = ya es "acumulado" por usuario en sus cursos.
- **Para "general" a nivel escuela:** si se desea un ranking de todos los estudiantes (todos los cursos), haría falta una vista o agregación que sume puntos de cada usuario en todos sus cursos (o una columna `users.total_points` actualizada). Por ahora se puede dejar el ranking por cohorte y solo cambiar el label a "Ranking general" (acumulado de tus cursos).

### 3.2 Insignias generales

- Ya se muestran todas las insignias del usuario (`user_badges` + todas las `badges`). Solo falta el label "Insignias generales" y el copy "Completa cursos y desafíos".

### 3.3 Beneficios y 1:1

- Añadir rutas placeholder o páginas vacías para "beneficios" y "1:1" cuando se definan.

### 3.4 Tema (claro/oscuro)

- Añadir toggle en la sidebar ("tema") y variable CSS/estado para tema claro/oscuro cuando se decida soportarlo.

---

## Orden de implementación sugerido

| Orden | Tarea |
|-------|--------|
| 1 | Crear estructura HTML/CSS del layout con sidebar (desktop) en `DashboardLayout.astro`. |
| 2 | Mover navegación del header a la sidebar; dejar en el header solo logo + usuario. |
| 3 | Añadir saludo "Hola, [nombre]" y ítem "tema" en la sidebar. |
| 4 | Ajustar enlaces de la sidebar (dashboard, Mis cursos, Superhumans (directorio), ranking, beneficios, 1:1; Retos si se mantiene). |
| 5 | En la página del dashboard: renombrar secciones a "Mi horario", "Ranking general", "Insignias generales" y ajustar grid/orden. |
| 6 | (Opcional) Barras de progreso amarillo/azul en cards de Mis cursos. |
| 7 | (Opcional) Páginas o enlaces placeholder para beneficios y 1:1; luego tema claro/oscuro. |

---

## Archivos principales a tocar

- `src/layouts/DashboardLayout.astro` — sidebar, header, estructura del layout.
- `src/pages/dashboard/index.astro` — títulos de secciones, orden y estructura de bloques.
- `src/styles/global.css` — si hace falta alguna clase para sidebar o tema.
- (Futuro) Componente reutilizable de ítem de sidebar si se usa en más sitios.

Cuando quieras, podemos bajar esto a tareas concretas por commit (por ejemplo: "Fase 1.1 – Layout con sidebar en DashboardLayout") y aplicar los cambios paso a paso.
