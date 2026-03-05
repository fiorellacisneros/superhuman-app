import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const formData = await request.formData();
  const challenge_id = formData.get('challenge_id');
  const link = formData.get('link');
  const mode = formData.get('mode');
  if (typeof challenge_id !== 'string' || !challenge_id.trim()) {
    return new Response(JSON.stringify({ error: 'challenge_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const linkStr = typeof link === 'string' ? link.trim() : '';
  if (!linkStr) {
    return new Response(JSON.stringify({ error: 'link required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getSupabaseServiceRoleClient();
  const { data: challenge } = await db
    .from('challenges')
    .select('deadline')
    .eq('id', challenge_id.trim())
    .maybeSingle();

  const deadlineIso = (challenge?.deadline as string | null) ?? null;
  const canEditByDeadline = !deadlineIso || new Date(deadlineIso).getTime() > Date.now();

  const { data: existing } = await db
    .from('submissions')
    .select('id')
    .eq('challenge_id', challenge_id.trim())
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) {
    if (mode === 'update' && canEditByDeadline) {
      await db.from('submissions').update({ link: linkStr }).eq('id', existing.id);
    }
    const redirectTo = formData.get('redirect_to');
    const url = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : '/challenges';
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  await db.from('submissions').insert({
    challenge_id: challenge_id.trim(),
    user_id: userId,
    link: linkStr,
    submitted_at: new Date().toISOString(),
  });

  const redirectTo = formData.get('redirect_to');
  const url = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : '/challenges';
  return new Response(null, { status: 303, headers: { Location: url } });
};
