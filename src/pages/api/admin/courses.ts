import type { APIRoute } from 'astro';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || 'curso';
}

function sanitizeCoverImage(input: FormDataEntryValue | null): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  // allow relative asset names/paths only
  return value.replace(/[^a-zA-Z0-9/_\-.]/g, '').slice(0, 200) || null;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;

  const formData = await request.formData();
  const action = formData.get('action');
  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    return new Response(JSON.stringify({ error: 'action=create|update|delete required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (isRateLimited(`admin-courses:${userId}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many course requests, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const title = typeof formData.get('title') === 'string' ? String(formData.get('title')).trim().slice(0, 140) : '';
  const description = typeof formData.get('description') === 'string' ? String(formData.get('description')).trim().slice(0, 4000) || null : null;
  const cover_image = sanitizeCoverImage(formData.get('cover_image'));

  if (action === 'create') {
    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const { data: existing, error: slugError } = await db
        .from('courses')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (slugError) {
        return new Response(JSON.stringify({ error: slugError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (!existing) break;
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const { error } = await db
      .from('courses')
      .insert({
        title,
        slug,
        description,
        cover_image,
        created_by: userId,
      });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await recordAdminAudit(db, userId, 'course.create', { title, slug });
  } else if (action === 'delete') {
    const course_id = formData.get('course_id');
    if (typeof course_id !== 'string' || !course_id.trim()) {
      return new Response(JSON.stringify({ error: 'course_id required for delete' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const cid = course_id.trim();

    const { data: challengeRows } = await db.from('challenges').select('id').eq('course_id', cid);
    const challengeIds = (challengeRows ?? []).map((c) => c.id);
    if (challengeIds.length > 0) {
      await db.from('submissions').delete().in('challenge_id', challengeIds);
    }
    await db.from('challenges').delete().eq('course_id', cid);

    const { data: lessonRows } = await db.from('lessons').select('id').eq('course_id', cid);
    const lessonIds = (lessonRows ?? []).map((l) => l.id);
    if (lessonIds.length > 0) {
      await db.from('attendance').delete().in('lesson_id', lessonIds);
      await db.from('kahoot_results').delete().in('lesson_id', lessonIds);
    }
    await db.from('lessons').delete().eq('course_id', cid);
    await db.from('enrollments').delete().eq('course_id', cid);
    const { error: delErr } = await db.from('courses').delete().eq('id', cid);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await recordAdminAudit(db, userId, 'course.delete', { courseId: cid });
  } else {
    const course_id = formData.get('course_id');
    if (typeof course_id !== 'string' || !course_id.trim()) {
      return new Response(JSON.stringify({ error: 'course_id required for update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const update: { title?: string; description: string | null; cover_image: string | null } = {
      description,
      cover_image,
    };
    if (title) update.title = title;
    await db.from('courses').update(update).eq('id', course_id.trim());
    await recordAdminAudit(db, userId, 'course.update', { courseId: course_id.trim() });
  }

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/courses');
  const msg = action === 'create' ? 'Curso creado' : action === 'delete' ? 'Curso eliminado' : 'Curso actualizado';
  const url = withToastParams(redirect, msg, 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
