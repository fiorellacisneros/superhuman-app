/**
 * Default badges to seed the badges table.
 * Use with docs/badges-seed.sql or programmatic seed.
 */

export const BADGES_SEED = [
  { name: 'Primera entrega', description: 'Completaste tu primer desafío con entrega aprobada.', condition_type: 'first_submission' },
  { name: 'En racha', description: 'Tres entregas aprobadas en retos distintos.', condition_type: 'streak_3' },
  { name: 'Madrugador', description: 'Fuiste la primera persona en entregar ese desafío.', condition_type: 'early_bird' },
  { name: 'Módulo completo', description: 'Completaste todas las lecciones del módulo.', condition_type: 'module_complete' },
  { name: 'Puntual', description: 'Entregaste antes del plazo.', condition_type: 'manual' },
  { name: 'Curso completo', description: 'Terminaste todo el curso.', condition_type: 'course_complete' },
] as const;
