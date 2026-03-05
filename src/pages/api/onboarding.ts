import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { normalizeAvatarId } from '../../lib/avatars';
import { safeRedirectPath } from '../../lib/request-security';

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const formData = await request.formData();
  const intent = formData.get('intent');
  const displayNameRaw = formData.get('display_name');
  const avatarIdRaw = formData.get('avatar_id');
  const descriptionRaw = formData.get('description');
  const selfDeclaredRoleRaw = formData.get('self_declared_role');
  const showInDirectory = formData.get('show_in_directory') === 'on';

  const db = getSupabaseServiceRoleClient();

  if (intent === 'display_name') {
    const name = typeof displayNameRaw === 'string' ? displayNameRaw.trim().slice(0, 80) : '';
    if (name) {
      await db
        .from('users')
        .update({ display_name: name })
        .eq('id', userId)
        .select('display_name')
        .single();
    }
    const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/onboarding?step=2');
    return new Response(null, {
      status: 303,
      headers: { Location: redirectTo },
    });
  }

  if (intent === 'avatar') {
    const id = normalizeAvatarId(typeof avatarIdRaw === 'string' ? avatarIdRaw : null);
    if (id) {
      await db
        .from('users')
        .update({ avatar_id: id })
        .eq('id', userId)
        .select('avatar_id')
        .single();
    }
    const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/dashboard');
    return new Response(null, {
      status: 303,
      headers: { Location: redirectTo },
    });
  }

  if (intent === 'profile') {
    const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim().slice(0, 500) : null;
    const selfDeclaredRole = typeof selfDeclaredRoleRaw === 'string' ? selfDeclaredRoleRaw.trim().slice(0, 80) : null;
    try {
      await db
        .from('users')
        .update({
          description: description || null,
          self_declared_role: selfDeclaredRole || null,
          show_in_directory: showInDirectory,
        })
        .eq('id', userId);
    } catch (e) {
      // Columns may not exist yet — run docs/supabase-profile-fields.sql in Supabase
    }
    const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/profile');
    return new Response(null, {
      status: 303,
      headers: { Location: redirectTo },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/onboarding' },
  });
};
