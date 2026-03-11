import type { APIRoute } from 'astro';
import { safeRedirectPath, withToastParams } from '../../../../lib/request-security';
import { requireAdmin } from '../../../../lib/api-admin';
import { isRateLimited } from '../../../../lib/rate-limit';
import { recordAdminAudit } from '../../../../lib/security-audit';
import { createClerkClient } from '@clerk/backend';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId: adminUserId } = admin;

  if (isRateLimited(`admin-delete-student:${adminUserId}`, 10, 60_000)) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes, intenta más tarde' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const formData = await request.formData();
  const targetUserId = formData.get('user_id');
  if (typeof targetUserId !== 'string' || !targetUserId.trim()) {
    return new Response(JSON.stringify({ error: 'user_id requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const uid = targetUserId.trim();

  // No permitir que un admin se elimine a sí mismo
  if (uid === adminUserId) {
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/students');
    const url = withToastParams(redirect, 'No puedes eliminarte a ti mismo', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  // Verificar que es estudiante
  const { data: targetUser } = await db.from('users').select('role').eq('id', uid).maybeSingle();
  if (!targetUser || (targetUser.role as string) !== 'student') {
    const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/students');
    const url = withToastParams(redirect, 'Solo se pueden eliminar estudiantes', 'error');
    return new Response(null, { status: 303, headers: { Location: url } });
  }

  // Eliminar en orden (respetar FKs)
  await db.from('enrollments').delete().eq('user_id', uid);
  await db.from('user_badges').delete().eq('user_id', uid);
  await db.from('submissions').delete().eq('user_id', uid);
  try {
    await db.from('attendance').delete().eq('user_id', uid);
    await db.from('kahoot_results').delete().eq('user_id', uid);
  } catch {
    // Tablas opcionales pueden no existir
  }
  const { error: deleteUserError } = await db.from('users').delete().eq('id', uid);

  if (deleteUserError) {
    return new Response(JSON.stringify({ error: deleteUserError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Eliminar de Clerk (opcional, puede fallar si el usuario no existe)
  const secretKey = import.meta.env.CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
  if (secretKey) {
    try {
      const clerk = createClerkClient({ secretKey });
      await clerk.users.deleteUser(uid);
    } catch {
      // No bloquear si Clerk falla (ej. usuario de prueba)
    }
  }

  await recordAdminAudit(db, adminUserId, 'student.delete', { targetUserId: uid });

  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/students');
  const url = withToastParams(redirect, 'Estudiante eliminado', 'success');
  return new Response(null, { status: 303, headers: { Location: url } });
};
