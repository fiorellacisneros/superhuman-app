import type { SupabaseClient } from '@supabase/supabase-js';

/** Ventana para cargar clases pasadas (asistencia / Kahoot). */
export const FOLLOWUP_ATTENDANCE_DAYS = 45;

/** Solo las faltas a clases en los últimos N días cuentan como críticas. */
export const FOLLOWUP_CRITICAL_ABSENCE_DAYS = 14;

/**
 * Kahoot: podio 5º = 15 pts, participación = 5. Menos de este valor = puntaje bajo (sin podio).
 * No usamos “asistió o no”: sin fila en kahoot_results no cuenta en esta métrica.
 */
export const FOLLOWUP_KAHOOT_LOW_POINTS_THRESHOLD = 15;

export type FollowUpStudentRow = {
  userId: string;
  name: string;
  email: string | null;
  avatarId: string | null;
  /** Retos activos relevantes sin ninguna entrega (submission). */
  pendingChallengeCount: number;
  /** Faltas a clases live en los últimos FOLLOWUP_CRITICAL_ABSENCE_DAYS días. */
  recentMissedClassCount: number;
  /**
   * Clases con Kahoot ya cargado donde el alumno tiene resultado y puntos &lt; FOLLOWUP_KAHOOT_LOW_POINTS_THRESHOLD.
   */
  kahootLowScoreCount: number;
  /** Texto listo para mostrar (una línea). */
  summaryLine: string;
};

export function buildFollowUpSummaryLine(
  row: Pick<FollowUpStudentRow, 'pendingChallengeCount' | 'recentMissedClassCount' | 'kahootLowScoreCount'>,
): string {
  const parts: string[] = [];
  const p = row.pendingChallengeCount;
  const a = row.recentMissedClassCount;
  const k = row.kahootLowScoreCount;
  if (p > 0) {
    parts.push(p === 1 ? '1 reto sin entregar' : `${p} retos sin entregar`);
  }
  if (a > 0) {
    parts.push(
      a === 1 ? '1 falta reciente a clase live' : `${a} faltas recientes a clase live`,
    );
  }
  if (k > 0) {
    parts.push(
      k === 1
        ? `1 Kahoot con puntaje bajo (<${FOLLOWUP_KAHOOT_LOW_POINTS_THRESHOLD} pts)`
        : `${k} Kahoot con puntaje bajo (<${FOLLOWUP_KAHOOT_LOW_POINTS_THRESHOLD} pts)`,
    );
  }
  return parts.join(' · ');
}

export async function buildAdminFollowUpReport(
  supabase: SupabaseClient,
  options?: { courseId?: string | null },
): Promise<FollowUpStudentRow[]> {
  const courseFilter = options?.courseId?.trim() || null;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - FOLLOWUP_ATTENDANCE_DAYS);
  const recentAbsenceCutoff = new Date(now);
  recentAbsenceCutoff.setDate(recentAbsenceCutoff.getDate() - FOLLOWUP_CRITICAL_ABSENCE_DAYS);

  const { data: studentRows } = await supabase
    .from('users')
    .select('id, display_name, email, avatar_id')
    .eq('role', 'student');

  let enrollQuery = supabase.from('enrollments').select('user_id, course_id, access_type');
  if (courseFilter) enrollQuery = enrollQuery.eq('course_id', courseFilter);
  const { data: enrollmentRows } = await enrollQuery;

  const studentIds = new Set((studentRows ?? []).map((s) => s.id as string));

  const userEnrollInfo = new Map<string, { courseIds: string[]; onDemand: Set<string> }>();
  for (const e of enrollmentRows ?? []) {
    const uid = e.user_id as string;
    if (!studentIds.has(uid)) continue;
    const cid = e.course_id as string;
    if (!userEnrollInfo.has(uid)) userEnrollInfo.set(uid, { courseIds: [], onDemand: new Set() });
    const inf = userEnrollInfo.get(uid)!;
    inf.courseIds.push(cid);
    if ((e.access_type as string) === 'on_demand') inf.onDemand.add(cid);
  }

  const students = (studentRows ?? []).filter((s) => {
    if (!courseFilter) return true;
    return userEnrollInfo.has(s.id as string);
  });

  let challengeQuery = supabase
    .from('challenges')
    .select('id, course_id, title, deadline, available_for_on_demand')
    .eq('is_active', true);
  if (courseFilter) {
    challengeQuery = challengeQuery.or(`course_id.eq.${courseFilter},course_id.is.null`);
  }
  const { data: challengeRows } = await challengeQuery;

  const challenges = (challengeRows ?? []) as {
    id: string;
    course_id: string | null;
    title: string | null;
    deadline: string | null;
    available_for_on_demand: boolean | null;
  }[];

  const challengeIds = challenges.map((c) => c.id);
  const courseTitleById = new Map<string, string>();

  const courseIdsNeeded = new Set<string>();
  for (const c of challenges) {
    if (c.course_id) courseIdsNeeded.add(c.course_id);
  }
  for (const e of enrollmentRows ?? []) {
    courseIdsNeeded.add(e.course_id as string);
  }

  if (courseIdsNeeded.size > 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', [...courseIdsNeeded]);
    for (const row of coursesData ?? []) {
      courseTitleById.set(row.id as string, (row.title as string) ?? 'Curso');
    }
  }

  let submissions: { challenge_id: string; user_id: string }[] = [];
  if (challengeIds.length > 0) {
    const { data: subRows } = await supabase
      .from('submissions')
      .select('challenge_id, user_id')
      .in('challenge_id', challengeIds);
    submissions = (subRows ?? []) as { challenge_id: string; user_id: string }[];
  }

  const submittedByUser = new Map<string, Set<string>>();
  for (const s of submissions) {
    const uid = s.user_id as string;
    const cid = s.challenge_id as string;
    if (!submittedByUser.has(uid)) submittedByUser.set(uid, new Set());
    submittedByUser.get(uid)!.add(cid);
  }

  function relevantChallengesForUser(uid: string): typeof challenges {
    const info = userEnrollInfo.get(uid);
    if (!info) return [];
    const enrolledUnique = [...new Set(info.courseIds)];
    const onDemand = info.onDemand;
    return challenges.filter((c) => {
      const cc = c.course_id;
      if (!cc) return true;
      if (!enrolledUnique.includes(cc)) return false;
      if (onDemand.has(cc)) return c.available_for_on_demand === true;
      return true;
    });
  }

  let lessonQuery = supabase
    .from('lessons')
    .select('id, title, scheduled_at, course_id, courses(title)')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now.toISOString())
    .gte('scheduled_at', cutoff.toISOString());
  if (courseFilter) lessonQuery = lessonQuery.eq('course_id', courseFilter);
  const { data: lessonRows } = await lessonQuery.order('scheduled_at', { ascending: false });

  const lessons = (lessonRows ?? []) as {
    id: string;
    title: string | null;
    scheduled_at: string;
    course_id: string;
    courses: { title: string | null } | null;
  }[];

  const lessonIds = lessons.map((l) => l.id);

  const liveEnrolledByCourse = new Map<string, Set<string>>();
  for (const e of enrollmentRows ?? []) {
    if ((e.access_type as string) === 'on_demand') continue;
    const uid = e.user_id as string;
    if (!studentIds.has(uid)) continue;
    const cid = e.course_id as string;
    if (!liveEnrolledByCourse.has(cid)) liveEnrolledByCourse.set(cid, new Set());
    liveEnrolledByCourse.get(cid)!.add(uid);
  }

  const attendanceByLesson = new Map<string, Set<string>>();
  if (lessonIds.length > 0) {
    const { data: attRows } = await supabase
      .from('attendance')
      .select('user_id, lesson_id')
      .in('lesson_id', lessonIds);
    for (const a of attRows ?? []) {
      const lid = a.lesson_id as string;
      const uid = a.user_id as string;
      if (!attendanceByLesson.has(lid)) attendanceByLesson.set(lid, new Set());
      attendanceByLesson.get(lid)!.add(uid);
    }
  }

  /** lessonId -> userId -> points_earned */
  const kahootPointsByLesson = new Map<string, Map<string, number>>();
  if (lessonIds.length > 0) {
    const { data: kahootRows } = await supabase
      .from('kahoot_results')
      .select('lesson_id, user_id, points_earned')
      .in('lesson_id', lessonIds);
    for (const r of kahootRows ?? []) {
      const lid = r.lesson_id as string;
      const uid = r.user_id as string;
      const pts = Number(r.points_earned ?? 0);
      if (!kahootPointsByLesson.has(lid)) kahootPointsByLesson.set(lid, new Map());
      kahootPointsByLesson.get(lid)!.set(uid, Number.isFinite(pts) ? pts : 0);
    }
  }

  const pendingChallengeCountByUser = new Map<string, number>();
  const recentMissCountByUser = new Map<string, number>();
  const kahootLowScoreCountByUser = new Map<string, number>();

  for (const st of students) {
    const uid = st.id as string;
    const rel = relevantChallengesForUser(uid);
    const sub = submittedByUser.get(uid) ?? new Set();
    let pending = 0;
    for (const c of rel) {
      if (sub.has(c.id)) continue;
      pending += 1;
    }
    if (pending > 0) pendingChallengeCountByUser.set(uid, pending);
  }

  for (const lesson of lessons) {
    const lid = lesson.id;
    const courseId = lesson.course_id;
    const scheduledAt = lesson.scheduled_at;
    const lessonTime = new Date(scheduledAt).getTime();
    const isRecentAbsence = lessonTime >= recentAbsenceCutoff.getTime();

    const enrolledLive = liveEnrolledByCourse.get(courseId);
    if (!enrolledLive || enrolledLive.size === 0) continue;

    const present = attendanceByLesson.get(lid) ?? new Set();
    for (const uid of enrolledLive) {
      if (present.has(uid)) continue;
      if (!isRecentAbsence) continue;
      recentMissCountByUser.set(uid, (recentMissCountByUser.get(uid) ?? 0) + 1);
    }

    const pointsMap = kahootPointsByLesson.get(lid);
    if (!pointsMap || pointsMap.size === 0) continue;

    for (const uid of enrolledLive) {
      const pts = pointsMap.get(uid);
      if (pts === undefined) continue;
      if (pts < FOLLOWUP_KAHOOT_LOW_POINTS_THRESHOLD) {
        kahootLowScoreCountByUser.set(uid, (kahootLowScoreCountByUser.get(uid) ?? 0) + 1);
      }
    }
  }

  const rows: FollowUpStudentRow[] = [];
  for (const st of students) {
    const uid = st.id as string;
    const pendingChallengeCount = pendingChallengeCountByUser.get(uid) ?? 0;
    const recentMissedClassCount = recentMissCountByUser.get(uid) ?? 0;
    const kahootLowScoreCount = kahootLowScoreCountByUser.get(uid) ?? 0;
    if (pendingChallengeCount === 0 && recentMissedClassCount === 0 && kahootLowScoreCount === 0) continue;

    const base = {
      pendingChallengeCount,
      recentMissedClassCount,
      kahootLowScoreCount,
    };
    rows.push({
      userId: uid,
      name: (st.display_name as string | null) ?? 'Estudiante',
      email: (st.email as string | null) ?? null,
      avatarId: (st.avatar_id as string | null) ?? null,
      ...base,
      summaryLine: buildFollowUpSummaryLine(base),
    });
  }

  function score(r: FollowUpStudentRow): number {
    return r.pendingChallengeCount + r.recentMissedClassCount + r.kahootLowScoreCount;
  }

  rows.sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, 'es');
  });

  return rows;
}
