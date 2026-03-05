import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { safeRedirectPath } from '../../lib/request-security';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const db = getSupabaseServiceRoleClient();
  const { data: userRow } = await db.from('users').select('role').eq('id', userId).maybeSingle();
  if ((userRow?.role as string) !== 'admin') {
    return new Response(JSON.stringify({ error: 'Attendance is managed by admin only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get('redirect_to'), '');
  if (redirectTo) return new Response(null, { status: 303, headers: { Location: redirectTo } });
  return new Response(JSON.stringify({ error: 'Use /api/admin/attendance for attendance updates' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
};
