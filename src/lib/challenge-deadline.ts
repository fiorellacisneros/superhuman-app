/**
 * Los retos guardan la fecha límite como instante UTC en BD.
 * El admin introduce fecha/hora en horario de Perú (Lima); al guardar se convierte a UTC.
 * Perú no usa horario de verano: UTC−5 fijo (America/Lima).
 */
import { DEFAULT_TIMEZONE } from './timezones';

export const CHALLENGE_ADMIN_TIMEZONE = DEFAULT_TIMEZONE;

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
/** Lima = UTC−5 (sin DST). */
const LIMA_OFFSET_MS = 5 * MS_HOUR;

/**
 * Convierte lo que envía flatpickr (`Y-m-d H:i`) en ISO UTC para timestamptz.
 * Si el valor ya trae Z u offset, se respeta como instante absoluto.
 */
export function parseAdminDateTimeLocalToIsoUtc(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim();
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s.replace(/\s/g, ''))) {
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const normalized = s.replace(' ', 'T');
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const sec = Number(m[6] ?? 0);
  const utcMs = Date.UTC(y, mo - 1, d, h, mi, sec) + LIMA_OFFSET_MS;
  const out = new Date(utcMs);
  return Number.isNaN(out.getTime()) ? null : out.toISOString();
}

/** Valor inicial del datepicker al editar (hora según Lima). */
export function utcIsoToAdminLocalFlatpickr(iso: string | null | undefined): string {
  if (iso == null || !String(iso).trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = d.toLocaleDateString('sv-SE', { timeZone: CHALLENGE_ADMIN_TIMEZONE });
  const timePart = d.toLocaleTimeString('sv-SE', {
    timeZone: CHALLENGE_ADMIN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const hm = timePart.length >= 5 ? timePart.slice(0, 5) : timePart;
  return `${datePart} ${hm}`;
}

/** Etiqueta breve según cuánto falta hasta el instante del deadline (misma lógica para todos los países). */
export function formatDeadlineRelativeLabel(iso: string | null | undefined, nowMs: number): string {
  if (iso == null || !String(iso).trim()) return '';
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return '';
  const diffMs = end - nowMs;
  if (diffMs <= 0) return 'Vencido';
  const hoursLeft = Math.ceil(diffMs / MS_HOUR);
  if (hoursLeft <= 24) {
    if (hoursLeft <= 1) return 'Menos de 1 h';
    return `${hoursLeft} h restantes`;
  }
  const daysLeft = Math.ceil(diffMs / MS_DAY);
  if (daysLeft === 1) return '1 día restante';
  return `${daysLeft} días restantes`;
}
