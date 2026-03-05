import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, locals }) => {
  console.log('[lessons API] reached');
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
  console.log('[lessons API] formData:', Object.fromEntries(formData.entries()));
  const action = formData.get('action');
  if (action !== 'create' && action !== 'update') {
    return new Response(JSON.stringify({ error: 'action=create|update required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const course_id = formData.get('course_id');
  if (typeof course_id !== 'string' || !course_id.trim()) {
    return new Response(JSON.stringify({ error: 'course_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const title = typeof formData.get('title') === 'string' ? String(formData.get('title')).trim() : '';
  if (!title) {
    return new Response(JSON.stringify({ error: 'title required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const notes = typeof formData.get('notes') === 'string' ? String(formData.get('notes')).trim() || null : null;
  const zoom_link = typeof formData.get('zoom_link') === 'string' ? String(formData.get('zoom_link')).trim() || null : null;
  const recording_url = typeof formData.get('recording_url') === 'string' ? String(formData.get('recording_url')).trim() || null : null;
  const ppt_url = typeof formData.get('ppt_url') === 'string' ? String(formData.get('ppt_url')).trim() || null : null;
  const orderRaw = formData.get('order');
  const order = orderRaw !== null && orderRaw !== '' ? Number(orderRaw) : 0;
  const scheduled_atRaw = formData.get('scheduled_at');
  const scheduled_at = typeof scheduled_atRaw === 'string' && scheduled_atRaw.trim() ? scheduled_atRaw.trim() : null;

  const resources: { label: string; url: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const label = formData.get(`resource_label_${i}`);
    const url = formData.get(`resource_url_${i}`);
    if (typeof url === 'string' && url.trim()) {
      resources.push({
        label: typeof label === 'string' ? label.trim() : '',
        url: url.trim(),
      });
    }
  }

  const payload: Record<string, unknown> = {
    course_id: course_id.trim(),
    title,
    notes,
    zoom_link,
    recording_url,
    ppt_url,
    resources: resources.length ? resources : [],
    order: Number.isFinite(order) ? order : 0,
    video_url: recording_url,
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
    console.log('[lessons API] insert result:', { data, error });

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
      console.log('[lessons API] insert result:', { data, error });
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
    console.log('[lessons API] insert result:', { data, error });

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
      console.log('[lessons API] insert result:', { data, error });
    }
  }

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const redirectTo = formData.get('redirect_to');
  const url = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : '/admin/courses';
  return new Response(null, { status: 303, headers: { Location: url } });
};
