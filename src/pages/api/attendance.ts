import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { addPointsForEvent } from '../../lib/points';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const formData = await request.formData();
  const lessonId = formData.get('lesson_id');
  if (typeof lessonId !== 'string' || !lessonId.trim()) {
    return new Response(JSON.stringify({ error: 'lesson_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getSupabaseServiceRoleClient();

  // Check if already attended (idempotent: don't double-insert or double-award points)
  const { data: existing } = await db
    .from('attendance')
    .select('user_id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId.trim())
    .maybeSingle();

  if (existing) {
    const rawRedirect = formData.get('redirect_to');
    const redirectTo = typeof rawRedirect === 'string' && rawRedirect.trim() ? rawRedirect.trim() : null;
    if (redirectTo) {
      return new Response(null, { status: 303, headers: { Location: redirectTo } });
    }
    return new Response(JSON.stringify({ ok: true, already_recorded: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.from('attendance').insert({ user_id: userId, lesson_id: lessonId.trim() });
  await addPointsForEvent({ userId, type: 'lesson_attended', supabase: db });

  const rawRedirect = formData.get('redirect_to');
  const redirectTo = typeof rawRedirect === 'string' && rawRedirect.trim() ? rawRedirect.trim() : null;
  if (redirectTo) {
    return new Response(null, { status: 303, headers: { Location: redirectTo } });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
