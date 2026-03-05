import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { normalizeAvatarId } from '../../lib/avatars';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const formData = await request.formData();
  const intent = formData.get('intent');
  const db = getSupabaseServiceRoleClient();

  if (intent === 'display_name') {
    const rawName = formData.get('display_name');
    const displayName = typeof rawName === 'string' ? rawName.trim().slice(0, 80) : '';
    if (displayName) {
      await db.from('users').update({ display_name: displayName }).eq('id', userId);
    }
    return new Response(null, {
      status: 303,
      headers: { Location: '/profile' },
    });
  }

  if (intent === 'profile') {
    const rawDescription = formData.get('description');
    const rawRole = formData.get('self_declared_role');
    const showInDirectory = formData.get('show_in_directory') === 'on';
    const description = typeof rawDescription === 'string' ? rawDescription.trim().slice(0, 500) : '';
    const selfDeclaredRole = typeof rawRole === 'string' ? rawRole.trim().slice(0, 80) : '';
    await db
      .from('users')
      .update({
        description: description || null,
        self_declared_role: selfDeclaredRole || null,
        show_in_directory: showInDirectory,
      })
      .eq('id', userId);
    return new Response(null, {
      status: 303,
      headers: { Location: '/profile' },
    });
  }

  const raw = formData.get('avatar_id');
  const avatarId = normalizeAvatarId(typeof raw === 'string' ? raw : null);

  if (avatarId) {
    await db.from('users').update({ avatar_id: avatarId }).eq('id', userId);
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/profile' },
  });
};
