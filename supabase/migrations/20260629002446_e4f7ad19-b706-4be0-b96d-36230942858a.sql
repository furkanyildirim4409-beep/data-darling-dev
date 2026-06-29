UPDATE public.profiles SET bio = regexp_replace(bio, '<[^>]*>', '', 'g') WHERE bio ~ '<[^>]*>';
ALTER TABLE public.profiles ADD CONSTRAINT bio_no_html CHECK (bio IS NULL OR bio !~ '<[^>]*>');