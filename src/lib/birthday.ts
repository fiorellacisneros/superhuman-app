/**
 * Cálculo de “próximo cumpleaños” usando mes/día del perfil (YYYY-MM-DD).
 * Fecha “hoy” en una zona horaria fija de la app (coincide con clases / perfil por defecto).
 */

export const APP_BIRTHDAY_TIMEZONE = 'America/Lima';

export function getTodayYmdInTimezone(timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
  const d = Number(parts.find((p) => p.type === 'day')?.value ?? 0);
  return { y, m, d };
}

/** Días hasta el próximo aniversario de esa fecha (mes/día); 0 = hoy. null = fecha inválida. */
export function daysUntilBirthdayAnniversary(birthdayISO: string | null | undefined, timeZone: string): number | null {
  if (!birthdayISO || typeof birthdayISO !== 'string' || birthdayISO.length < 10) return null;
  const bm = parseInt(birthdayISO.slice(5, 7), 10);
  const bd = parseInt(birthdayISO.slice(8, 10), 10);
  if (Number.isNaN(bm) || Number.isNaN(bd) || bm < 1 || bm > 12 || bd < 1 || bd > 31) return null;

  const today = getTodayYmdInTimezone(timeZone);
  const ty = today.y;
  const thisYearBirthday = new Date(Date.UTC(ty, bm - 1, bd));
  const todayUtc = new Date(Date.UTC(today.y, today.m - 1, today.d));
  let diff = Math.round((thisYearBirthday.getTime() - todayUtc.getTime()) / 86400000);
  if (diff < 0) {
    const nextYearBirthday = new Date(Date.UTC(ty + 1, bm - 1, bd));
    diff = Math.round((nextYearBirthday.getTime() - todayUtc.getTime()) / 86400000);
  }
  return diff;
}
