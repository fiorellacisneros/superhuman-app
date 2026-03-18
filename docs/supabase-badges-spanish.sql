-- Solo descripciones en español (nombres en inglés en la app).
UPDATE badges SET description = 'Completaste tu primer desafío con entrega aprobada.' WHERE condition_type = 'first_submission';
UPDATE badges SET description = 'Tres entregas aprobadas en retos distintos.' WHERE condition_type = 'streak_3';
UPDATE badges SET description = 'Fuiste la primera persona en entregar ese desafío.' WHERE condition_type = 'early_bird';
UPDATE badges SET description = 'Completaste todas las lecciones del módulo.' WHERE condition_type = 'module_complete';
UPDATE badges SET description = 'Terminaste todo el curso.' WHERE condition_type = 'course_complete';
