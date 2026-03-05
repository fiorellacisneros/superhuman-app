import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from './supabase';

type AuthLike = {
  isAuthenticated: boolean;
  userId: string | null;
  redirectToSignIn: () => Response;
};

type LocalsLike = {
  auth: () => AuthLike;
};

type AdminContext = {
  db: SupabaseClient;
  userId: string;
};

export async function requireAdmin(locals: LocalsLike): Promise<Response | AdminContext> {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) return redirectToSignIn();

  const db = getSupabaseServiceRoleClient();
  const { data: userRow } = await db.from('users').select('role').eq('id', userId).maybeSingle();
  if ((userRow?.role as string) !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { db, userId };
}
