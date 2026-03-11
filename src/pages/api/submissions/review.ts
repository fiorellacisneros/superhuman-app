import type { APIRoute } from 'astro';
import { addPointsForEvent } from '../../../lib/points';
import { safeRedirectPath } from '../../../lib/request-security';
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
  if (typeof submissionId !== 'string' || !submissionId.trim() || (action !== 'approve' && action !== 'reject')) {
    return new Response(JSON.stringify({ error: 'submission_id and action (approve|reject) required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (isRateLimited(`submission-review:${userId}`, 30, 60_000)) {
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

  if (!submission || submission.reviewed) {
    const url = safeRedirectPath(formData.get('redirect_to'), '/dashboard');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const now = new Date().toISOString();
  await db
    .from('submissions')
    .update({
      reviewed: true,
      approved: action === 'approve',
      reviewed_at: now,
    })
    .eq('id', submissionId.trim());

  if (action === 'approve') {
    const { data: challenge } = await db
      .from('challenges')
      .select('deadline, course_id')
      .eq('id', submission.challenge_id)
      .maybeSingle();
    const deadline = challenge?.deadline ? new Date(challenge.deadline as string).getTime() : null;
    const submittedAt = new Date((submission.submitted_at as string) || 0).getTime();
    const type = deadline != null && submittedAt <= deadline ? 'challenge_submitted_on_time' : 'challenge_submitted_late';
    if (challenge?.course_id) {
      await addPointsForEvent({ userId: submission.user_id as string, type, courseId: challenge.course_id as string, supabase: db });
    }
  }
  await recordAdminAudit(db, userId, 'submission.review.legacy', {
    submissionId: submissionId.trim(),
    decision: action,
    targetUserId: submission.user_id as string,
  });

  const url = safeRedirectPath(formData.get('redirect_to'), '/dashboard');
  return new Response(null, { status: 303, headers: { Location: url } });
};
