ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS rich_description TEXT;
ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS features_list TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_coaching_packages_rich_media
  ON public.coaching_packages (id) WHERE rich_description IS NOT NULL;