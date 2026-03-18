/**
 * Nombres: siempre los de la BD (marca en inglés: On a Roll, Early bird, etc.).
 * Descripción: la de la BD; si falta, texto en español por condition_type.
 */

const DESC_FALLBACK_ES: Record<string, string> = {
  first_submission: 'Completaste tu primer desafío con entrega aprobada.',
  early_bird: 'Fuiste la primera persona en entregar ese desafío.',
  streak_3: 'Tres entregas aprobadas en retos distintos.',
  module_complete: 'Completaste todas las lecciones del módulo.',
  course_complete: 'Terminaste todo el curso.',
  manual: 'Entregaste antes del plazo.',
  on_time: 'Entregaste antes del plazo.',
  night_owl: 'Entregaste de madrugada.',
  first_attendance: 'Tu primera asistencia a una clase en vivo.',
  attendance_streak_3: 'Asististe a tres clases seguidas.',
};

export function badgeDisplayName(_conditionType: string | null | undefined, dbName: string | null | undefined): string {
  return dbName?.trim() || 'Insignia';
}

export function badgeDisplayDescription(
  conditionType: string | null | undefined,
  dbDescription: string | null | undefined,
  dbName?: string | null,
): string {
  const d = dbDescription?.trim();
  if (d) return d;
  const ct = conditionType ?? '';
  if (ct && DESC_FALLBACK_ES[ct]) return DESC_FALLBACK_ES[ct];
  return badgeDisplayName(conditionType, dbName ?? null);
}
