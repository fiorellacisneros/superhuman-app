# Superhuman School — Project Context

## What is this?
A gamified learning platform for design/Webflow courses. Students join via email invitation, complete challenges, earn points and badges, and see a leaderboard. Admins manage courses, lessons, challenges, and badge assignments.

## Tech Stack
- **Framework:** Astro (SSR mode)
- **Styling:** Tailwind CSS
- **Auth:** Clerk (email invitations, two roles: admin / student)
- **Database:** Supabase (PostgreSQL + realtime for leaderboard)
- **Hosting:** Vercel
- **Email:** Resend (badge and achievement notifications)

## Roles
### Admin (restricted to specific emails)
- Create and manage courses
- Add lessons to courses (zoom link, video URL, downloadable resources, external links)
- Enroll students via email invitation
- Create challenges: title, description, deadline, points reward, active/scheduled
- Review student submissions (link-based) and approve/reject
- Create badges and assign conditions
- View all students, their points and badges

### Student
- Join via email invitation link
- Select an avatar (from predefined SVG list)
- View enrolled courses and lessons
- View active challenges and submit a link (Webflow, Figma, etc.)
- View earned badges (active + locked states)
- View leaderboard (all students ordered by points)
- Download earned badges

## Database Schema (Supabase)

```sql
users
  id, email, role (admin | student), avatar_id, points, created_at

courses
  id, title, description, created_by (user_id), created_at

lessons
  id, course_id, title, zoom_link, video_url, resources (jsonb array of {label, url}), order, created_at

enrollments
  user_id, course_id, enrolled_at

challenges
  id, course_id, title, description, deadline, points_reward, is_active, scheduled_at, created_at

submissions
  id, challenge_id, user_id, link, submitted_at, reviewed (bool), approved (bool), reviewed_at

badges
  id, name, description, image_url, condition_type (manual | first_submission | streak_3 | module_complete | course_complete | early_bird)

user_badges
  user_id, badge_id, earned_at

attendance
  user_id, lesson_id, confirmed_at
```

## Points System
| Action | Points |
|---|---|
| Attend a lesson | 10 |
| Submit challenge on time | 30 |
| Submit challenge late | 15 |
| First to submit in group | +10 bonus |
| Complete full module | 50 |

## Badges (MVP)
- **Primera entrega** — submitted first challenge
- **En racha** — attended 3 lessons in a row
- **Early bird** — first student to submit a challenge
- **Módulo completo** — completed all lessons in a module
- **Puntual** — submitted before deadline
- **Curso completo** — finished entire course

Each badge has two visual states: active (earned) and locked (grayed out).

## Leaderboard
- Single leaderboard ordered by total points
- No numeric positions shown — focus on celebration of participation
- Realtime updates via Supabase

## Assets Needed (from designer)
- 8–12 avatar SVGs (aspirational / superhero vibe)
- Badge SVGs: active + locked state for each badge (12 SVGs total)
- App logo / favicon
- Empty state illustration (no active challenges yet)
- Success illustration (challenge submitted / badge earned)
- Dashboard background pattern or decorative element

UI icons (arrows, menus, checks, etc.) → use Lucide Icons, do not design these.

## Key User Flows

### Student onboarding
1. Admin enrolls student email
2. Clerk sends invitation email with magic link
3. Student clicks link → creates account → selects avatar → lands on dashboard

### Challenge submission
1. Student sees active challenge with deadline countdown
2. Pastes a link (Webflow, Figma, etc.) → submits
3. Admin sees submission in review panel → approves
4. Points added to student → badge triggered if condition met
5. Resend sends email notification to student

### Admin creates a challenge
1. Admin goes to challenge panel → create new
2. Fills title, description, points reward, deadline
3. Chooses: activate now OR schedule for later
4. Challenge appears in student dashboard when active

## Project Structure
```
/src
  /pages
    /dashboard         → student dashboard
    /courses           → course and lesson views
    /challenges        → active challenges + submission form
    /leaderboard       → points leaderboard
    /badges            → badge collection view
    /admin
      /courses         → create/edit courses and lessons
      /challenges      → create/schedule challenges
      /students        → manage students, view progress
      /badges          → create badges, assign manually
  /components
    /ui                → shared UI components
    /game              → leaderboard, badge card, avatar selector
  /lib
    /supabase.ts       → supabase client
    /clerk.ts          → clerk helpers
    /points.ts         → points engine
    /badges.ts         → badge condition checker
    /resend.ts         → email helpers
  /layouts
    DashboardLayout.astro
    AdminLayout.astro
```

## Rules for AI (Cursor)
- Always use TypeScript
- Use Tailwind for all styling, no inline styles
- Use Lucide Icons for all UI icons
- All Supabase queries go through /lib/supabase.ts
- Badge conditions are checked in /lib/badges.ts after every submission approval
- Points are added in /lib/points.ts, never directly in page/component files
- Admin routes must check role === 'admin' server-side, never client-side only
- Keep components small and single-responsibility
