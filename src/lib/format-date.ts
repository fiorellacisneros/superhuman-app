/**
 * Formatea fechas/horas en la zona horaria del usuario.
 * Usa IANA timezone (ej: America/Lima).
 */

const DEFAULT_TZ = 'America/Lima';

export function formatDayAndDate(iso: string, timezone?: string | null): string {
  try {
    const d = new Date(iso);
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
    const d = new Date(iso);
    const tz = timezone && timezone.trim() ? timezone : DEFAULT_TZ;
    return d.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    });
  } catch {
    return '';
  }
}

export function formatDateTime(iso: string | null, timezone?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const tz = timezone && timezone.trim() ? timezone : DEFAULT_TZ;
    return d.toLocaleString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    });
  } catch {
    return iso;
  }
}
