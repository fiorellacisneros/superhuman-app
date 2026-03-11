import type { APIRoute } from 'astro';
import { addPointsForEvent } from '../../../lib/points';
import { checkBadgesAfterApproval } from '../../../lib/badges';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;

  const formData = await request.formData();
  const submissionId = formData.get('submission_id');
  const action = formData.get('action');
  const feedback = formData.get('feedback');
  if (typeof submissionId !== 'string' || !submissionId.trim() || (action !== 'approve' && action !== 'reject')) {
    return new Response(JSON.stringify({ error: 'submission_id and action (approve|reject) required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const feedbackStr = typeof feedback === 'string' ? feedback.trim() : '';
  if (isRateLimited(`admin-submission-review:${userId}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many review requests, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const { data: submission } = await db
    .from('submissions')
    .select('id, user_id, challenge_id, submitted_at, reviewed')
    .eq('id', submissionId.trim())
    .maybeSingle();

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/submissions');

  if (!submission || submission.reviewed) {
    const url = withToastParams(redirect, 'La entrega ya fue revisada', 'info');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    reviewed: true,
    approved: action === 'approve',
    reviewed_at: now,
  };
  if (feedbackStr) updatePayload.feedback = feedbackStr;
  await db
    .from('submissions')
    .update(updatePayload)
    .eq('id', submissionId.trim());

  if (action === 'approve') {
    const { data: challenge } = await db
      .from('challenges')
      .select('deadline, course_id')
      .eq('id', submission.challenge_id)
      .maybeSingle();
    let isOnDemand = false;
    if (challenge?.course_id) {
      const { data: enrollment } = await db
        .from('enrollments')
        .select('access_type')
        .eq('user_id', submission.user_id)
        .eq('course_id', challenge.course_id as string)
        .maybeSingle();
      isOnDemand = (enrollment?.access_type as string) === 'on_demand';
    }
    const deadline = challenge?.deadline ? new Date(challenge.deadline as string).getTime() : null;
    const submittedAt = new Date((submission.submitted_at as string) || 0).getTime();
    const type =
      isOnDemand || (deadline != null && submittedAt <= deadline) ? 'challenge_submitted_on_time' : 'challenge_submitted_late';
    await addPointsForEvent({ userId: submission.user_id as string, type, supabase: db });
    await checkBadgesAfterApproval(db, submission.user_id as string, submission.challenge_id as string);
  }
  await recordAdminAudit(db, userId, 'submission.review', {
    submissionId: submissionId.trim(),
    decision: action,
    targetUserId: submission.user_id as string,
  });

  const url = withToastParams(redirect, action === 'approve' ? 'Entrega aprobada' : 'Entrega rechazada', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
