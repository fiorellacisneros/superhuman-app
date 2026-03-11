import type { APIRoute } from 'astro';
import { addPointsForEvent } from '../../../lib/points';
import { checkBadgesAfterAttendance } from '../../../lib/badges';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;
  if (isRateLimited(`admin-attendance:${userId}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many attendance updates, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const formData = await request.formData();
  const lessonId = formData.get('lesson_id');
  const selectedUserIds = formData
    .getAll('user_ids')
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
  const uniqueSelectedUserIds = Array.from(new Set(selectedUserIds));

  if (typeof lessonId !== 'string' || !lessonId.trim()) {
    return new Response(JSON.stringify({ error: 'lesson_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: lesson } = await db.from('lessons').select('id, course_id').eq('id', lessonId.trim()).maybeSingle();
  if (!lesson?.course_id) {
    return new Response(JSON.stringify({ error: 'lesson not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: enrolledRows } = await db
    .from('enrollments')
    .select('user_id')
    .eq('course_id', lesson.course_id as string);
  const enrolledSet = new Set((enrolledRows ?? []).map((r) => r.user_id as string));
  const validUserIds = uniqueSelectedUserIds.filter((id) => enrolledSet.has(id));
  if (validUserIds.length === 0) {
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/attendance');
    const url = withToastParams(redirect, 'No seleccionaste alumnos para esta clase', 'info');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { data: existingRows } = await db
    .from('attendance')
    .select('user_id')
    .eq('lesson_id', lessonId.trim())
    .in('user_id', validUserIds);
  const existingSet = new Set((existingRows ?? []).map((r) => r.user_id as string));
  const toInsert = validUserIds.filter((id) => !existingSet.has(id));

  if (toInsert.length > 0) {
    const confirmedAt = new Date().toISOString();
    await db.from('attendance').insert(
      toInsert.map((uid) => ({
        user_id: uid,
        lesson_id: lessonId.trim(),
        confirmed_at: confirmedAt,
      })),
    );
  }

  const courseId = lesson.course_id as string;
  for (const uid of toInsert) {
    await addPointsForEvent({ userId: uid, type: 'lesson_attended', courseId, supabase: db });
    await checkBadgesAfterAttendance(db, uid);
  }
  await recordAdminAudit(db, userId, 'attendance.batch_mark', {
    lessonId: lessonId.trim(),
    addedCount: toInsert.length,
  });

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/attendance');
  const url = withToastParams(
    redirect,
    toInsert.length > 0
      ? `Asistencia guardada (${toInsert.length} alumno${toInsert.length === 1 ? '' : 's'})`
      : 'La asistencia ya estaba al día',
    toInsert.length > 0 ? 'success' : 'info',
  );
  return new Response(null, { status: 303, headers: { Location: url } });
};
