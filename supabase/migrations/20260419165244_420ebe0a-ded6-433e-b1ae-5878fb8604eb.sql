UPDATE public.coach_stories
SET expires_at = created_at + interval '24 hours'
WHERE expires_at > created_at + interval '30 days';