/**
 * Default badges to seed the badges table (sin Puntual).
 */

export const BADGES_SEED = [
  { name: 'First Submission', description: 'Completaste tu primer desafío con entrega aprobada.', condition_type: 'first_submission' },
  { name: 'On a Roll', description: 'Tres entregas aprobadas en retos distintos.', condition_type: 'streak_3' },
  { name: 'Early bird', description: 'Fuiste la primera persona en entregar ese desafío.', condition_type: 'early_bird' },
  { name: 'Builder', description: 'Completaste todas las lecciones del módulo.', condition_type: 'module_complete' },
  { name: 'Superhuman', description: 'Terminaste todo el curso.', condition_type: 'course_complete' },
] as const;
