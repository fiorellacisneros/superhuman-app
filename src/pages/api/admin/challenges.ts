import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';

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
  const action = formData.get('action');
  if (action !== 'create' && action !== 'toggle' && action !== 'delete' && action !== 'update') {
    return new Response(JSON.stringify({ error: 'action=create|toggle|delete|update required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const redirectTo = formData.get('redirect_to');
  const url = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : '/admin/challenges';

  if (action === 'create') {
    const title = typeof formData.get('title') === 'string' ? String(formData.get('title')).trim() : '';
    const description = typeof formData.get('description') === 'string' ? String(formData.get('description')).trim() || null : null;
    const pointsRaw = formData.get('points_reward');
    const points_reward = pointsRaw != null && pointsRaw !== '' ? Number(pointsRaw) : 30;
    const deadlineRaw = formData.get('deadline');
    const deadline = typeof deadlineRaw === 'string' && deadlineRaw.trim() ? deadlineRaw.trim() : null;
    const course_id = formData.get('course_id');
    const courseId = typeof course_id === 'string' && course_id.trim() ? course_id.trim() : null;
    const activateNow = formData.get('activate_now') === 'on' || formData.get('activate_now') === 'true';
    const scheduledAtRaw = formData.get('scheduled_at');
    const scheduled_at = typeof scheduledAtRaw === 'string' && scheduledAtRaw.trim() ? scheduledAtRaw.trim() : null;

    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.from('challenges').insert({
      title,
      description,
      points_reward: Number.isFinite(points_reward) ? points_reward : 30,
      deadline: deadline || null,
      course_id: courseId,
      is_active: activateNow,
      scheduled_at: activateNow ? null : scheduled_at,
    });
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (action === 'toggle') {
    const challenge_id = formData.get('challenge_id');
    if (typeof challenge_id !== 'string' || !challenge_id.trim()) {
      return new Response(JSON.stringify({ error: 'challenge_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { data: row } = await db.from('challenges').select('is_active').eq('id', challenge_id.trim()).maybeSingle();
    if (row) {
      await db.from('challenges').update({ is_active: !row.is_active }).eq('id', challenge_id.trim());
    }
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (action === 'delete') {
    const challenge_id = formData.get('challenge_id');
    if (typeof challenge_id !== 'string' || !challenge_id.trim()) {
      return new Response(JSON.stringify({ error: 'challenge_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await db.from('challenges').delete().eq('id', challenge_id.trim());
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (action === 'update') {
    const challenge_id = formData.get('challenge_id');
    if (typeof challenge_id !== 'string' || !challenge_id.trim()) {
      return new Response(JSON.stringify({ error: 'challenge_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const title = formData.get('title');
    const description = formData.get('description');
    const deadline = formData.get('deadline');
    const points_reward = formData.get('points_reward');
    const course_id = formData.get('course_id');
    const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true';
    const update: Record<string, unknown> = {};
    if (typeof title === 'string') update.title = title.trim();
    if (typeof description === 'string') update.description = description.trim() || null;
    if (typeof deadline === 'string') update.deadline = deadline.trim() || null;
    if (typeof points_reward === 'string' && points_reward !== '') update.points_reward = Number(points_reward);
    if (typeof course_id === 'string') update.course_id = course_id.trim() || null;
    update.is_active = is_active;
    if (Object.keys(update).length > 0) {
      await db.from('challenges').update(update).eq('id', challenge_id.trim());
    }
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  return new Response(null, { status: 303, headers: { Location: url } });
};
