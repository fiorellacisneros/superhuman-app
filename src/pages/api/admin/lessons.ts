import type { APIRoute } from 'astro';
import { parseAdminDateTimeLocalToIsoUtc } from '../../../lib/challenge-deadline';
import { safeRedirectPath, sanitizeHttpUrl, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;

  const formData = await request.formData();
  const action = formData.get('action');
  if (action !== 'create' && action !== 'update') {
    return new Response(JSON.stringify({ error: 'action=create|update required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (isRateLimited(`admin-lessons:${userId}`, 50, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many lesson requests, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const course_id = formData.get('course_id');
  if (typeof course_id !== 'string' || !course_id.trim()) {
    return new Response(JSON.stringify({ error: 'course_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const title = typeof formData.get('title') === 'string' ? String(formData.get('title')).trim().slice(0, 160) : '';
  if (!title) {
    return new Response(JSON.stringify({ error: 'title required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const notes = typeof formData.get('notes') === 'string' ? String(formData.get('notes')).trim().slice(0, 12000) || null : null;
  const zoom_link = sanitizeHttpUrl(formData.get('zoom_link'));
  const recording_url = sanitizeHttpUrl(formData.get('recording_url'));
  const recording_passcodeRaw = formData.get('recording_passcode');
  const recording_passcode = typeof recording_passcodeRaw === 'string' ? recording_passcodeRaw.trim().slice(0, 32) || null : null;
  const ppt_url = sanitizeHttpUrl(formData.get('ppt_url'));
  const resources_url = sanitizeHttpUrl(formData.get('resources_url'));
  const orderRaw = formData.get('order');
  const order = orderRaw !== null && orderRaw !== '' ? Number(orderRaw) : 0;
  const module_idRaw = formData.get('module_id');
  const module_id = typeof module_idRaw === 'string' && module_idRaw.trim() ? module_idRaw.trim() : null;
  const scheduled_atRaw = formData.get('scheduled_at');
  const scheduledTrim =
    typeof scheduled_atRaw === 'string' && scheduled_atRaw.trim() ? scheduled_atRaw.trim() : null;
  /** ISO UTC: el admin elige hora en Perú (Lima), igual que en retos — evita guardar 19:00 como UTC (se veía 14:00 PE). */
  const scheduled_at = scheduledTrim ? parseAdminDateTimeLocalToIsoUtc(scheduledTrim) : null;
  if (scheduledTrim && !scheduled_at) {
    return new Response(JSON.stringify({ error: 'scheduled_at must be a valid date' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resources: { label: string; url: string; type?: 'class' | 'shared' }[] = [];
  for (let i = 0; i < 5; i++) {
    const label = formData.get(`resource_label_${i}`);
    const url = formData.get(`resource_url_${i}`);
    const typeRaw = formData.get(`resource_type_${i}`);
    const safeUrl = sanitizeHttpUrl(url);
    if (safeUrl) {
      const type = typeRaw === 'shared' ? 'shared' : 'class';
      resources.push({
        label: typeof label === 'string' ? label.trim() : '',
        url: safeUrl,
        type,
      });
    }
  }

  const payload: Record<string, unknown> = {
    course_id: course_id.trim(),
    title,
    notes,
    zoom_link,
    recording_url,
    recording_passcode,
    ppt_url,
    resources_url: resources_url || null,
    resources: resources.length ? resources : [],
    order: Number.isFinite(order) ? order : 0,
    video_url: recording_url,
    module_id: module_id || null,
  };
  if (scheduled_at) {
    payload.scheduled_at = scheduled_at;
  }

  let data: unknown = null;
  let error: { message?: string } | null = null;

  if (action === 'create') {
    let insertPayload: Record<string, unknown> = { ...payload };
    const insertResult = await db.from('lessons').insert(insertPayload).select();
    data = insertResult.data;
    error = insertResult.error;

    // Retry insert if Supabase schema cache reports missing columns.
    // Example: "Could not find the 'notes' column of 'lessons' in the schema cache"
    for (let retries = 0; error && retries < 5; retries++) {
      const message = error.message ?? '';
      const missingColumn = message.match(/Could not find the '([^']+)' column of 'lessons'/i)?.[1];
      if (!missingColumn || !(missingColumn in insertPayload)) break;

      delete insertPayload[missingColumn];
      const retry = await db.from('lessons').insert(insertPayload).select();
      data = retry.data;
      error = retry.error;
    }
    if (!error) {
      await recordAdminAudit(db, userId, 'lesson.create', { courseId: course_id.trim(), title });
    }
  } else {
    const lesson_id = formData.get('lesson_id');
    if (typeof lesson_id !== 'string' || !lesson_id.trim()) {
      return new Response(JSON.stringify({ error: 'lesson_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let updatePayload: Record<string, unknown> = { ...payload };
    delete updatePayload.course_id;

    let updateResult = await db
      .from('lessons')
      .update(updatePayload)
      .eq('id', lesson_id.trim())
      .eq('course_id', course_id.trim())
      .select();
    data = updateResult.data;
    error = updateResult.error;

    for (let retries = 0; error && retries < 5; retries++) {
      const message = error.message ?? '';
      const missingColumn = message.match(/Could not find the '([^']+)' column of 'lessons'/i)?.[1];
      if (!missingColumn || !(missingColumn in updatePayload)) break;

      delete updatePayload[missingColumn];
      updateResult = await db
        .from('lessons')
        .update(updatePayload)
        .eq('id', lesson_id.trim())
        .eq('course_id', course_id.trim())
        .select();
      data = updateResult.data;
      error = updateResult.error;
    }
    if (!error) {
      const lesson_id = formData.get('lesson_id');
      await recordAdminAudit(db, userId, 'lesson.update', {
        courseId: course_id.trim(),
        lessonId: typeof lesson_id === 'string' ? lesson_id.trim() : '',
      });
    }
  }

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/courses');
  const url = withToastParams(redirect, action === 'create' ? 'Clase creada' : 'Clase actualizada', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
