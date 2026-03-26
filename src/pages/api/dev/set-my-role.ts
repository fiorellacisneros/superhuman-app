/**
 * Solo en `astro dev` (import.meta.env.DEV).
 * Cambia el rol del usuario autenticado en Supabase y en Clerk (publicMetadata),
 * igual que hace el panel admin vía /api/admin/set-role.
 *
 * Uso en la consola del navegador (estando logueado en localhost):
 *
 *   fetch('/api/dev/set-my-role', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     credentials: 'include',
 *     body: JSON.stringify({ role: 'student' }),
 *   }).then((r) => r.json()).then(console.log);
 *
 *   // o volver a admin:
 *   fetch('/api/dev/set-my-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ role: 'admin' }) }).then(r => r.json()).then(console.log);
 *
 * Si /admin sigue en 403, recarga forzada o cierra sesión: el JWT puede tardar un momento en reflejar metadata.
 */
import type { APIRoute } from 'astro';
import { createClerkClient } from '@clerk/backend';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!import.meta.env.DEV) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const auth = locals.auth();
  if (!auth?.isAuthenticated || !auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (role !== 'admin' && role !== 'student') {
    return new Response(JSON.stringify({ error: 'role must be "admin" or "student"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secretKey = import.meta.env.CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'CLERK_SECRET_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clerk = createClerkClient({ secretKey });
  await clerk.users.updateUserMetadata(auth.userId, {
    publicMetadata: { role },
  });

  const db = getSupabaseServiceRoleClient();
  const { data: updated, error: updateError } = await db.from('users').update({ role }).eq('id', auth.userId).select('id');
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!updated?.length) {
    const { error: insertError } = await db.from('users').insert({ id: auth.userId, role });
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      userId: auth.userId,
      role,
      hint: 'Recarga la página; si /admin no abre, prueba cerrar sesión y entrar de nuevo.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
