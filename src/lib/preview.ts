import type { APIContext } from 'astro';

const PREVIEW_COOKIE = 'admin_preview';

/**
 * Obtiene el contexto de vista previa para un admin.
 * - preview: true si está en modo "ver como estudiante" (URL o cookie)
 */
export function getPreviewContext(context: APIContext): { preview: boolean; courseSlug: string | null } {
  const url = context.url;
  const previewFromUrl = url.searchParams.get('preview') === 'true';
  const courseFromUrl = url.searchParams.get('course');
  const previewFromCookie = context.cookies.get(PREVIEW_COOKIE)?.value === '1';

  // Si hay cookie de preview, estamos en modo estudiante aunque la URL no lo indique
  const preview = previewFromUrl || previewFromCookie;

  return { preview, courseSlug: courseFromUrl || null };
}

/**
 * Establece la cookie de preview (para persistir al navegar).
 */
export function setPreviewCookie(context: APIContext): void {
  context.cookies.set(PREVIEW_COOKIE, '1', { path: '/', maxAge: 60 * 60 * 24 });
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
export function withPreviewParams(href: string, preview: boolean): string {
  if (!preview) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}preview=true`;
}
