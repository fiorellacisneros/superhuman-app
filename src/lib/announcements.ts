import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeHttpUrl } from './request-security';

/** Iconos permitidos en ítems tipo lista (Bootstrap Icons). */
export const ANNOUNCEMENT_BULLET_ICONS: { value: string; label: string }[] = [
  { value: 'bi-lightning-charge-fill', label: 'Rayo' },
  { value: 'bi-star-fill', label: 'Estrella' },
  { value: 'bi-trophy-fill', label: 'Trofeo' },
  { value: 'bi-award-fill', label: 'Premio' },
  { value: 'bi-person-plus-fill', label: 'Persona +' },
  { value: 'bi-gift-fill', label: 'Regalo' },
  { value: 'bi-heart-fill', label: 'Corazón' },
  { value: 'bi-check-lg', label: 'Check' },
  { value: 'bi-bookmark-star-fill', label: 'Marcador' },
  { value: 'bi-rocket-takeoff-fill', label: 'Cohete' },
];

export type AnnouncementBodyItem = { icon: string; text: string };

export type AnnouncementButton =
  | { type: 'link'; label: string; href: string; variant: 'primary' | 'outline' }
  | { type: 'copy'; label: string; url: string; variant: 'primary' | 'outline' };

/** Modo de combinación de reglas (como “todas / cualquiera” en builders de visibilidad). */
export type VisibilityMatchMode = 'all' | 'any';

export type VisibilityRule =
  | { field: 'points_total'; op: 'gte' | 'lte' | 'eq'; value: number }
  | { field: 'enrolled_course'; op: 'enrolled'; courseId: string }
  | { field: 'cohort_mode'; op: 'eq'; value: 'live' | 'on_demand' };

export type VisibilityConditions = {
  match: VisibilityMatchMode;
  rules: VisibilityRule[];
};

const EMPTY_VISIBILITY: VisibilityConditions = { match: 'all', rules: [] };

function normalizeOneRule(item: unknown): VisibilityRule | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const field = o.field;
  if (field === 'points_total') {
    const op = o.op === 'lte' || o.op === 'eq' ? o.op : 'gte';
    const n = Number(o.value);
    if (!Number.isFinite(n)) return null;
    return { field: 'points_total', op, value: Math.min(999999, Math.max(0, Math.trunc(n))) };
  }
  if (field === 'enrolled_course') {
    const cid =
      (typeof o.courseId === 'string' && o.courseId.trim()) ||
      (typeof o.course_id === 'string' && o.course_id.trim())
        ? String(o.courseId || o.course_id).trim()
        : '';
    if (!cid) return null;
    return { field: 'enrolled_course', op: 'enrolled', courseId: cid };
  }
  if (field === 'cohort_mode') {
    const v = o.value === 'on_demand' ? 'on_demand' : o.value === 'live' ? 'live' : null;
    if (!v) return null;
    return { field: 'cohort_mode', op: 'eq', value: v };
  }
  return null;
}

export function normalizeVisibilityConditions(raw: unknown): VisibilityConditions {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_VISIBILITY };
  const o = raw as Record<string, unknown>;
  const match: VisibilityMatchMode = o.match === 'any' ? 'any' : 'all';
  const arr = Array.isArray(o.rules) ? o.rules : [];
  const rules: VisibilityRule[] = [];
  for (const item of arr) {
    const r = normalizeOneRule(item);
    if (r) rules.push(r);
  }
  return { match, rules: rules.slice(0, 20) };
}

/** Une JSON en BD con columnas legacy (min_points / require_enrolled_course_id). */
export function resolveVisibilityConditionsFromRow(row: Record<string, unknown>): VisibilityConditions {
  const fromJson = normalizeVisibilityConditions(row.visibility_conditions);
  if (fromJson.rules.length > 0) return fromJson;

  const rules: VisibilityRule[] = [];
  const min = row.min_points;
  if (min != null && min !== '') {
    const n = Number(min);
    if (Number.isFinite(n) && n >= 0) {
      rules.push({ field: 'points_total', op: 'gte', value: Math.min(999999, Math.trunc(n)) });
    }
  }
  const req = row.require_enrolled_course_id;
  if (typeof req === 'string' && req.trim()) {
    rules.push({ field: 'enrolled_course', op: 'enrolled', courseId: req.trim() });
  }
  return { match: 'all', rules };
}

/** Deriva columnas legacy a guardar junto al JSON (reportes / compat). */
export function deriveLegacyFromVisibility(vis: VisibilityConditions): {
  min_points: number | null;
  require_enrolled_course_id: string | null;
} {
  let min_points: number | null = null;
  let require_enrolled_course_id: string | null = null;
  for (const r of vis.rules) {
    if (r.field === 'points_total' && r.op === 'gte') {
      min_points = min_points == null ? r.value : Math.max(min_points, r.value);
    }
    if (r.field === 'enrolled_course' && r.op === 'enrolled') {
      require_enrolled_course_id = r.courseId;
    }
  }
  return { min_points, require_enrolled_course_id };
}

export function parseVisibilityRulesFromForm(formData: FormData, maxRows = 6): VisibilityConditions {
  const match: VisibilityMatchMode = formData.get('vis_match') === 'any' ? 'any' : 'all';
  const rules: VisibilityRule[] = [];

  for (let i = 0; i < maxRows; i++) {
    const fieldRaw = formData.get(`vis_field_${i}`);
    const field = typeof fieldRaw === 'string' ? fieldRaw.trim() : '';
    if (!field) continue;

    if (field === 'points_total') {
      const opRaw = formData.get(`vis_op_${i}`);
      const op = opRaw === 'lte' || opRaw === 'eq' ? opRaw : 'gte';
      const p = formData.get(`vis_points_${i}`);
      const n = typeof p === 'string' && p.trim() ? Number(p.trim()) : NaN;
      if (!Number.isFinite(n) || n < 0) continue;
      rules.push({ field: 'points_total', op, value: Math.min(999999, Math.trunc(n)) });
      continue;
    }
    if (field === 'enrolled_course') {
      const c = formData.get(`vis_course_${i}`);
      if (typeof c !== 'string' || !c.trim()) continue;
      rules.push({ field: 'enrolled_course', op: 'enrolled', courseId: c.trim() });
      continue;
    }
    if (field === 'cohort_mode') {
      const h = formData.get(`vis_cohort_${i}`);
      const v = h === 'on_demand' ? 'on_demand' : h === 'live' ? 'live' : null;
      if (!v) continue;
      rules.push({ field: 'cohort_mode', op: 'eq', value: v });
    }
  }

  return { match, rules: rules.slice(0, 20) };
}

export type VisibilityEvalContext = {
  userTotalPoints: number;
  enrolledCourseIds: Set<string>;
  hasLiveEnrollment: boolean;
};

function evaluateOneRule(rule: VisibilityRule, ctx: VisibilityEvalContext): boolean {
  switch (rule.field) {
    case 'points_total':
      if (rule.op === 'gte') return ctx.userTotalPoints >= rule.value;
      if (rule.op === 'lte') return ctx.userTotalPoints <= rule.value;
      return ctx.userTotalPoints === rule.value;
    case 'enrolled_course':
      return ctx.enrolledCourseIds.has(rule.courseId);
    case 'cohort_mode':
      return rule.value === 'live' ? ctx.hasLiveEnrollment : !ctx.hasLiveEnrollment;
    default:
      return true;
  }
}

export function evaluateVisibilityConditions(vis: VisibilityConditions, ctx: VisibilityEvalContext): boolean {
  if (vis.rules.length === 0) return true;
  const results = vis.rules.map((r) => evaluateOneRule(r, ctx));
  return vis.match === 'all' ? results.every(Boolean) : results.some(Boolean);
}

export function formatVisibilitySummary(
  vis: VisibilityConditions,
  courseTitleById: Map<string, string>,
): string {
  if (vis.rules.length === 0) return '';
  const parts = vis.rules.map((r) => {
    if (r.field === 'points_total') {
      const sym = r.op === 'gte' ? '≥' : r.op === 'lte' ? '≤' : '=';
      return `Puntos ${sym} ${r.value}`;
    }
    if (r.field === 'enrolled_course') {
      const t = courseTitleById.get(r.courseId) ?? 'curso';
      return `Inscrito: ${t}`;
    }
    return r.value === 'live' ? 'Cohort en vivo' : 'Solo on-demand';
  });
  const joiner = vis.match === 'all' ? ' · y · ' : ' · o · ';
  return parts.join(joiner);
}

export function getVisibilityConditionsForForm(initial: AnnouncementRecord | null): VisibilityConditions {
  if (!initial) return { ...EMPTY_VISIBILITY };
  return initial.visibility_conditions;
}

/** Fila normalizada para mostrar en dashboard (body_items y buttons ya parseados). */
export type AnnouncementRecord = {
  id: string;
  is_active: boolean;
  sort_order: number;
  badge_text: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  content_mode: 'text' | 'bullets';
  body_section_label: string | null;
  body_text: string | null;
  body_items: AnnouncementBodyItem[];
  buttons: AnnouncementButton[];
  audience: 'all' | 'course';
  course_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  min_points: number | null;
  require_enrolled_course_id: string | null;
  visibility_conditions: VisibilityConditions;
};

const ALLOWED_ICON = new Set(ANNOUNCEMENT_BULLET_ICONS.map((o) => o.value));

export function isAllowedBulletIcon(icon: string): boolean {
  return ALLOWED_ICON.has(icon);
}

export function parseBodyItemsFromForm(formData: FormData, max = 12): AnnouncementBodyItem[] {
  const out: AnnouncementBodyItem[] = [];
  for (let i = 0; i < max; i++) {
    const iconRaw = formData.get(`bullet_icon_${i}`);
    const textRaw = formData.get(`bullet_text_${i}`);
    const icon = typeof iconRaw === 'string' ? iconRaw.trim() : '';
    const text = typeof textRaw === 'string' ? textRaw.trim().slice(0, 800) : '';
    if (!text) continue;
    const safeIcon = isAllowedBulletIcon(icon) ? icon : 'bi-check-lg';
    out.push({ icon: safeIcon, text });
  }
  return out;
}

function parseVariant(raw: FormDataEntryValue | null): 'primary' | 'outline' {
  return raw === 'outline' ? 'outline' : 'primary';
}

export function parseButtonsFromForm(formData: FormData, max = 1): AnnouncementButton[] {
  const out: AnnouncementButton[] = [];
  for (let i = 0; i < max; i++) {
    const labelRaw = formData.get(`btn_label_${i}`);
    const label = typeof labelRaw === 'string' ? labelRaw.trim().slice(0, 80) : '';
    if (!label) continue;
    const kind = formData.get(`btn_kind_${i}`);
    const variant = parseVariant(formData.get(`btn_variant_${i}`));
    if (kind === 'copy') {
      const url = sanitizeHttpUrl(formData.get(`btn_url_${i}`));
      if (!url) continue;
      out.push({ type: 'copy', label, url, variant });
      continue;
    }
    const href = sanitizeHttpUrl(formData.get(`btn_url_${i}`));
    if (!href) continue;
    out.push({ type: 'link', label, href, variant });
  }
  return out;
}

export function normalizeBodyItems(raw: unknown): AnnouncementBodyItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AnnouncementBodyItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text.trim().slice(0, 800) : '';
    if (!text) continue;
    const icon = typeof o.icon === 'string' ? o.icon.trim() : '';
    out.push({
      icon: isAllowedBulletIcon(icon) ? icon : 'bi-check-lg',
      text,
    });
  }
  return out;
}

export function normalizeButtons(raw: unknown): AnnouncementButton[] {
  if (!Array.isArray(raw)) return [];
  const out: AnnouncementButton[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim().slice(0, 80) : '';
    if (!label) continue;
    const type = o.type === 'copy' ? 'copy' : 'link';
    const variant: 'primary' | 'outline' = o.variant === 'outline' ? 'outline' : 'primary';
    if (type === 'copy') {
      const url = typeof o.url === 'string' ? sanitizeHttpUrl(o.url) : null;
      if (!url) continue;
      out.push({ type: 'copy', label, url, variant });
    } else {
      const href = typeof o.href === 'string' ? sanitizeHttpUrl(o.href) : null;
      if (!href) continue;
      out.push({ type: 'link', label, href, variant });
    }
  }
  return out.slice(0, 1);
}

export function hasAnnouncementVisibleContent(input: {
  badge_text: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  body_text: string | null;
  body_items: AnnouncementBodyItem[];
  buttons: AnnouncementButton[];
}): boolean {
  const t = (s: string | null) => (s && s.trim() ? true : false);
  return (
    t(input.badge_text) ||
    t(input.title) ||
    t(input.subtitle) ||
    t(input.image_url) ||
    t(input.body_text) ||
    input.body_items.length > 0 ||
    input.buttons.length > 0
  );
}

export function filterAnnouncementsForViewer(
  rows: AnnouncementRecord[],
  enrolledCourseIds: string[],
  options?: { nowMs?: number; userTotalPoints?: number; hasLiveEnrollment?: boolean },
): AnnouncementRecord[] {
  const nowMs = options?.nowMs ?? Date.now();
  const userTotalPoints = options?.userTotalPoints ?? 0;
  const hasLiveEnrollment = options?.hasLiveEnrollment ?? false;
  const enrolled = new Set(enrolledCourseIds.filter(Boolean));
  const ctx: VisibilityEvalContext = { userTotalPoints, enrolledCourseIds: enrolled, hasLiveEnrollment };

  return rows.filter((r) => {
    if (!r.is_active) return false;
    if (r.starts_at) {
      const t = new Date(r.starts_at).getTime();
      if (Number.isFinite(t) && t > nowMs) return false;
    }
    if (r.ends_at) {
      const t = new Date(r.ends_at).getTime();
      if (Number.isFinite(t) && t < nowMs) return false;
    }

    let audienceOk = false;
    if (r.audience === 'all') audienceOk = true;
    else if (r.audience === 'course' && r.course_id && enrolled.has(r.course_id)) audienceOk = true;
    if (!audienceOk) return false;

    return evaluateVisibilityConditions(r.visibility_conditions, ctx);
  });
}

export async function fetchActiveAnnouncements(
  db: SupabaseClient,
): Promise<AnnouncementRecord[]> {
  const { data, error } = await db
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    if (/relation|does not exist/i.test(String(error.message))) return [];
    console.error('fetchActiveAnnouncements', error);
    return [];
  }

  return (data ?? []).map((row) => {
    const rec = row as Record<string, unknown>;
    const min_points = (() => {
      const v = rec.min_points;
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(999999, Math.max(0, Math.trunc(n))) : null;
    })();
    const require_enrolled_course_id = (rec.require_enrolled_course_id as string | null) ?? null;
    const visibility_conditions = resolveVisibilityConditionsFromRow(rec);

    return {
      id: row.id as string,
      is_active: Boolean(row.is_active),
      sort_order: Number(row.sort_order) || 0,
      badge_text: (row.badge_text as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      subtitle: (row.subtitle as string | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      content_mode: row.content_mode === 'bullets' ? 'bullets' : 'text',
      body_section_label: (row.body_section_label as string | null) ?? null,
      body_text: (row.body_text as string | null) ?? null,
      body_items: normalizeBodyItems(row.body_items),
      buttons: normalizeButtons(row.buttons),
      audience: row.audience === 'course' ? 'course' : 'all',
      course_id: (row.course_id as string | null) ?? null,
      starts_at: (row.starts_at as string | null) ?? null,
      ends_at: (row.ends_at as string | null) ?? null,
      min_points,
      require_enrolled_course_id,
      visibility_conditions,
    };
  });
}
