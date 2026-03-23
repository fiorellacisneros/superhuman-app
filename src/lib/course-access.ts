/**
 * Reglas de acceso por cohorte / curso paralelo / ventana de 1 año.
 *
 * - Plataforma (ver cursos, lecciones, entregar retos on-demand): hasta `access_expires_at`
 *   o 365 días desde `enrolled_at` si no hay columna en BD.
 * - Fase "en vivo" (contador de retos live, recordatorios, retos de cohorte): mientras
 *   `courses.ends_at` sea null o no haya pasado (fin del día UTC del `ends_at`).
 *
 * Puntos: ya van por `user_course_id` en `user_course_points` — no se mezclan entre cursos.
 * Retos: siempre ligados a `course_id` (salvo globales; ver nota en callers).
 *
 * Para emails (Resend): importar estas mismas funciones y filtrar destinatarios igual.
 */

export const PLATFORM_ACCESS_DAYS = 365;

const MS_PER_DAY = 86400000;

/** `ends_at` en BD suele ser `date`; tratamos fin del día UTC. */
export function courseLivePhaseEndMs(endsAt: string | null | undefined): number | null {
  if (endsAt == null || String(endsAt).trim() === '') return null;
  const day = String(endsAt).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = new Date(`${day}T23:59:59.999Z`).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Fin de la ventana de acceso a la plataforma para ese curso (ver contenido, on-demand, etc.).
 */
export function getPlatformAccessExpiresAtMs(
  enrolledAtIso: string | null | undefined,
  accessExpiresAtIso: string | null | undefined,
): number {
  if (accessExpiresAtIso) {
    const t = new Date(accessExpiresAtIso).getTime();
    if (Number.isFinite(t)) return t;
  }
  const startMs = enrolledAtIso ? new Date(enrolledAtIso).getTime() : Date.now();
  const base = Number.isFinite(startMs) ? startMs : Date.now();
  return base + PLATFORM_ACCESS_DAYS * MS_PER_DAY;
}

export function hasPlatformAccess(
  enrolledAtIso: string | null | undefined,
  accessExpiresAtIso: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  // Filas legacy sin fechas: no bloquear hasta que migren (access_expires_at / enrolled_at).
  if (!accessExpiresAtIso && !enrolledAtIso) return true;
  return nowMs <= getPlatformAccessExpiresAtMs(enrolledAtIso, accessExpiresAtIso);
}

/** Cohort / live en DB = todo lo que no es on_demand. */
export function isLiveEnrollment(accessType: string | null | undefined): boolean {
  return accessType !== 'on_demand';
}

/**
 * El curso sigue en fase "en vivo" para retos y avisos de cohorte.
 * `ends_at` null = sin fecha de cierre (sigue en vivo hasta que la pongas).
 */
export function isCourseLivePhaseActive(endsAt: string | null | undefined, nowMs: number = Date.now()): boolean {
  const endMs = courseLivePhaseEndMs(endsAt);
  if (endMs === null) return true;
  return nowMs <= endMs;
}

export type EnrollmentAccessInput = {
  course_id: string;
  access_type?: string | null;
  enrolled_at?: string | null;
  access_expires_at?: string | null;
};

/**
 * Cursos donde el alumno puede ver retos de cohorte / contarlos en "Desafíos".
 * On-demand: mientras tenga acceso a plataforma.
 * Live: acceso plataforma + curso aún en fase en vivo (`ends_at`).
 */
export function getEligibleCourseIdsForLiveChallenges(
  enrollments: EnrollmentAccessInput[],
  courseEndsAtById: Map<string, string | null | undefined>,
  nowMs: number = Date.now(),
): string[] {
  const ids = new Set<string>();
  for (const e of enrollments) {
    const cid = e.course_id;
    if (!cid) continue;
    if (!hasPlatformAccess(e.enrolled_at, e.access_expires_at, nowMs)) continue;
    const onDemand = e.access_type === 'on_demand';
    const endsAt = courseEndsAtById.get(cid);
    if (onDemand) {
      ids.add(cid);
      continue;
    }
    if (isCourseLivePhaseActive(endsAt ?? null, nowMs)) {
      ids.add(cid);
    }
  }
  return [...ids];
}

/** Cursos donde aún puede entrar al contenido (lista "Mis cursos", /courses/...). */
export function getCourseIdsWithPlatformAccess(
  enrollments: EnrollmentAccessInput[],
  nowMs: number = Date.now(),
): string[] {
  const ids = new Set<string>();
  for (const e of enrollments) {
    if (!e.course_id) continue;
    if (hasPlatformAccess(e.enrolled_at, e.access_expires_at, nowMs)) ids.add(e.course_id);
  }
  return [...ids];
}

/**
 * ¿Debe recibir recordatorios / mails operativos de retos de cohorte para este curso?
 * (Para cuando implementes Resend: mismo criterio.)
 */
export function shouldReceiveCohortChallengeComms(
  enrollment: EnrollmentAccessInput,
  courseEndsAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!hasPlatformAccess(enrollment.enrolled_at, enrollment.access_expires_at, nowMs)) return false;
  if (enrollment.access_type === 'on_demand') return false;
  return isCourseLivePhaseActive(courseEndsAt ?? null, nowMs);
}

export type ChallengeAccessInput = {
  course_id: string | null;
  available_for_on_demand?: boolean | null;
};

/**
 * Defensa en profundidad para POST de entregas: misma lógica que listados de retos.
 * Retos sin `course_id`: requieren al menos un curso con acceso a plataforma vigente.
 */
export function canUserSubmitToChallenge(
  enrollment: EnrollmentAccessInput | null,
  courseEndsAt: string | null | undefined,
  challenge: ChallengeAccessInput,
  nowMs: number,
  userHasAnyPlatformAccess: boolean,
): boolean {
  if (!challenge.course_id) {
    return userHasAnyPlatformAccess;
  }
  if (!enrollment?.course_id || enrollment.course_id !== challenge.course_id) return false;
  if (!hasPlatformAccess(enrollment.enrolled_at, enrollment.access_expires_at, nowMs)) return false;
  if (enrollment.access_type === 'on_demand') {
    return challenge.available_for_on_demand === true;
  }
  return isCourseLivePhaseActive(courseEndsAt ?? null, nowMs);
}
