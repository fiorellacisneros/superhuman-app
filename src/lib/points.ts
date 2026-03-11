export type PointsEventType =
  | 'lesson_attended'
  | 'challenge_submitted_on_time'
  | 'challenge_submitted_late'
  | 'first_submission'
  | 'module_completed';

export const POINT_VALUES: Record<PointsEventType, number> = {
  lesson_attended: 10,
  challenge_submitted_on_time: 30,
  challenge_submitted_late: 15,
  first_submission: 10,
  module_completed: 50,
};

export const calculatePointsForEvent = (type: PointsEventType): number => {
  return POINT_VALUES[type] ?? 0;
};

export type AddPointsOptions = {
  userId: string;
  type: PointsEventType;
  courseId: string;
  supabase: import('@supabase/supabase-js').SupabaseClient;
};

/** Adds points for an event, por cohorte (curso). */
export async function addPointsForEvent({ userId, type, courseId, supabase }: AddPointsOptions): Promise<number> {
  const toAdd = calculatePointsForEvent(type);
  if (toAdd <= 0) return 0;
  return addPointsForCourse(userId, courseId, toAdd, supabase);
}

/** Add raw points to a user in a specific course (Kahoot, manual awards, etc.). */
export async function addPointsForCourse(
  userId: string,
  courseId: string,
  amount: number,
  supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const { data: row } = await supabase
    .from('user_course_points')
    .select('points')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  const current = (row?.points as number | undefined) ?? 0;
  const next = current + amount;
  await supabase
    .from('user_course_points')
    .upsert(
      { user_id: userId, course_id: courseId, points: next, updated_at: new Date().toISOString() },
      { onConflict: ['user_id', 'course_id'] }
    );
  return next;
}

/** @deprecated Use addPointsForCourse. Kept for backward compat. */
export async function addPoints(
  userId: string,
  amount: number,
  supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const { data: enroll } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (enroll?.course_id) {
    return addPointsForCourse(userId, enroll.course_id as string, amount, supabase);
  }
  return 0;
}

