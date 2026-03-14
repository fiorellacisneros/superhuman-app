import type { APIRoute } from 'astro';
import { safeRedirectPath, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';

const MAX_ASISTENCIAS = 2;

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db } = admin;

  const formData = await request.formData();
  const userId = formData.get('user_id');
  const attendedAtRaw = formData.get('attended_at');
  const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/sesiones-1-1');

  if (typeof userId !== 'string' || !userId.trim()) {
    const url = withToastParams(redirectTo, 'Selecciona un alumno', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { data: enrollments } = await db
    .from('enrollments')
    .select('access_type')
    .eq('user_id', userId.trim());
  const hasOnlyOnDemand =
    (enrollments ?? []).length > 0 && (enrollments ?? []).every((e) => (e.access_type as string) === 'on_demand');
  if (!hasOnlyOnDemand) {
    const url = withToastParams(redirectTo, 'Solo se puede registrar asistencia a alumnos on-demand', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { count } = await db
    .from('sesion_grupal_asistencias')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId.trim());
  if ((count ?? 0) >= MAX_ASISTENCIAS) {
    const url = withToastParams(redirectTo, 'Este alumno ya tiene 2 sesiones grupales registradas', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  let attendedAt = new Date();
  if (typeof attendedAtRaw === 'string' && attendedAtRaw.trim()) {
    const parsed = new Date(attendedAtRaw.trim());
    if (!Number.isNaN(parsed.getTime())) attendedAt = parsed;
  }

  const { error } = await db.from('sesion_grupal_asistencias').insert({
    user_id: userId.trim(),
    attended_at: attendedAt.toISOString(),
  });
  if (error) {
    const url = withToastParams(redirectTo, 'Error al registrar: ' + (error.message ?? 'intenta de nuevo'), 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const url = withToastParams(redirectTo, 'Asistencia a sesión grupal registrada', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
