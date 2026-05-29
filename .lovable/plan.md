## Coaching Packages Schema Enrichment (Part 1/4)

Add rich-media marketing columns to `public.coaching_packages` to support a high-ticket storefront.

### Migration

```sql
ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS rich_description TEXT;
ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.coaching_packages ADD COLUMN IF NOT EXISTS features_list TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_coaching_packages_rich_media
  ON public.coaching_packages (id) WHERE rich_description IS NOT NULL;
```

### Notes
- All columns nullable / defaulted → existing rows remain valid (NULL text, empty arrays).
- No RLS/GRANT changes needed (additive to an existing table).
- No frontend code changes in this part; UI wiring comes in later parts of the 4-part sweep.

Approve to run the migration.