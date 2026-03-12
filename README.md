# Superhuman School

Experiencia web para la escuela de diseño **Superhuman School**: onboarding, panel de estudiante, cursos, retos, badges y ranking, construida sobre Astro.

## 🌟 Funcionalidades

- **Auth con Clerk**: login seguro (magic link / contraseña) y sesiones gestionadas por Clerk.
- **Dashboard de estudiante**:
  - Progreso por curso.
  - Próximas sesiones.
  - Badges ganadas.
- **Cursos y lecciones**:
  - Listado de cursos.
  - Vista de curso con módulos, clases y recursos.
- **Retos y submissions**:
  - Desafíos por curso.
  - Envío y revisión de entregas.
- **Ranking y gamificación**:
  - Ranking global y por curso.
  - Sistema de puntos y badges.
- **Panel admin** (interno):
  - Gestión de cursos, lecciones, alumnos, asistencia, retos y submissions.

## 🧱 Stack

- **Framework**: [Astro 5](https://docs.astro.build/)
- **Auth**: [Clerk](https://clerk.com/) (`@clerk/astro`, `@clerk/ui`)
- **Base de datos / backend**: [Supabase](https://supabase.com/) vía `@supabase/supabase-js`
- **Estilos**:
  - Tailwind CSS v4 (`@tailwindcss/postcss`, `tailwindcss`)
  - CSS global en `src/styles/global.css`
- **Otros**:
  - `flatpickr` para fechas
  - `bootstrap-icons` / `lucide-react` para iconografía
  - `resend` para emails transaccionales

## ▶️ Puesta en marcha local

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar variables de entorno**

   Crea un archivo `.env.local` en la raíz del proyecto con las claves de Clerk, Supabase y Resend. Los nombres exactos pueden variar según tu configuración, pero típicamente incluyen:

   ```bash
   # Clerk
   CLERK_PUBLISHABLE_KEY=...
   CLERK_SECRET_KEY=...

   # Supabase
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...

   # Emails (Resend)
   RESEND_API_KEY=...
   ```

   Revisa el código (especialmente `astro.config.mjs`, `src/lib` y las rutas de API en `src/pages/api/`) para confirmar los nombres exactos que usa este proyecto.

3. **Levantar el entorno de desarrollo**

   ```bash
   npm run dev
   ```

   Por defecto se sirve en `http://localhost:4321`.

## 📂 Estructura básica del proyecto

Lo más relevante:

```text
/
├── public/                 # Assets estáticos
├── src/
│   ├── components/         # Componentes compartidos
│   ├── layouts/            # Layouts como DashboardLayout, AdminLayout, etc.
│   ├── lib/                # Helpers (supabase, formatos de fecha, etc.)
│   ├── pages/
│   │   ├── index.astro     # Landing + login
│   │   ├── dashboard/      # Panel de estudiante
│   │   ├── courses/        # Cursos, clases y vistas de curso
│   │   ├── challenges/     # Retos
│   │   ├── leaderboard/    # Ranking
│   │   └── admin/          # Panel admin (cursos, alumnos, retos, asistencia…)
│   └── styles/
│       └── global.css      # Design system base (tipografía, colores, botones…)
└── package.json
```

## 🧪 Scripts disponibles

Todos se ejecutan desde la raíz del proyecto:

| Comando           | Descripción                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server en `localhost:4321`                |
| `npm run build`   | Build de producción en `./dist`               |
| `npm run preview` | Previsualizar el build localmente             |
| `npm run astro`   | Ejecutar comandos de la CLI de Astro         |

## 🚀 Despliegue

El proyecto está preparado para desplegarse en **Vercel** usando la integración `@astrojs/vercel`.  

En general:

1. Configura las mismas variables de entorno de `.env.local` en el panel de Vercel.
2. Haz build en Vercel (o ejecuta `npm run build` en tu pipeline).
3. Verifica que las rutas protegidas por Clerk funcionen correctamente en el dominio final.

## ✨ Próximos pasos de diseño

El login actualmente usa el **widget preconstruido de Clerk en modo dark** dentro del hero de Astro.  
Cuando el design system esté cerrado para auth, se puede:

- Pasar a un formulario **headless** usando Clerk solo como backend de auth.
- Reutilizar los componentes de botones e inputs definidos en `global.css` para que la experiencia de login sea 100% Superhuman.
