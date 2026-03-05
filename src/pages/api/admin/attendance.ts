import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';
import { addPointsForEvent } from '../../../lib/points';
import { checkBadgesAfterAttendance } from '../../../lib/badges';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const db = getSupabaseServiceRoleClient();
  const { data: userRow } = await db.from('users').select('role').eq('id', userId).maybeSingle();
  if ((userRow?.role as string) !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const lessonId = formData.get('lesson_id');
  const selectedUserIds = formData
    .getAll('user_ids')
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);

  if (typeof lessonId !== 'string' || !lessonId.trim()) {
    return new Response(JSON.stringify({ error: 'lesson_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: lesson } = await db.from('lessons').select('id, course_id').eq('id', lessonId.trim()).maybeSingle();
  if (!lesson?.course_id) {
    return new Response(JSON.stringify({ error: 'lesson not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: enrolledRows } = await db
    .from('enrollments')
    .select('user_id')
    .eq('course_id', lesson.course_id as string);
  const enrolledSet = new Set((enrolledRows ?? []).map((r) => r.user_id as string));
  const validUserIds = selectedUserIds.filter((id) => enrolledSet.has(id));

  for (const uid of validUserIds) {
    const { data: existing } = await db
      .from('attendance')
      .select('user_id')
      .eq('user_id', uid)
      .eq('lesson_id', lessonId.trim())
      .maybeSingle();

    if (existing) continue;

    await db.from('attendance').insert({
      user_id: uid,
      lesson_id: lessonId.trim(),
      confirmed_at: new Date().toISOString(),
    });

    await addPointsForEvent({ userId: uid, type: 'lesson_attended', supabase: db });
    await checkBadgesAfterAttendance(db, uid);
  }

  const redirectTo = formData.get('redirect_to');
  const url = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : '/admin/attendance';
  return new Response(null, { status: 303, headers: { Location: url } });
};
