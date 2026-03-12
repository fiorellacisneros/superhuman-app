import type { APIRoute } from 'astro';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';

const MAX_BOOKINGS_PER_COURSE = 2;

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db } = admin;

  const formData = await request.formData();
  const courseId = formData.get('course_id');
  const userId = formData.get('user_id');
  const scheduledAtRaw = formData.get('scheduled_at');
  const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/sesiones-1-1');

  if (typeof courseId !== 'string' || !courseId.trim() || typeof userId !== 'string' || !userId.trim()) {
    const url = withToastParams(redirectTo, 'Faltan curso o alumno', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }
  if (typeof scheduledAtRaw !== 'string' || !scheduledAtRaw.trim()) {
    const url = withToastParams(redirectTo, 'Indica la fecha y hora de la reserva', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const scheduledAt = new Date(scheduledAtRaw.trim());
  if (Number.isNaN(scheduledAt.getTime())) {
    const url = withToastParams(redirectTo, 'Fecha y hora no válidas', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { data: course } = await db.from('courses').select('id, ends_at').eq('id', courseId.trim()).maybeSingle();
  if (!course) {
    const url = withToastParams(redirectTo, 'Curso no encontrado', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }
  const endsAt = course.ends_at ? new Date(String(course.ends_at)) : null;
  if (endsAt && endsAt < new Date()) {
    const url = withToastParams(redirectTo, 'El curso ya terminó; no se pueden registrar más reservas', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { data: enrollment } = await db
    .from('enrollments')
    .select('access_type')
    .eq('user_id', userId.trim())
    .eq('course_id', courseId.trim())
    .maybeSingle();
  if (!enrollment || (enrollment.access_type as string) === 'on_demand') {
    const url = withToastParams(redirectTo, 'El alumno no está inscrito en vivo en este curso', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { count } = await db
    .from('one_on_one_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId.trim())
    .eq('course_id', courseId.trim())
    .in('status', ['scheduled', 'completed']);
  if ((count ?? 0) >= MAX_BOOKINGS_PER_COURSE) {
    const url = withToastParams(redirectTo, 'Este alumno ya tiene 2 sesiones registradas para este curso', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { error } = await db.from('one_on_one_bookings').insert({
    user_id: userId.trim(),
    course_id: courseId.trim(),
    scheduled_at: scheduledAt.toISOString(),
    status: 'scheduled',
    source: 'our_app',
  });
  if (error) {
    const url = withToastParams(redirectTo, error.message || 'Error al guardar', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const url = withToastParams(redirectTo, 'Reserva registrada', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
