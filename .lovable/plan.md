

## Academy DB Wiring (Epic 4 - Prompt 2/3)

### Overview

Create the `academy_content` Supabase table with RLS policies, then rewire `Akademi.tsx` to use real CRUD operations instead of mock data.

### Changes

| Step | What |
|------|------|
| **Migration** | Create `academy_content` table with RLS policies |
| **Akademi.tsx** | Replace mock data with Supabase fetch/insert/delete + loading skeletons |

### 1. Migration — `academy_content` table

```sql
CREATE TABLE public.academy_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Antrenman',
  type TEXT NOT NULL DEFAULT 'Video',
  url TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_content ENABLE ROW LEVEL SECURITY;

-- Coach owns their content
CREATE POLICY "Coaches manage own academy content"
  ON public.academy_content FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Team members can manage head coach's content
CREATE POLICY "Team members manage academy content"
  ON public.academy_content FOR ALL TO authenticated
  USING (is_active_team_member_of(coach_id))
  WITH CHECK (is_active_team_member_of(coach_id));

-- Athletes can read their coach's content
CREATE POLICY "Athletes can view coach academy content"
  ON public.academy_content FOR SELECT TO authenticated
  USING (is_coach_of(auth.uid()) OR coach_id = (
    SELECT coach_id FROM profiles WHERE id = auth.uid()
  ));
```

Uses existing RLS pattern: coach ownership + team member delegation + athlete read access via `coach_id` linkage.

### 2. `Akademi.tsx` — Supabase wiring

- Import `supabase`, `useAuth` (for `activeCoachId`), `useEffect`, `Skeleton`
- Remove `initialData` array
- Add `isLoading` state, initialize `items` as empty array
- **fetchContent**: `supabase.from('academy_content').select('*').eq('coach_id', activeCoachId).order('created_at', { ascending: false })` — map DB rows to `AcademyItem` (map `created_at` to `createdAt` as timestamp number)
- **handleSubmit**: `supabase.from('academy_content').insert({ coach_id: activeCoachId, title, description, category, type, url, thumbnail, tags: tagsArray })` — on success re-fetch + toast + close dialog
- **handleDelete**: `supabase.from('academy_content').delete().eq('id', id)` — on success re-fetch + toast
- **Loading UI**: Show 3x `<Skeleton className="h-[140px] w-full rounded-xl" />` in the grid while `isLoading`
- **Error handling**: `toast.error` on any Supabase error

