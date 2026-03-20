import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { safeRedirectPath, sanitizeHttpUrl, withToastParams } from '../../lib/request-security';

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
  const linkStr = sanitizeHttpUrl(link);
  if (!linkStr) {
    return new Response(JSON.stringify({ error: 'link required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getSupabaseServiceRoleClient();
  const { data: challenge } = await db
    .from('challenges')
    .select('is_active, course_id')
    .eq('id', challenge_id.trim())
    .maybeSingle();
  if (!challenge || !challenge.is_active) {
    return new Response(JSON.stringify({ error: 'challenge not available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (challenge.course_id) {
    const { data: enrollment } = await db
      .from('enrollments')
      .select('user_id')
      .eq('user_id', userId)
      .eq('course_id', challenge.course_id as string)
      .maybeSingle();
    if (!enrollment) {
      return new Response(JSON.stringify({ error: 'not enrolled in this course' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const { data: existing } = await db
    .from('submissions')
    .select('id, approved')
    .eq('challenge_id', challenge_id.trim())
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    if (existing.approved === true) {
      const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
      const url = withToastParams(redirect, 'La entrega ya fue aprobada y no se puede editar', 'info');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    if (mode === 'update') {
      await db.from('submissions').update({ link: linkStr }).eq('id', existing.id);
      const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
      const url = withToastParams(redirect, 'Entrega actualizada', 'success');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
    const url = withToastParams(redirect, 'La entrega ya fue enviada', 'info');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  await db.from('submissions').insert({
    challenge_id: challenge_id.trim(),
    user_id: userId,
    link: linkStr,
    submitted_at: new Date().toISOString(),
  });

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
  const url = withToastParams(redirect, 'Entrega enviada correctamente', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
