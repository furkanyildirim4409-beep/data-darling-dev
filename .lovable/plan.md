# 27 May Pass — Timeline Decimals, AI Forecast, Bloodwork Sanitize

## 1. TimelineAI — kill floating-point decimal leaks

`src/components/athlete-detail/TimelineAI.tsx`

- Add a helper `const fmt = (n: number, d = 1) => Number.isFinite(n) ? Number(n).toFixed(d) : "—";`
- In `renderStatChange`: render `{fmt(projected, label === "Kas Kütlesi" ? 1 : 0)}{unit}` for the projected value and the strike-through `{fmt(currentVal, 1)}{unit}` so values never blow past one decimal.
- Round delta with `fmt(change, 1)` instead of `Number((projected - currentVal).toFixed(1))` raw output.
- Round all `projections` numeric outputs at build time (Math.round / toFixed(1)) so the slider math can't emit `14.8999…`.
- "Başlangıçtan Bu Yana" block: format with the same `fmt` helper for `(startStats.bodyFat - currentStats.bodyFat)`, the kg delta, and the `%` progress.
- Add `truncate`/`tabular-nums` typography classes to the metric value spans so long numbers can't break card borders.

## 2. AI weekly forecast — new edge function + TimelineAI hook

Create `supabase/functions/timeline-forecast/index.ts` (Lovable AI Gateway, `google/gemini-3-flash-preview`, non-streaming JSON):

- Accept `{ athleteId }`. Use the caller's JWT (verify_jwt=true) and query Supabase with service role.
- Aggregate the last 4 weeks of:
  - `body_measurements` (weight / body_fat / muscle_mass progression)
  - `workout_logs` (tonnage, duration → progressive overload velocity)
  - `nutrition_logs` vs `nutrition_targets` (macro/calorie compliance 0–100)
  - `daily_checkins` (consistency + readiness)
  - `athlete_supplements` (adherence ratio)
- System prompt instructs Gemini to act as a sports-science forecasting engine and respond in Turkish markdown, **must** include a section exactly titled `### 🔮 Gelecek Dönem Gelişim & Hipertrofi Tahmini` with a 4-week forward projection across: kilo, yağ %, kas kütlesi, tonaj, beslenme uyumu, disiplin. Return `{ markdown }`.
- Handle 429 / 402 with explicit error payloads.
- Register in `supabase/config.toml`.

Wire into `TimelineAI.tsx`:
- Add a "AI Tahmini" button under the projected stats grid. On click → `supabase.functions.invoke("timeline-forecast", { body: { athleteId } })`, render returned markdown in a styled dark-glass panel (reuse `react-markdown` if already in deps; otherwise simple line-split).
- Show loading skeleton + toast on 429/402.

## 3. Sanitize BloodworkPanel — no phantom T/C rows

`src/components/athlete-detail/BloodworkPanel.tsx`

- Remove the hardcoded Testosteron + Kortizol quick-stat cards and the T:C ratio block.
- Replace with a dynamic loop:
  ```ts
  const latestBio = Array.isArray(latest.extracted_data) ? latest.extracted_data : [];
  const available = latestBio.filter(b => b && b.value !== null && b.value !== undefined);
  ```
  Render up to the first 4 available biomarkers as quick-stat tiles with status-driven colors (`optimal` → success, `warning` → warning, `low|high` → destructive).
- T:C ratio: only render if **both** keywords resolve to numbers in the current row (already conditional, keep but only inside the dynamic section).
- Chart: build `chartData` from the union of biomarker names that actually appear in ≥ 2 tests; render one `<Line>` per such marker (cap at 4 to avoid clutter). If no marker has ≥ 2 timepoints, hide the chart entirely instead of an empty axis.
- Tooltip rewritten to iterate payload entries instead of hardcoded T/C labels.
- Sub-title becomes the dynamic biomarker count, not "Testosteron / Kortizol Oranı".

`src/components/athlete-detail/BloodworkDialog.tsx` already iterates `biomarkers` dynamically — verify nothing renders for empty rows (it does: `biomarkers.length === 0` branch already shows the empty state). No structural change needed beyond filtering out entries where `value == null`:
- In the biomarker grid `.map`, prepend `.filter(b => b && b.value !== null && b.value !== undefined)`.
- Same filter inside `HormonalComparisonChart` so phantom rows can't sneak into the bar chart.

## Technical notes

- No new dependencies. Reuse existing `lucide-react`, `recharts`, `sonner`.
- Edge function uses `Deno.env.get("LOVABLE_API_KEY")` (already in secrets) and `SUPABASE_SERVICE_ROLE_KEY` for the data aggregation queries.
- All numeric outputs in TimelineAI pass through the `fmt` helper — no raw `toFixed` chains, no `Number(x.toFixed(1))` round-trips that re-introduce float noise.
- Files touched: edit 3 (`TimelineAI.tsx`, `BloodworkPanel.tsx`, `BloodworkDialog.tsx`), edit 1 (`config.toml`), create 1 (`timeline-forecast/index.ts`).
