import type { SupabaseClient } from '@supabase/supabase-js';

function compactMeta(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (typeof value === 'string') {
      out[key] = value.slice(0, 180);
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.slice(0, 20);
      continue;
    }
  }
  return out;
}

/**
 * Best-effort admin audit logging.
 * Safe by default: only active when ENABLE_ADMIN_AUDIT=true.
 * If table/env is missing, it silently no-ops.
 */
export async function recordAdminAudit(
  db: SupabaseClient,
  actorUserId: string,
  action: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  if (import.meta.env.ENABLE_ADMIN_AUDIT !== 'true') return;
  try {
    await db.from('admin_audit_logs').insert({
      actor_user_id: actorUserId,
      action: action.slice(0, 120),
      meta: compactMeta(meta),
      created_at: new Date().toISOString(),
    });
  } catch {
    // no-op on purpose to avoid breaking request flow
  }
}
