import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || 'curso';
}

export const POST: APIRoute = async ({ request, locals }) => {
  console.log('[courses API] reached');
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const db = getSupabaseServiceRoleClient();
  const { data: userRow } = await db.from('users').select('role').eq('id', userId).maybeSingle();
  if ((userRow?.role as string) !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const action = formData.get('action');
  console.log('[courses API] action:', action);
  if (action !== 'create' && action !== 'update') {
    return new Response(JSON.stringify({ error: 'action=create|update required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const title = typeof formData.get('title') === 'string' ? String(formData.get('title')).trim() : '';
  const description = typeof formData.get('description') === 'string' ? String(formData.get('description')).trim() || null : null;
  const cover_image = typeof formData.get('cover_image') === 'string' ? String(formData.get('cover_image')).trim() || null : null;

  if (action === 'create') {
    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const { data: existing, error: slugError } = await db
        .from('courses')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (slugError) {
        return new Response(JSON.stringify({ error: slugError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (!existing) break;
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const { data, error } = await db
      .from('courses')
      .insert({
        title,
        slug,
        description,
        cover_image,
        created_by: userId,
      });
    console.log('[courses API] insert result:', { data, error });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    const course_id = formData.get('course_id');
    if (typeof course_id !== 'string' || !course_id.trim()) {
      return new Response(JSON.stringify({ error: 'course_id required for update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const update: { title?: string; description: string | null; cover_image: string | null } = {
      description,
      cover_image,
    };
    if (title) update.title = title;
    await db.from('courses').update(update).eq('id', course_id.trim());
  }

  const redirectTo = formData.get('redirect_to');
  const url = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : '/admin/courses';
  return new Response(null, { status: 303, headers: { Location: url } });
};
