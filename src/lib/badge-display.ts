/**
 * Textos en español para las 6 insignias base (condition_type del seed).
 */

const BY_CONDITION: Record<string, { name: string; description: string }> = {
  first_submission: {
    name: 'Primera entrega',
    description: 'Completaste tu primer desafío con entrega aprobada.',
  },
  early_bird: {
    name: 'Madrugador',
    description: 'Fuiste la primera persona en entregar ese desafío.',
  },
  streak_3: {
    name: 'En racha',
    description: 'Tres entregas aprobadas en retos distintos.',
  },
  module_complete: {
    name: 'Módulo completo',
    description: 'Completaste todas las lecciones del módulo.',
  },
  course_complete: {
    name: 'Curso completo',
    description: 'Terminaste todo el curso.',
  },
};

const PUNTUAL = { name: 'Puntual', description: 'Entregaste antes del plazo.' };

const BY_DB_NAME: Record<string, { name: string; description: string }> = {
  'early bird': BY_CONDITION.early_bird,
  'on a roll': BY_CONDITION.streak_3,
  'on time': PUNTUAL,
  puntual: PUNTUAL,
  'first submission': BY_CONDITION.first_submission,
  'submitted first challenge': BY_CONDITION.first_submission,
  'submitted before deadline': PUNTUAL,
  'first student to submit a challenge': BY_CONDITION.early_bird,
  'completed all lessons in a module': BY_CONDITION.module_complete,
  'finished entire course': BY_CONDITION.course_complete,
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function badgeDisplayName(conditionType: string | null | undefined, dbName: string | null | undefined): string {
  const ct = conditionType ?? '';
  if (ct && BY_CONDITION[ct]) return BY_CONDITION[ct].name;
  const n = dbName?.trim();
  if (n && BY_DB_NAME[norm(n)]) return BY_DB_NAME[norm(n)].name;
  return n || 'Insignia';
}

export function badgeDisplayDescription(
  conditionType: string | null | undefined,
  dbDescription: string | null | undefined,
  dbName?: string | null,
): string {
  const ct = conditionType ?? '';
  if (ct && BY_CONDITION[ct]) return BY_CONDITION[ct].description;
  const desc = dbDescription?.trim();
  if (desc && BY_DB_NAME[norm(desc)]) return BY_DB_NAME[norm(desc)].description;
  const n = dbName?.trim();
  if (n && BY_DB_NAME[norm(n)]) return BY_DB_NAME[norm(n)].description;
  if (desc) return desc;
  return badgeDisplayName(conditionType, dbName);
}
