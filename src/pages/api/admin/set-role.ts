import type { APIRoute } from 'astro';
import { createClerkClient } from '@clerk/backend';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId: requesterId } = admin;
  if (isRateLimited(`admin-set-role:${requesterId}`, 20, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many role updates, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
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
  await recordAdminAudit(db, requesterId, 'user.set_role', {
    targetUserId: userId.trim(),
    role,
  });

  return new Response(JSON.stringify({ ok: true, userId: userId.trim(), role }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
