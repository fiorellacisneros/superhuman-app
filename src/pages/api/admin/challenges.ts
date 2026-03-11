import type { APIRoute } from 'astro';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;

  const formData = await request.formData();
  const action = formData.get('action');
  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/challenges');
  const errorRedirect = (message: string, status = 303) =>
    new Response(null, {
      status,
      headers: { Location: withToastParams(redirect, message, 'error') },
    });
  if (action !== 'create' && action !== 'toggle' && action !== 'delete' && action !== 'update') {
    return errorRedirect('Acción de reto inválida', 303);
  }
  if (isRateLimited(`admin-challenges:${userId}`, 40, 60_000)) {
    return errorRedirect('Demasiadas solicitudes de retos, intenta nuevamente en un minuto', 303);
  }

  if (action === 'create') {
    const title = typeof formData.get('title') === 'string' ? String(formData.get('title')).trim().slice(0, 140) : '';
    const description = typeof formData.get('description') === 'string' ? String(formData.get('description')).trim().slice(0, 2000) || null : null;
    const pointsRaw = formData.get('points_reward');
    const points_reward = pointsRaw != null && pointsRaw !== '' ? Number(pointsRaw) : 30;
    const deadlineRaw = formData.get('deadline');
    const deadline = typeof deadlineRaw === 'string' && deadlineRaw.trim() ? deadlineRaw.trim() : null;
    const course_id = formData.get('course_id');
    const courseId = typeof course_id === 'string' && course_id.trim() ? course_id.trim() : null;
    const activateNow = formData.get('activate_now') === 'on' || formData.get('activate_now') === 'true';
    const availableForOnDemand = formData.get('available_for_on_demand') === 'on' || formData.get('available_for_on_demand') === 'true';
    const scheduledAtRaw = formData.get('scheduled_at');
    const scheduled_at = typeof scheduledAtRaw === 'string' && scheduledAtRaw.trim() ? scheduledAtRaw.trim() : null;

    if (!title) {
      return errorRedirect('El título es obligatorio', 303);
    }
    if (!Number.isFinite(points_reward) || points_reward < 0 || points_reward > 1000) {
      return errorRedirect('Los puntos deben estar entre 0 y 1000', 303);
    }

    const insertPayload: Record<string, unknown> = {
      title,
      description,
      points_reward: Number.isFinite(points_reward) ? points_reward : 30,
      deadline: deadline || null,
      course_id: courseId,
      is_active: activateNow,
      scheduled_at: activateNow ? null : scheduled_at,
      available_for_on_demand: availableForOnDemand,
    };
    let { error: insertError } = await db.from('challenges').insert(insertPayload);
    if (insertError && /available_for_on_demand|column.*does not exist/i.test(String(insertError.message))) {
      delete insertPayload.available_for_on_demand;
      const retry = await db.from('challenges').insert(insertPayload);
      insertError = retry.error;
    }
    if (insertError) return errorRedirect(`No se pudo crear el reto: ${insertError.message}`, 303);
    await recordAdminAudit(db, userId, 'challenge.create', { title, courseId, activateNow });
    const url = withToastParams(redirect, 'Reto creado', 'success');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (action === 'toggle') {
    const challenge_id = formData.get('challenge_id');
    if (typeof challenge_id !== 'string' || !challenge_id.trim()) {
      return errorRedirect('El id del reto es obligatorio', 303);
    }
    const { data: row } = await db.from('challenges').select('is_active').eq('id', challenge_id.trim()).maybeSingle();
    if (row) {
      const { error: toggleError } = await db.from('challenges').update({ is_active: !row.is_active }).eq('id', challenge_id.trim());
      if (toggleError) return errorRedirect(`No se pudo actualizar el reto: ${toggleError.message}`, 303);
      await recordAdminAudit(db, userId, 'challenge.toggle', {
        challengeId: challenge_id.trim(),
        toActive: !row.is_active,
      });
    }
    const url = withToastParams(redirect, row ? `Reto ${!row.is_active ? 'activado' : 'pausado'}` : 'Reto actualizado', 'success');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (action === 'delete') {
    const challenge_id = formData.get('challenge_id');
    if (typeof challenge_id !== 'string' || !challenge_id.trim()) {
      return errorRedirect('El id del reto es obligatorio', 303);
    }
    const { error: deleteError } = await db.from('challenges').delete().eq('id', challenge_id.trim());
    if (deleteError) return errorRedirect(`No se pudo eliminar el reto: ${deleteError.message}`, 303);
    await recordAdminAudit(db, userId, 'challenge.delete', { challengeId: challenge_id.trim() });
    const url = withToastParams(redirect, 'Reto eliminado', 'success');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (action === 'update') {
    const challenge_id = formData.get('challenge_id');
    if (typeof challenge_id !== 'string' || !challenge_id.trim()) {
      return errorRedirect('El id del reto es obligatorio', 303);
    }
    const title = formData.get('title');
    const description = formData.get('description');
    const deadline = formData.get('deadline');
    const points_reward = formData.get('points_reward');
    const course_id = formData.get('course_id');
    const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true';
    const available_for_on_demand = formData.get('available_for_on_demand') === 'on' || formData.get('available_for_on_demand') === 'true';
    const update: Record<string, unknown> = {};
    if (typeof title === 'string') update.title = title.trim().slice(0, 140);
    if (typeof description === 'string') update.description = description.trim().slice(0, 2000) || null;
    if (typeof deadline === 'string') update.deadline = deadline.trim() || null;
    if (typeof points_reward === 'string' && points_reward !== '') {
      const parsedPoints = Number(points_reward);
      if (!Number.isFinite(parsedPoints) || parsedPoints < 0 || parsedPoints > 1000) {
        return errorRedirect('Los puntos deben estar entre 0 y 1000', 303);
      }
      update.points_reward = parsedPoints;
    }
    if (typeof course_id === 'string') update.course_id = course_id.trim() || null;
    update.is_active = is_active;
    update.available_for_on_demand = available_for_on_demand;
    if (Object.keys(update).length > 0) {
      let { error: updateError } = await db.from('challenges').update(update).eq('id', challenge_id.trim());
      if (updateError && /available_for_on_demand|column.*does not exist/i.test(String(updateError.message))) {
        delete update.available_for_on_demand;
        const retry = await db.from('challenges').update(update).eq('id', challenge_id.trim());
        updateError = retry.error;
      }
      if (updateError) return errorRedirect(`No se pudo actualizar el reto: ${updateError.message}`, 303);
      await recordAdminAudit(db, userId, 'challenge.update', { challengeId: challenge_id.trim() });
    }
    const url = withToastParams(redirect, 'Reto actualizado', 'success');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const url = withToastParams(redirect, 'Reto actualizado', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
