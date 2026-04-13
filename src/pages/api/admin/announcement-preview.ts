import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/api-admin';
import { renderMarkdown } from '../../../lib/markdown';
import { isAllowedBulletIcon } from '../../../lib/announcements';

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as never);
  if (admin instanceof Response) return admin;

  let json: Record<string, unknown>;
  try {
    json = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mode = json.content_mode === 'bullets' ? 'bullets' : 'text';
  const body_text = typeof json.body_text === 'string' ? json.body_text : '';

  const rawItems = Array.isArray(json.body_items) ? json.body_items : [];
  const items: { icon: string; html: string }[] = [];
  for (const row of rawItems.slice(0, 12)) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text.trim() : '';
    if (!text) continue;
    const iconRaw = typeof o.icon === 'string' ? o.icon.trim() : '';
    const icon = isAllowedBulletIcon(iconRaw) ? iconRaw : 'bi-check-lg';
    items.push({ icon, html: renderMarkdown(text) });
  }

  const body_html = mode === 'text' ? renderMarkdown(body_text) : '';

  return new Response(JSON.stringify({ body_html, items }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
