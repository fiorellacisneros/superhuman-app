import type { APIContext } from 'astro';

const PREVIEW_COOKIE = 'admin_preview';

export type PreviewAs = 'live' | 'on_demand';

/**
 * Obtiene el contexto de vista previa para un admin.
 * - preview: true si está en modo "ver como estudiante" (URL o cookie)
 * - previewAs: 'live' | 'on_demand' para forzar tipo de estudiante en la vista previa
 */
export function getPreviewContext(context: APIContext): {
  preview: boolean;
  previewAs: PreviewAs;
  courseSlug: string | null;
} {
  const url = context.url;
  const previewFromUrl = url.searchParams.get('preview') === 'true';
  const courseFromUrl = url.searchParams.get('course');
  const cookieVal = context.cookies.get(PREVIEW_COOKIE)?.value;
  const previewFromCookie = cookieVal === '1' || cookieVal === 'live' || cookieVal === 'on_demand';

  const preview = previewFromUrl || previewFromCookie;

  const asParam = url.searchParams.get('as');
  const previewAsFromUrl = asParam === 'on_demand' ? 'on_demand' : asParam === 'live' ? 'live' : null;
  const previewAsFromCookie = cookieVal === 'on_demand' ? 'on_demand' : cookieVal === 'live' || cookieVal === '1' ? 'live' : null;

  const previewAs: PreviewAs = previewAsFromUrl ?? previewAsFromCookie ?? 'live';

  return { preview, previewAs, courseSlug: courseFromUrl || null };
}

/**
 * Establece la cookie de preview (para persistir al navegar).
 * @param type - 'live' = estudiante en vivo, 'on_demand' = estudiante on-demand
 */
export function setPreviewCookie(context: APIContext, type: PreviewAs = 'live'): void {
  context.cookies.set(PREVIEW_COOKIE, type, { path: '/', maxAge: 60 * 60 * 24 });
}

/**
 * Limpia la cookie de preview.
 */
export function clearPreviewCookie(context: APIContext): void {
  context.cookies.delete(PREVIEW_COOKIE, { path: '/' });
}

/**
 * Añade los query params de preview a una URL.
 */
export function withPreviewParams(
  href: string,
  preview: boolean,
  previewAs: PreviewAs = 'live',
): string {
  if (!preview) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}preview=true&as=${previewAs}`;
}
