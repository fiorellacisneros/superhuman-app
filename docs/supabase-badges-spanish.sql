-- Opcional: textos en español solo para las 6 insignias base (mismo seed).
UPDATE badges SET name = 'Primera entrega', description = 'Completaste tu primer desafío con entrega aprobada.' WHERE condition_type = 'first_submission';
UPDATE badges SET name = 'En racha', description = 'Tres entregas aprobadas en retos distintos.' WHERE condition_type = 'streak_3';
UPDATE badges SET name = 'Madrugador', description = 'Fuiste la primera persona en entregar ese desafío.' WHERE condition_type = 'early_bird';
UPDATE badges SET name = 'Módulo completo', description = 'Completaste todas las lecciones del módulo.' WHERE condition_type = 'module_complete';
UPDATE badges SET name = 'Curso completo', description = 'Terminaste todo el curso.' WHERE condition_type = 'course_complete';
UPDATE badges SET name = 'Puntual', description = 'Entregaste antes del plazo.' WHERE condition_type = 'manual';
