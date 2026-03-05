import type { APIRoute } from 'astro';
import { createClerkClient } from '@clerk/backend';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId: requesterId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !requesterId) {
    return redirectToSignIn();
  }

  const db = getSupabaseServiceRoleClient();
  const { data: requesterRow } = await db.from('users').select('role').eq('id', requesterId).maybeSingle();
  if ((requesterRow?.role as string) !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { userId: string; role: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { userId, role } = body;
  if (typeof userId !== 'string' || !userId.trim()) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (typeof role !== 'string' || !['admin', 'student'].includes(role)) {
    return new Response(JSON.stringify({ error: 'role must be "admin" or "student"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secretKey = import.meta.env.CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Clerk secret key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clerk = createClerkClient({ secretKey });
  await clerk.users.updateUserMetadata(userId.trim(), {
    publicMetadata: { role },
  });

  await db.from('users').update({ role }).eq('id', userId.trim());

  return new Response(JSON.stringify({ ok: true, userId: userId.trim(), role }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
