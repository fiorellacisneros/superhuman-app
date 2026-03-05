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
  supabase: import('@supabase/supabase-js').SupabaseClient;
};

/** Fetches current user points, adds the event value, and updates the DB. */
export async function addPointsForEvent({ userId, type, supabase }: AddPointsOptions): Promise<number> {
  const toAdd = calculatePointsForEvent(type);
  if (toAdd <= 0) return 0;
  const { data: row } = await supabase.from('users').select('points').eq('id', userId).maybeSingle();
  const current = (row?.points as number | undefined) ?? 0;
  const next = current + toAdd;
  await supabase.from('users').update({ points: next }).eq('id', userId);
  return next;
}

