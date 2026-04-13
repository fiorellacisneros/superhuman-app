import type { APIRoute } from 'astro';
import { safeRedirectPath, withToastParams, sanitizeHttpUrl } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';

function parseSessionId(v: FormDataEntryValue | null): number | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const n = parseInt(v.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db } = admin;

  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/sesiones-1-1');
  const sgAction = typeof formData.get('sg_action') === 'string' ? formData.get('sg_action')!.toString().trim() : '';
  const sessionId = parseSessionId(formData.get('session_id'));

  if (sgAction === 'delete') {
    if (sessionId == null) {
      const url = withToastParams(redirectTo, 'Sesión no válida', 'error');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    const { error } = await db.from('sesion_grupal_sesiones').delete().eq('id', sessionId);
    if (error) {
      const url = withToastParams(redirectTo, error.message ?? 'Error al eliminar', 'error');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    const url = withToastParams(redirectTo, 'Sesión grupal eliminada', 'success');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  if (sgAction === 'update') {
    if (sessionId == null) {
      const url = withToastParams(redirectTo, 'Sesión no válida', 'error');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    const title = typeof formData.get('title') === 'string' ? formData.get('title')!.toString().trim().slice(0, 200) || null : null;
    const linkUrl = sanitizeHttpUrl(formData.get('link_url'));
    const fechaLabel =
      typeof formData.get('fecha_label') === 'string' ? formData.get('fecha_label')!.toString().trim().slice(0, 200) || null : null;

    if (!linkUrl) {
      const url = withToastParams(redirectTo, 'El enlace de la sesión es obligatorio y debe ser http(s)', 'error');
      return new Response(null, { status: 303, headers: { Location: url } });
    }

    const { error } = await db
      .from('sesion_grupal_sesiones')
      .update({
        title: title ?? 'Sesión grupal',
        link_url: linkUrl,
        fecha_label: fechaLabel,
      })
      .eq('id', sessionId);

    if (error) {
      const url = withToastParams(redirectTo, 'Error al guardar: ' + (error.message ?? 'intenta de nuevo'), 'error');
      return new Response(null, { status: 303, headers: { Location: url } });
    }
    const url = withToastParams(redirectTo, 'Sesión grupal actualizada', 'success');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const title = typeof formData.get('title') === 'string' ? formData.get('title')!.toString().trim().slice(0, 200) || null : null;
  const linkUrl = sanitizeHttpUrl(formData.get('link_url'));
  const fechaLabel =
    typeof formData.get('fecha_label') === 'string' ? formData.get('fecha_label')!.toString().trim().slice(0, 200) || null : null;

  if (!linkUrl) {
    const url = withToastParams(redirectTo, 'El enlace de la sesión es obligatorio y debe ser http(s)', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const { data: maxRow } = await db
    .from('sesion_grupal_sesiones')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { order_index?: number } | null)?.order_index ?? 0) + 1;

  const { error } = await db.from('sesion_grupal_sesiones').insert({
    title: title ?? 'Sesión grupal',
    link_url: linkUrl,
    fecha_label: fechaLabel,
    order_index: nextOrder,
  });

  if (error) {
    const url = withToastParams(redirectTo, 'Error al guardar: ' + (error.message ?? 'intenta de nuevo'), 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  const url = withToastParams(redirectTo, 'Sesión grupal agregada. Los alumnos on-demand la verán en su listado.', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
