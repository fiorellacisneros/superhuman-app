import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { safeRedirectPath, sanitizeHttpUrl, withToastParams } from '../../lib/request-security';
import {
  canUserSubmitToChallenge,
  getCourseIdsWithPlatformAccess,
  type EnrollmentAccessInput,
} from '../../lib/course-access';

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
  const nowMs = Date.now();

  const { data: allEnrollRows } = await db
    .from('enrollments')
    .select('course_id, access_type, enrolled_at, access_expires_at')
    .eq('user_id', userId);
  const enrollmentInputs: EnrollmentAccessInput[] = (allEnrollRows ?? []).map((r) => ({
    course_id: r.course_id as string,
    access_type: r.access_type as string | null,
    enrolled_at: r.enrolled_at as string | null,
    access_expires_at: r.access_expires_at as string | null,
  }));
  const userHasAnyPlatformAccess = getCourseIdsWithPlatformAccess(enrollmentInputs, nowMs).length > 0;

  const { data: challenge } = await db
    .from('challenges')
    .select('is_active, course_id, available_for_on_demand')
    .eq('id', challenge_id.trim())
    .maybeSingle();
  if (!challenge || !challenge.is_active) {
    return new Response(JSON.stringify({ error: 'challenge not available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const courseId = challenge.course_id as string | null;
  let courseEndsAt: string | null | undefined;
  let enrollmentForCourse: EnrollmentAccessInput | null = null;

  if (courseId) {
    const row = enrollmentInputs.find((e) => e.course_id === courseId);
    if (!row) {
      return new Response(JSON.stringify({ error: 'not enrolled in this course' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    enrollmentForCourse = row;
    const { data: courseRow } = await db.from('courses').select('ends_at').eq('id', courseId).maybeSingle();
    courseEndsAt = (courseRow as { ends_at?: string | null } | null)?.ends_at;
  }

  const allowed = canUserSubmitToChallenge(enrollmentForCourse, courseEndsAt, challenge, nowMs, userHasAnyPlatformAccess);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'challenge not available for your enrollment' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
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
