import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';

const MAX_BOOKINGS_PER_COURSE = 2;

const BOOKING_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
type BookingStatus = (typeof BOOKING_STATUSES)[number];

function parseStatus(v: FormDataEntryValue | null): BookingStatus | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return (BOOKING_STATUSES as readonly string[]).includes(t) ? (t as BookingStatus) : null;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db } = admin;

  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/sesiones-1-1');

  const bookingIdRaw = formData.get('booking_id');
  if (typeof bookingIdRaw === 'string' && bookingIdRaw.trim()) {
    return handleUpdate(db, formData, redirectTo, bookingIdRaw.trim());
  }

  return handleInsert(db, formData, redirectTo);
};

async function handleUpdate(db: SupabaseClient, formData: FormData, redirectTo: string, bookingId: string) {
  const courseId = formData.get('course_id');
  const scheduledAtRaw = formData.get('scheduled_at');
  const statusParsed = parseStatus(formData.get('status'));

  if (typeof courseId !== 'string' || !courseId.trim()) {
    const url = withToastParams(redirectTo, 'Falta el curso', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }
  if (typeof scheduledAtRaw !== 'string' || !scheduledAtRaw.trim()) {
    const url = withToastParams(redirectTo, 'Indica la fecha y hora de la reserva', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }
  if (!statusParsed) {
    const url = withToastParams(redirectTo, 'Estado no válido', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const scheduledAt = new Date(scheduledAtRaw.trim());
  if (Number.isNaN(scheduledAt.getTime())) {
    const url = withToastParams(redirectTo, 'Fecha y hora no válidas', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { data: row, error: fetchErr } = await db
    .from('one_on_one_bookings')
    .select('id, course_id, user_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (fetchErr || !row) {
    const url = withToastParams(redirectTo, 'Reserva no encontrada', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }
  if (String((row as { course_id: string }).course_id) !== courseId.trim()) {
    const url = withToastParams(redirectTo, 'La reserva no pertenece a este curso', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { error } = await db
    .from('one_on_one_bookings')
    .update({
      scheduled_at: scheduledAt.toISOString(),
      status: statusParsed,
    })
    .eq('id', bookingId);

  if (error) {
    const url = withToastParams(redirectTo, error.message || 'Error al actualizar', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const url = withToastParams(redirectTo, 'Reserva actualizada', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
}

async function handleInsert(db: SupabaseClient, formData: FormData, redirectTo: string) {
  const courseId = formData.get('course_id');
  const userId = formData.get('user_id');
  const scheduledAtRaw = formData.get('scheduled_at');

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
}
