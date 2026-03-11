-- Subir presentación, grabación y código de acceso - Relume Deep Dive
-- Ejecuta en Supabase: Dashboard → SQL Editor → New query → pega y Run.

UPDATE lessons SET
  ppt_url = 'https://drive.google.com/file/d/1h6qMgnjECglLZBGgkHIoVF0d0gOmWV0N/view?usp=drive_link',
  recording_url = 'https://us06web.zoom.us/rec/share/caiqpXSbYA6_R0ngdBEn04yJ9kLOLBJNcqorK3IexH28xTEV0cs_NRnhMTs5xjF_.mK-ovfqUg5CMtAHy',
  recording_passcode = 'Rt*2^wkU'
FROM courses c
WHERE lessons.course_id = c.id
  AND c.slug = 'webflow-camp-cohort-1'
  AND lessons.title = 'Relume Deep Dive';
