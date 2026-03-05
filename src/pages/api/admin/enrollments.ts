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
  if (action !== 'enroll' && action !== 'unenroll' && action !== 'sync') {
    return new Response(JSON.stringify({ error: 'action=enroll|unenroll|sync required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
  }

  const redirectTo = formData.get('redirect_to');
  const url = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : '/admin/students';
  return new Response(null, { status: 303, headers: { Location: url } });
};
