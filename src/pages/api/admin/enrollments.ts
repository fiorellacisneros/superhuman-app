import type { APIRoute } from 'astro';
import { safeRedirectPath } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId: adminUserId } = admin;

  const formData = await request.formData();
  const action = formData.get('action');
  if (action !== 'enroll' && action !== 'unenroll' && action !== 'sync') {
    return new Response(JSON.stringify({ error: 'action=enroll|unenroll|sync required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (isRateLimited(`admin-enrollments:${adminUserId}`, 60, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many enrollment requests, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const user_id = formData.get('user_id');
  if (typeof user_id !== 'string' || !user_id.trim()) {
    return new Response(JSON.stringify({ error: 'user_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'sync') {
    const selectedCourseIds = formData
      .getAll('course_ids')
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);

    const { data: existingRows, error: existingError } = await db
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user_id.trim());
    if (existingError) {
      return new Response(JSON.stringify({ error: existingError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingSet = new Set((existingRows ?? []).map((r) => r.course_id as string));
    const selectedSet = new Set(selectedCourseIds);

    const toInsert = selectedCourseIds.filter((id) => !existingSet.has(id));
    const toDelete = Array.from(existingSet).filter((id) => !selectedSet.has(id));

    if (toInsert.length > 0) {
      const { error: insertError } = await db.from('enrollments').insert(
        toInsert.map((courseId) => ({
          user_id: user_id.trim(),
          course_id: courseId,
          enrolled_at: new Date().toISOString(),
        })),
      );
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await db
        .from('enrollments')
        .delete()
        .eq('user_id', user_id.trim())
        .in('course_id', toDelete);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    await recordAdminAudit(db, adminUserId, 'enrollment.sync', {
      targetUserId: user_id.trim(),
      added: toInsert.length,
      removed: toDelete.length,
    });
  } else {
    const course_id = formData.get('course_id');
    if (typeof course_id !== 'string' || !course_id.trim()) {
      return new Response(JSON.stringify({ error: 'course_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'enroll') {
    const { data: existing } = await db
      .from('enrollments')
      .select('user_id')
      .eq('user_id', user_id.trim())
      .eq('course_id', course_id.trim())
      .maybeSingle();
    if (!existing) {
      await db.from('enrollments').insert({
        user_id: user_id.trim(),
        course_id: course_id.trim(),
        enrolled_at: new Date().toISOString(),
      });
    }
    } else {
      await db.from('enrollments').delete().eq('user_id', user_id.trim()).eq('course_id', course_id.trim());
    }
    await recordAdminAudit(db, adminUserId, action === 'enroll' ? 'enrollment.add' : 'enrollment.remove', {
      targetUserId: user_id.trim(),
      courseId: course_id.trim(),
    });
  }

  const url = safeRedirectPath(formData.get('redirect_to'), '/admin/students');
  return new Response(null, { status: 303, headers: { Location: url } });
};
