export type BadgeSlug =
  | 'primera-entrega'
  | 'en-racha'
  | 'early-bird'
  | 'modulo-completo'
  | 'puntual'
  | 'curso-completo';

export type BadgeConditionType =
  | 'manual'
  | 'first_submission'
  | 'first_attendance'
  | 'streak_3'
  | 'attendance_streak_3'
  | 'module_complete'
  | 'course_complete'
  | 'early_bird';

export interface BadgeDefinition {
  slug: BadgeSlug;
  name: string;
  description: string;
  conditionType: BadgeConditionType;
}

export const BADGES: BadgeDefinition[] = [
  {
    slug: 'primera-entrega',
    name: 'Primera entrega',
    description: 'Submitted first challenge',
    conditionType: 'first_submission',
  },
  {
    slug: 'en-racha',
    name: 'En racha',
    description: 'Attended 3 lessons in a row',
    conditionType: 'streak_3',
  },
  {
    slug: 'early-bird',
    name: 'Early bird',
    description: 'First student to submit a challenge',
    conditionType: 'early_bird',
  },
  {
    slug: 'modulo-completo',
    name: 'Módulo completo',
    description: 'Completed all lessons in a module',
    conditionType: 'module_complete',
  },
  {
    slug: 'puntual',
    name: 'Puntual',
    description: 'Submitted before deadline',
    conditionType: 'manual',
  },
  {
    slug: 'curso-completo',
    name: 'Curso completo',
    description: 'Finished entire course',
    conditionType: 'course_complete',
  },
];

export const getBadgeDefinition = (slug: BadgeSlug): BadgeDefinition | undefined =>
  BADGES.find((badge) => badge.slug === slug);

type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;

/** After a submission is approved, check conditions and award badges (first_submission, early_bird). */
export async function checkBadgesAfterApproval(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { data: badgeRows } = await supabase.from('badges').select('id, condition_type');
  if (!badgeRows?.length) return;

  const { count: approvedCount } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('approved', true);
  const isFirstSubmission = (approvedCount ?? 0) === 1;

  const { data: firstSubmitted } = await supabase
    .from('submissions')
    .select('user_id')
    .eq('challenge_id', challengeId)
    .eq('approved', true)
    .order('reviewed_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const isEarlyBird = firstSubmitted?.user_id === userId;

  for (const badge of badgeRows as { id: string; condition_type: string }[]) {
    const cond = badge.condition_type as BadgeConditionType;
    let shouldAward = false;
    if (cond === 'first_submission' && isFirstSubmission) shouldAward = true;
    if (cond === 'early_bird' && isEarlyBird) shouldAward = true;
    if (!shouldAward) continue;
    const { data: existing } = await supabase.from('user_badges').select('user_id').eq('user_id', userId).eq('badge_id', badge.id).maybeSingle();
    if (!existing) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id, earned_at: now });
    }
  }
}

/** After attendance is marked, award attendance-related badges when conditions are met. */
export async function checkBadgesAfterAttendance(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { data: badgeRows } = await supabase.from('badges').select('id, condition_type');
  if (!badgeRows?.length) return;

  const { count: attendanceCount } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const isFirstAttendance = (attendanceCount ?? 0) === 1;
  const hasAttendanceStreak3 = (attendanceCount ?? 0) >= 3;

  for (const badge of badgeRows as { id: string; condition_type: string }[]) {
    const cond = badge.condition_type as BadgeConditionType;
    let shouldAward = false;

    if (cond === 'first_attendance' && isFirstAttendance) shouldAward = true;
    if ((cond === 'attendance_streak_3' || cond === 'streak_3') && hasAttendanceStreak3) shouldAward = true;

    if (!shouldAward) continue;
    const { data: existing } = await supabase
      .from('user_badges')
      .select('user_id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id, earned_at: now });
    }
  }
}

