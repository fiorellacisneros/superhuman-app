import type { SupabaseClient } from '@supabase/supabase-js';

export type PointsBreakdownItem = { label: string; pts: number };

export type CoursePointsBreakdown = {
  courseId: string;
  courseTitle: string;
  items: PointsBreakdownItem[];
  totalStored: number;
};

/**
 * Reconstruye un desglose explicativo de puntos por curso (asistencia, entregas aprobadas, Kahoot)
 * alineado con cómo se otorgan en la app. El total en BD puede diferir si hubo ajustes manuales.
 */
export async function getPointsBreakdownByCourse(
  supabase: SupabaseClient,
  userId: string,
  courseIds: string[],
): Promise<CoursePointsBreakdown[]> {
  if (courseIds.length === 0) return [];

  const { data: pointsByCourseRows } = await supabase
    .from('user_course_points')
    .select('course_id, points')
    .eq('user_id', userId);

  const [{ data: allLessons }, { data: allAttendance }, { data: allSubs }, { data: allKahoot }, { data: coursesList }] =
    await Promise.all([
      supabase.from('lessons').select('id, course_id, title').in('course_id', courseIds),
      supabase.from('attendance').select('lesson_id, lessons(course_id, title)').eq('user_id', userId),
      supabase
        .from('submissions')
        .select('submitted_at, challenge_id, challenges(course_id, deadline, title)')
        .eq('user_id', userId)
        .eq('approved', true),
      supabase.from('kahoot_results').select('lesson_id, points_earned, lessons(course_id, title)').eq('user_id', userId),
      supabase.from('courses').select('id, title').in('id', courseIds),
    ]);

  const courseTitles = new Map((coursesList ?? []).map((c) => [c.id, (c as { title: string | null }).title ?? 'Curso']));
  const pointsStoredByCourse = new Map(
    (pointsByCourseRows ?? []).map((r) => [r.course_id as string, (r as { points: number }).points ?? 0]),
  );
  const lessonsByCourse = new Map<string, { id: string; title: string }[]>();
  for (const l of allLessons ?? []) {
    const row = l as { id: string; course_id: string; title: string | null };
    if (!lessonsByCourse.has(row.course_id)) lessonsByCourse.set(row.course_id, []);
    lessonsByCourse.get(row.course_id)!.push({ id: row.id, title: row.title ?? 'Clase' });
  }
  const attendanceByCourse = new Map<string, number>();
  for (const a of allAttendance ?? []) {
    const lesson = (a as { lessons?: { course_id?: string } | null }).lessons;
    const cid = lesson?.course_id;
    if (cid) attendanceByCourse.set(cid, (attendanceByCourse.get(cid) ?? 0) + 1);
  }
  const PTS_ATT = 10;
  const PTS_ON_TIME = 30;
  const PTS_LATE = 15;

  const pointsBreakdownByCourse: CoursePointsBreakdown[] = [];
  for (const cid of courseIds) {
    const items: PointsBreakdownItem[] = [];
    const attCount = attendanceByCourse.get(cid) ?? 0;
    if (attCount > 0) {
      items.push({ label: `Asistencia (${attCount} clase${attCount !== 1 ? 's' : ''})`, pts: attCount * PTS_ATT });
    }
    for (const s of allSubs ?? []) {
      const ch = (s as { challenges?: { course_id?: string; deadline?: string; title?: string } | null }).challenges;
      if (ch?.course_id !== cid) continue;
      const deadline = ch.deadline ? new Date(ch.deadline).getTime() : null;
      const submittedAt = new Date((s as { submitted_at: string }).submitted_at).getTime();
      const pts = deadline != null && submittedAt <= deadline ? PTS_ON_TIME : PTS_LATE;
      const onTime = pts === PTS_ON_TIME;
      items.push({
        label: `Reto "${ch.title ?? 'Desafío'}" (${onTime ? 'a tiempo' : 'tarde'})`,
        pts,
      });
    }
    for (const k of allKahoot ?? []) {
      const lesson = (k as { lessons?: { course_id?: string; title?: string } | null }).lessons;
      if (lesson?.course_id !== cid) continue;
      const pts = (k as { points_earned?: number }).points_earned ?? 0;
      const title = lesson?.title ?? 'Clase';
      items.push({ label: `Kahoot: ${title}`, pts });
    }
    const totalStored = pointsStoredByCourse.get(cid) ?? 0;
    pointsBreakdownByCourse.push({
      courseId: cid,
      courseTitle: courseTitles.get(cid) ?? 'Curso',
      items,
      totalStored,
    });
  }
  pointsBreakdownByCourse.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
  return pointsBreakdownByCourse;
}
