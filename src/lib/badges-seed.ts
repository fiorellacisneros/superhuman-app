/**
 * Default badges to seed the badges table.
 * Use with docs/badges-seed.sql or programmatic seed.
 */

export const BADGES_SEED = [
  { name: 'Primera entrega', description: 'Submitted first challenge', condition_type: 'first_submission' },
  { name: 'En racha', description: 'Attended 3 lessons in a row', condition_type: 'streak_3' },
  { name: 'Early bird', description: 'First student to submit a challenge', condition_type: 'early_bird' },
  { name: 'Módulo completo', description: 'Completed all lessons in a module', condition_type: 'module_complete' },
  { name: 'Puntual', description: 'Submitted before deadline', condition_type: 'manual' },
  { name: 'Curso completo', description: 'Finished entire course', condition_type: 'course_complete' },
] as const;
