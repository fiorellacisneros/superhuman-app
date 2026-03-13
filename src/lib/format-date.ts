/**
 * Formatea fechas/horas en la zona horaria del usuario.
 * Usa IANA timezone (ej: America/Lima).
 * Si no hay timezone en perfil, usa Perú y muestra "PE".
 */

const DEFAULT_TZ = 'America/Lima';

/** Asegura que la fecha se interprete como UTC (la DB guarda en UTC). */
function parseAsUTC(iso: string): Date {
  const s = String(iso).trim();
  if (!s) return new Date(NaN);
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  const normalized = (s.includes('T') ? s : s.replace(' ', 'T')) + 'Z';
  return new Date(normalized);
}

export function formatDayAndDate(iso: string, timezone?: string | null): string {
  try {
    const d = parseAsUTC(iso);
    if (Number.isNaN(d.getTime())) return '';
    const tz = timezone && timezone.trim() ? timezone : DEFAULT_TZ;
    const day = d.toLocaleDateString('es', { weekday: 'short', timeZone: tz });
    const date = d.toLocaleDateString('es', { day: 'numeric', timeZone: tz });
    return `${day.charAt(0).toUpperCase() + day.slice(1)} ${date}`;
  } catch {
    return '';
  }
}

export function formatTime(iso: string, timezone?: string | null): string {
  try {
    const d = parseAsUTC(iso);
    if (Number.isNaN(d.getTime())) return '';
    const tz = timezone && timezone.trim() ? timezone : DEFAULT_TZ;
    const timeStr = d.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    });
    const suffix = tz === DEFAULT_TZ ? ' PE' : '';
    return timeStr + suffix;
  } catch {
    return '';
  }
}

export function formatDateTime(iso: string | null, timezone?: string | null): string {
  if (!iso) return '—';
  try {
    const d = parseAsUTC(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const tz = timezone && timezone.trim() ? timezone : DEFAULT_TZ;
    const dateStr = d.toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: tz,
    });
    const timeStr = d.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    });
    const suffix = tz === DEFAULT_TZ ? ' PE' : '';
    return `${dateStr}, ${timeStr}${suffix}`;
  } catch {
    return iso;
  }
}
