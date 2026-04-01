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

  const trimmedChallengeId = challenge_id.trim();
  const nowIso = new Date().toISOString();

  const { data: existing } = await db
    .from('submissions')
    .select('id, approved, reviewed')
    .eq('challenge_id', trimmedChallengeId)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.approved === true) {
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
    const url = withToastParams(redirect, 'La entrega ya fue aprobada y no se puede editar', 'info');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (existing) {
    if (mode !== 'update') {
      const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
      const url = withToastParams(redirect, 'La entrega ya fue enviada', 'info');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    const isRejectedResubmit = existing.reviewed === true && existing.approved === false;
    const patch: Record<string, unknown> = { link: linkStr, submitted_at: nowIso };
    if (isRejectedResubmit) {
      patch.reviewed = false;
      patch.approved = false;
      patch.reviewed_at = null;
      patch.feedback = null;
    }
    await db.from('submissions').update(patch).eq('id', existing.id);
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
    const url = withToastParams(redirect, 'Entrega actualizada', 'success', { celebrate: true });
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { error: insertError } = await db.from('submissions').insert({
    challenge_id: trimmedChallengeId,
    user_id: userId,
    link: linkStr,
    submitted_at: nowIso,
  });

  // Carrera: dos pestañas hacen insert a la vez; el UNIQUE hace fallar el segundo — actualizamos la fila existente.
  if (insertError?.code === '23505') {
    const { data: rowAfterRace } = await db
      .from('submissions')
      .select('id, approved, reviewed')
      .eq('challenge_id', trimmedChallengeId)
      .eq('user_id', userId)
      .maybeSingle();
    if (rowAfterRace?.approved === true) {
      const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
      const url = withToastParams(redirect, 'La entrega ya fue aprobada y no se puede editar', 'info');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    if (!rowAfterRace) {
      return new Response(JSON.stringify({ error: 'No se pudo guardar la entrega' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const isRejectedResubmit = rowAfterRace.reviewed === true && rowAfterRace.approved === false;
    const patch: Record<string, unknown> = { link: linkStr, submitted_at: nowIso };
    if (isRejectedResubmit) {
      patch.reviewed = false;
      patch.approved = false;
      patch.reviewed_at = null;
      patch.feedback = null;
    }
    await db.from('submissions').update(patch).eq('id', rowAfterRace.id);
  } else if (insertError) {
    return new Response(JSON.stringify({ error: 'No se pudo guardar la entrega' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/challenges');
  const url = withToastParams(redirect, 'Entrega enviada correctamente', 'success', { celebrate: true });
  return new Response(null, { status: 303, headers: { Location: url } });
};
