## AI Status Logging Core + Goal Badge + Prompt Enrichment

### 1. Database migration — `athlete_ai_status_logs`
Single migration with the 4-step pattern (CREATE → GRANT → ENABLE RLS → POLICY):

```sql
CREATE TABLE IF NOT EXISTS public.athlete_ai_status_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'holistic_forecast',
  analysis_text TEXT NOT NULL,
  student_goal_snapshot TEXT,
  context_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_status_logs_athlete ON public.athlete_ai_status_logs(athlete_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_ai_status_logs TO authenticated;
GRANT ALL ON public.athlete_ai_status_logs TO service_role;

ALTER TABLE public.athlete_ai_status_logs ENABLE ROW LEVEL SECURITY;

-- Owning coach OR an active sub-coach of that head coach
CREATE POLICY "Coach team can view AI logs"
  ON public.athlete_ai_status_logs FOR SELECT TO authenticated
  USING (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Coach team can insert AI logs"
  ON public.athlete_ai_status_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Coach team can delete AI logs"
  ON public.athlete_ai_status_logs FOR DELETE TO authenticated
  USING (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));
```

(Agency IP rule: inserts from sub-coaches still bind to the head-coach `coach_id` — the client sends `coach_id = get_my_head_coach_id()` returned from the existing RPC / activeCoachId context. Service role does it from the edge function.)

### 2. Edge function `timeline-forecast` — enrich + persist
- Also fetch `profiles.fitness_goal` and `profiles.coach_id` for the athlete.
- Prepend the mandated directive line to `systemPrompt`:
  `🎯 SPORCUNUN ANA HEDEFİ: Bu sporcunun platformdaki birincil fitness/sağlık hedefi <goal or "Belirtilmemiş"> olarak belirlenmiştir. Yapacağın tüm gelişim tahminlerini, makro kalori uyum analizlerini, dikey tape ölçüm varyasyonlarını ve 4 haftalık hipertrofi projeksiyonlarını kesinlikle bu hedef doğrultusunda ağırlıklandırarak hesapla.`
- After successful AI response, insert into `athlete_ai_status_logs` via service-role client:
  `{ athlete_id, coach_id: profiles.coach_id, analysis_type: 'holistic_forecast', analysis_text: markdown, student_goal_snapshot: fitness_goal, context_snapshot: ctx }`.
- Return `{ markdown, goal, logId }` so the UI can refresh.

### 3. `TimelineAI.tsx` — new "AI Durum Analizi" button + history dialog
- Add a sibling button next to "AI Holistik Tahmin Üret":
  `<Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>` with `History` icon, label "AI Durum Analizi".
- New state: `historyOpen`, `logs`, `logsLoading`, `expandedId`.
- On dialog open, query:
  ```ts
  supabase.from('athlete_ai_status_logs')
    .select('id, analysis_type, analysis_text, student_goal_snapshot, created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });
  ```
- Render shadcn `<Dialog>` with `bg-background/95 backdrop-blur-xl border border-white/10 max-w-3xl`:
  - Header: "AI Durum Analizi Geçmişi" + count.
  - Empty state: "Henüz kayıtlı AI analizi yok."
  - Each row: collapsible card showing `dd.MM.yyyy HH:mm` (Intl), goal snapshot badge (emerald), and click-to-expand preview of `analysis_text` (truncated to 220 chars when collapsed, full whitespace-pre-wrap when expanded).
- After `runForecast` resolves, also re-fetch logs so the dialog stays in sync next time it opens.

### 4. `AthleteDetail.tsx` — goal badge in identity card
- Extend `AthleteProfile` interface with `fitness_goal: string | null` and read it from the profile row.
- Add a human-readable mapper:
  ```ts
  const GOAL_LABELS: Record<string,string> = {
    hypertrophy: 'Hipertrofi / Kas Kazanımı',
    fat_loss: 'Yağ Yakımı & Definasyon',
    strength: 'Maksimal Kuvvet',
    endurance: 'Dayanıklılık',
    recomp: 'Rekomp / Eşzamanlı Dönüşüm',
    health: 'Sağlık & Yaşam Kalitesi',
  };
  const goalLabel = athlete.fitness_goal ? (GOAL_LABELS[athlete.fitness_goal] ?? athlete.fitness_goal) : null;
  ```
- Inside the identity block (right after the weight/streak row, before the email row), render when `goalLabel`:
  ```tsx
  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-lg select-none flex-shrink-0 whitespace-nowrap mt-1.5">
    🎯 Hedef: {goalLabel}
  </span>
  ```

### Out of scope
- No other components touched.
- `useAthletes`, exports, and the AI Doctor flow stay as-is.
- `fitness_goal` writes are already handled by `update_own_profile` RPC — no schema change needed.

### Implementation order
1. Run migration (await user approval).
2. Update `supabase/functions/timeline-forecast/index.ts`.
3. Refactor `src/components/athlete-detail/TimelineAI.tsx`.
4. Patch `src/pages/AthleteDetail.tsx`.
