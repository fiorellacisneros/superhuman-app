import { ON_DEMAND_BADGE_CONDITION_TYPES, type BadgeConditionType } from './badges';

export type BadgeEarnRow = {
  conditionType: string;
  title: string;
  body: string;
};

/**
 * Texto fijo para la guía "cómo ganar insignias". Alineado con la lógica en
 * `checkBadgesAfterApproval`, `checkBadgesAfterAttendance` y reglas de negocio (on-demand vs en vivo).
 */
const ROWS: BadgeEarnRow[] = [
  {
    conditionType: 'first_submission',
    title: 'Primera entrega',
    body: 'Cuando tu primera entrega de un desafío sea aprobada por el equipo.',
  },
  {
    conditionType: 'early_bird',
    title: 'Madrugador / Early bird',
    body: 'Cuando tu entrega aprobada sea la primera de ese desafío en todo el cohort.',
  },
  {
    conditionType: 'streak_3',
    title: 'En racha',
    body: 'Cuando tengas al menos tres entregas aprobadas en tres retos distintos.',
  },
  {
    conditionType: 'module_complete',
    title: 'Módulo completo',
    body: 'Al completar todas las lecciones del módulo según marque el curso.',
  },
  {
    conditionType: 'course_complete',
    title: 'Curso completo',
    body: 'Al completar todos los requisitos del curso.',
  },
  {
    conditionType: 'first_attendance',
    title: 'Primera asistencia',
    body: 'La primera vez que confirmas asistencia a una clase en vivo.',
  },
  {
    conditionType: 'attendance_streak_3',
    title: 'Racha de asistencia',
    body: 'Al acumular al menos tres asistencias confirmadas en clases en vivo (según reglas del curso).',
  },
  {
    conditionType: 'manual',
    title: 'Manual',
    body: 'Otorgada por el equipo en casos especiales.',
  },
];

const ON_DEMAND_SET = new Set<string>(ON_DEMAND_BADGE_CONDITION_TYPES);

/** Filas de guía según si el alumno tiene al menos un curso en vivo u solo on-demand. */
export function getBadgeEarnGuideRows(hasLiveEnrollment: boolean): BadgeEarnRow[] {
  if (hasLiveEnrollment) {
    return ROWS;
  }
  return ROWS.filter((r) => ON_DEMAND_SET.has(r.conditionType as BadgeConditionType));
}
