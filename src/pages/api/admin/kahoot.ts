import type { APIRoute } from 'astro';
import { addPoints } from '../../../lib/points';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

const KAHOOT_POINTS = { 1: 50, 2: 40, 3: 30, 4: 20, 5: 15, participation: 5 } as const;

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;
  if (isRateLimited(`admin-kahoot:${userId}`, 20, 60_000)) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes, espera un momento' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const formData = await request.formData();
  const lessonId = String(formData.get('lesson_id') ?? '').trim();
  const pos1 = String(formData.get('position_1') ?? '').trim();
  const pos2 = String(formData.get('position_2') ?? '').trim();
  const pos3 = String(formData.get('position_3') ?? '').trim();
  const pos4 = String(formData.get('position_4') ?? '').trim();
  const pos5 = String(formData.get('position_5') ?? '').trim();
  const participantIds = formData
    .getAll('participant_ids')
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
  const participantSet = new Set(participantIds);

  if (!lessonId) {
    return new Response(JSON.stringify({ error: 'lesson_id requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: lesson } = await db.from('lessons').select('id, course_id').eq('id', lessonId).maybeSingle();
  if (!lesson?.course_id) {
    return new Response(JSON.stringify({ error: 'Clase no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: existing } = await db.from('kahoot_results').select('id').eq('lesson_id', lessonId).limit(1);
  if (existing && existing.length > 0) {
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/kahoot');
    const url = withToastParams(redirect, 'Ya registraste Kahoot para esta clase. Los puntos ya fueron asignados.', 'info');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { data: enrolledRows } = await db
    .from('enrollments')
    .select('user_id')
    .eq('course_id', lesson.course_id as string);
  const enrolledSet = new Set((enrolledRows ?? []).map((r) => r.user_id as string));

  const top5Raw = [pos1, pos2, pos3, pos4, pos5].filter((id) => id && enrolledSet.has(id));
  const seen = new Set<string>();
  const top5: string[] = [];
  for (const id of top5Raw) {
    if (seen.has(id)) continue;
    seen.add(id);
    top5.push(id);
  }
  const top5Set = new Set(top5);
  const restIds = Array.from(participantSet).filter((id) => enrolledSet.has(id) && !top5Set.has(id));

  const results: { lesson_id: string; user_id: string; position: number | null; points_earned: number }[] = [];

  for (let i = 0; i < top5.length; i++) {
    const pos = (i + 1) as 1 | 2 | 3 | 4 | 5;
    const pts = KAHOOT_POINTS[pos];
    results.push({ lesson_id: lessonId, user_id: top5[i], position: pos, points_earned: pts });
  }
  for (const uid of restIds) {
    results.push({ lesson_id: lessonId, user_id: uid, position: null, points_earned: KAHOOT_POINTS.participation });
  }

  if (results.length === 0) {
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/kahoot');
    const url = withToastParams(redirect, 'Selecciona al menos un alumno (podio o participantes)', 'info');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  await db.from('kahoot_results').insert(results);

  for (const r of results) {
    await addPoints(r.user_id, r.points_earned, db);
  }

  await recordAdminAudit(db, userId, 'kahoot.register', {
    lessonId,
    count: results.length,
    top5: top5.length,
    participants: restIds.length,
  });

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/kahoot');
  const url = withToastParams(
    redirect,
    `Kahoot registrado: ${results.length} alumno${results.length === 1 ? '' : 's'} con puntos`,
    'success',
  );
  return new Response(null, { status: 303, headers: { Location: url } });
};
