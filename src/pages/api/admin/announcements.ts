import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeRedirectPath, sanitizeHttpUrl, withToastParams } from '../../../lib/request-security';
import { requireAdmin } from '../../../lib/api-admin';
import { isRateLimited } from '../../../lib/rate-limit';
import { recordAdminAudit } from '../../../lib/security-audit';
import { parseAdminDateTimeLocalToIsoUtc } from '../../../lib/challenge-deadline';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';
import {
  parseBodyItemsFromForm,
  parseButtonsFromForm,
  hasAnnouncementVisibleContent,
  parseVisibilityRulesFromForm,
  deriveLegacyFromVisibility,
} from '../../../lib/announcements';

const BUCKET = 'announcement-images';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function uploadAnnouncementImage(
  supabase: SupabaseClient,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!file || file.size === 0) return { error: '' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'La imagen no puede superar 2 MB' };
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return { error: 'Solo JPG, PNG, WebP o GIF' };
  }
  const safeName = (file.name || 'img')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
  const path = `avisos/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) {
    console.error('announcement image upload', upErr);
    return {
      error:
        'No se pudo subir la imagen. Crea el bucket público announcement-images en Supabase Storage o usa un enlace HTTPS.',
    };
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = pub?.publicUrl;
  if (!url) return { error: 'No se obtuvo URL pública de la imagen' };
  return { url };
}

function readCommonFields(formData: FormData) {
  const badge_text =
    typeof formData.get('badge_text') === 'string'
      ? formData.get('badge_text')!.trim().slice(0, 120) || null
      : null;
  const title =
    typeof formData.get('title') === 'string' ? formData.get('title')!.trim().slice(0, 200) || null : null;
  const subtitle =
    typeof formData.get('subtitle') === 'string'
      ? formData.get('subtitle')!.trim().slice(0, 400) || null
      : null;
  const image_url_existing = sanitizeHttpUrl(formData.get('image_url'));
  const content_mode_raw = formData.get('content_mode');
  const content_mode = content_mode_raw === 'bullets' ? 'bullets' : 'text';
  const body_section_label =
    typeof formData.get('body_section_label') === 'string'
      ? formData.get('body_section_label')!.trim().slice(0, 120) || null
      : null;
  const body_text_raw = formData.get('body_text');
  const body_text =
    content_mode === 'text' && typeof body_text_raw === 'string'
      ? body_text_raw.trim().slice(0, 4000) || null
      : null;
  const body_items = content_mode === 'bullets' ? parseBodyItemsFromForm(formData) : [];
  const buttons = parseButtonsFromForm(formData);
  const audience_raw = formData.get('audience');
  const audience = audience_raw === 'course' ? 'course' : 'all';
  const course_id_raw = formData.get('course_id');
  const course_id =
    audience === 'course' && typeof course_id_raw === 'string' && course_id_raw.trim()
      ? course_id_raw.trim()
      : null;

  const startsRaw = formData.get('starts_at');
  const endsRaw = formData.get('ends_at');
  const startsTrim = typeof startsRaw === 'string' ? startsRaw.trim() : '';
  const endsTrim = typeof endsRaw === 'string' ? endsRaw.trim() : '';
  const starts_at = startsTrim ? parseAdminDateTimeLocalToIsoUtc(startsTrim) : null;
  const ends_at = endsTrim ? parseAdminDateTimeLocalToIsoUtc(endsTrim) : null;

  const sortRaw = formData.get('sort_order');
  let sort_order = 0;
  if (typeof sortRaw === 'string' && sortRaw.trim()) {
    const n = Number(sortRaw);
    if (Number.isFinite(n)) sort_order = Math.min(9999, Math.max(0, Math.trunc(n)));
  }

  const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true';

  const visibility_conditions = parseVisibilityRulesFromForm(formData);
  const { min_points, require_enrolled_course_id } = deriveLegacyFromVisibility(visibility_conditions);

  return {
    badge_text,
    title,
    subtitle,
    image_url_existing,
    content_mode,
    body_section_label,
    body_text,
    body_items,
    buttons,
    audience,
    course_id,
    starts_at,
    ends_at,
    startsTrim,
    endsTrim,
    sort_order,
    is_active,
    visibility_conditions,
    min_points,
    require_enrolled_course_id,
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId } = admin;

  const formData = await request.formData();
  const action = formData.get('action');
  const redirect = safeRedirectPath(formData.get('redirect_to'), '/admin/avisos');
  const errorRedirect = (message: string, status = 303) =>
    new Response(null, {
      status,
      headers: { Location: withToastParams(redirect, message, 'error') },
    });

  if (
    action !== 'create' &&
    action !== 'update' &&
    action !== 'delete' &&
    action !== 'toggle'
  ) {
    return errorRedirect('Acción de aviso inválida', 303);
  }
  if (isRateLimited(`admin-announcements:${userId}`, 50, 60_000)) {
    return errorRedirect('Demasiadas solicitudes, intenta en un minuto', 303);
  }

  if (action === 'delete') {
    const id = formData.get('announcement_id');
    if (typeof id !== 'string' || !id.trim()) {
      return errorRedirect('Falta el id del aviso', 303);
    }
    const { error } = await db.from('announcements').delete().eq('id', id.trim());
    if (error) return errorRedirect(`No se pudo eliminar: ${error.message}`, 303);
    await recordAdminAudit(db, userId, 'announcement.delete', { id: id.trim() });
    return new Response(null, {
      status: 303,
      headers: { Location: withToastParams(redirect, 'Aviso eliminado', 'success') },
    });
  }

  if (action === 'toggle') {
    const id = formData.get('announcement_id');
    if (typeof id !== 'string' || !id.trim()) {
      return errorRedirect('Falta el id del aviso', 303);
    }
    const { data: row } = await db.from('announcements').select('is_active').eq('id', id.trim()).maybeSingle();
    if (!row) return errorRedirect('Aviso no encontrado', 303);
    const next = !row.is_active;
    const { error } = await db.from('announcements').update({ is_active: next }).eq('id', id.trim());
    if (error) return errorRedirect(`No se pudo actualizar: ${error.message}`, 303);
    await recordAdminAudit(db, userId, 'announcement.toggle', { id: id.trim(), is_active: next });
    return new Response(null, {
      status: 303,
      headers: {
        Location: withToastParams(redirect, next ? 'Aviso activado' : 'Aviso desactivado', 'success'),
      },
    });
  }

  const common = readCommonFields(formData);

  if (common.startsTrim && !common.starts_at) {
    return errorRedirect('Fecha de inicio inválida (usa el calendario, hora Perú)', 303);
  }
  if (common.endsTrim && !common.ends_at) {
    return errorRedirect('Fecha de fin inválida (usa el calendario, hora Perú)', 303);
  }
  if (common.audience === 'course' && !common.course_id) {
    return errorRedirect('Elige un curso o cambia la audiencia a «Todos»', 303);
  }
  if (common.content_mode === 'bullets' && common.body_items.length === 0) {
    return errorRedirect('En modo lista, añade al menos un ítem o usa texto libre', 303);
  }

  const supabase = getSupabaseServiceRoleClient();
  const imageFile = formData.get('image_file');
  let image_url: string | null = common.image_url_existing;
  if (imageFile instanceof File && imageFile.size > 0) {
    const up = await uploadAnnouncementImage(supabase, imageFile);
    if ('error' in up && up.error) return errorRedirect(up.error, 303);
    if ('url' in up) image_url = up.url;
  }

  const visible = hasAnnouncementVisibleContent({
    badge_text: common.badge_text,
    title: common.title,
    subtitle: common.subtitle,
    image_url,
    body_text: common.body_text,
    body_items: common.body_items,
    buttons: common.buttons,
  });
  if (!visible) {
    return errorRedirect('Añade al menos un título, texto, imagen, lista o botón', 303);
  }

  const sharedPayload: Record<string, unknown> = {
    is_active: common.is_active,
    sort_order: common.sort_order,
    badge_text: common.badge_text,
    title: common.title,
    subtitle: common.subtitle,
    image_url,
    content_mode: common.content_mode,
    body_section_label: common.body_section_label,
    body_text: common.body_text,
    body_items: common.body_items,
    buttons: common.buttons,
    audience: common.audience,
    course_id: common.audience === 'all' ? null : common.course_id,
    starts_at: common.starts_at,
    ends_at: common.ends_at,
    min_points: common.min_points,
    require_enrolled_course_id: common.require_enrolled_course_id,
    visibility_conditions: common.visibility_conditions,
  };

  if (action === 'create') {
    let { error: insertError } = await db
      .from('announcements')
      .insert({ ...sharedPayload, created_by: userId });
    if (
      insertError &&
      /min_points|require_enrolled_course_id|visibility_conditions|column/i.test(String(insertError.message))
    ) {
      const fallback = { ...sharedPayload, created_by: userId };
      delete fallback.min_points;
      delete fallback.require_enrolled_course_id;
      delete fallback.visibility_conditions;
      const retry = await db.from('announcements').insert(fallback);
      insertError = retry.error;
    }
    if (insertError) return errorRedirect(`No se pudo crear: ${insertError.message}`, 303);
    await recordAdminAudit(db, userId, 'announcement.create', { title: common.title });
    return new Response(null, {
      status: 303,
      headers: { Location: withToastParams(redirect, 'Aviso creado', 'success') },
    });
  }

  const annId = formData.get('announcement_id');
  if (typeof annId !== 'string' || !annId.trim()) {
    return errorRedirect('Falta el id del aviso', 303);
  }

  let { error: updateError } = await db.from('announcements').update(sharedPayload).eq('id', annId.trim());
  if (
    updateError &&
    /min_points|require_enrolled_course_id|visibility_conditions|column/i.test(String(updateError.message))
  ) {
    const fallback = { ...sharedPayload };
    delete fallback.min_points;
    delete fallback.require_enrolled_course_id;
    delete fallback.visibility_conditions;
    const retry = await db.from('announcements').update(fallback).eq('id', annId.trim());
    updateError = retry.error;
  }
  if (updateError) return errorRedirect(`No se pudo guardar: ${updateError.message}`, 303);
  await recordAdminAudit(db, userId, 'announcement.update', { id: annId.trim() });
  return new Response(null, {
    status: 303,
    headers: { Location: withToastParams(redirect, 'Aviso actualizado', 'success') },
  });
};
