import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { normalizeAvatarId } from '../../lib/avatars';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const formData = await request.formData();
  const raw = formData.get('avatar_id');
  const avatarId = normalizeAvatarId(typeof raw === 'string' ? raw : null);

  if (avatarId) {
    const db = getSupabaseServiceRoleClient();
    await db.from('users').update({ avatar_id: avatarId }).eq('id', userId);
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/profile' },
  });
};
