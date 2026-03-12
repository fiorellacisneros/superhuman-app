import type { APIRoute } from 'astro';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;

  if (isRateLimited(`admin-modules:${userId}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const formData = await request.formData();
  const action = formData.get('action');
  if (action !== 'create') {
    return new Response(JSON.stringify({ error: 'action=create required' }), {
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

  const title = typeof formData.get('title') === 'string' ? String(formData.get('title')).trim().slice(0, 120) : '';
  if (!title) {
    return new Response(JSON.stringify({ error: 'title required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const orderRaw = formData.get('order');
  const order = orderRaw !== null && orderRaw !== '' ? Number(orderRaw) : 0;

  const { data, error } = await db
    .from('course_modules')
    .insert({ course_id: course_id.trim(), title, order: Number.isFinite(order) ? order : 0 })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const redirect = safeRedirectPath(formData.get('redirect_to'), `/admin/courses/${course_id.trim()}/edit`);
  const url = withToastParams(redirect, 'Módulo creado', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
