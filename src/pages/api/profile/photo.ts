import type { APIRoute } from 'astro';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';
import { safeRedirectPath } from '../../../lib/request-security';

const BUCKET = 'profile-photos';
const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId, redirectToSignIn } = locals.auth();
  if (!isAuthenticated || !userId) {
    return redirectToSignIn();
  }

  const formData = await request.formData();
  const file = formData.get('photo') as File | null;
  const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/profile');

  if (!file || !(file instanceof File) || file.size === 0) {
    return new Response(null, {
      status: 303,
      headers: { Location: `${redirectTo}?toast=Foto+no+válida&toast_type=error` },
    });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return new Response(null, {
      status: 303,
      headers: { Location: `${redirectTo}?toast=La+foto+debe+pesar+menos+de+500KB&toast_type=error` },
    });
  }

  const mime = file.type?.toLowerCase() || '';
  if (!ALLOWED_TYPES.includes(mime)) {
    return new Response(null, {
      status: 303,
      headers: { Location: `${redirectTo}?toast=Solo+JPEG,+PNG+o+WebP&toast_type=error` },
    });
  }

  const supabase = getSupabaseServiceRoleClient();
  const ext = getExt(mime);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: mime });

  if (uploadError) {
    console.error('Profile photo upload error:', uploadError);
    return new Response(null, {
      status: 303,
      headers: { Location: `${redirectTo}?toast=Error+al+subir.+Crea+el+bucket+profile-photos+en+Supabase&toast_type=error` },
    });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;

  if (publicUrl) {
    await supabase.from('users').update({ profile_photo_url: publicUrl }).eq('id', userId);
  }

  return new Response(null, {
    status: 303,
    headers: { Location: `${redirectTo}?toast=Foto+actualizada&toast_type=success` },
  });
};
