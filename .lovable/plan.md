# 27 May Pass — Measurements Studio, Radar Calibration, Metabolic Flux

## 1. Remove 3D body model, ship BodyMeasurementsStudio

- Delete `src/components/athlete-detail/BodyModel3D.tsx` and `BodyModel3DViewer.tsx`.
- In `src/pages/AthleteDetail.tsx`: remove the `BodyModel3D` import and replace the `"body-model"` slot entry with `<BodyMeasurementsStudio athleteId={...} />` (keep the same bento key so saved layouts still resolve).
- Create `src/components/athlete-detail/BodyMeasurementsStudio.tsx` — dark glass card matching the existing `EnergyBank` / `SmartContract` styling:
  - Fetch all `body_measurements` rows for the athlete (`user_id = athleteId`) ordered by `logged_at desc`.
  - Top control: shadcn `Select` listing every `logged_at` (formatted Turkish date). Default = newest row. Empty state = friendly "Henüz ölçüm yok" message.
  - Two-column grid (`md:grid-cols-2`):
    - **Left — Progress Photo**: query `progress_photos` for the same `user_id` where `date` is closest to (≤) the selected `logged_at`. Render the image from the `progress-photos` storage bucket via signed URL (bucket is private). Fallback: dark-glass silhouette placeholder (lucide `User` icon on gradient).
    - **Right — Metrics ledger**: list Chest / Waist / Hips / Arm / Thigh / Neck / Shoulder / BodyFat%. Each row shows current value + delta vs. the oldest (day-one) row using a colored chip (green for favorable change in waist/bodyfat down; otherwise neutral arrow).
  - Realtime subscribe to `body_measurements` and `progress_photos` INSERT/UPDATE for that athlete to refetch.

## 2. Fix WellnessRadar low-value distortion

In `src/components/athlete-detail/WellnessRadar.tsx`:
- Add `<PolarRadiusAxis domain={[0, 5]} allowDataOverflow={false} tickCount={6} axisLine={false} tick={false} />` (scale matches existing 1–5 wellness scale; if data already normalised 0–100, use `[0,100]` — verify before edit).
- Ensure the `<Radar>` series still uses the same dataKey so the shape stays bounded and symmetric for low scores.

## 3. Hydrate MetabolicFlux with real data

In `src/components/athlete-detail/MetabolicFlux.tsx`:
- Drop all hardcoded mock arrays.
- Query for the active athlete (last 7 days):
  - `nutrition_logs` rows → sum `total_calories`, `total_protein`, `total_carbs`, `total_fat` per day.
  - `nutrition_targets` for the athlete → `daily_calories`, `protein_g`, `carbs_g`, `fat_g`.
- Render:
  - Today's totals vs. target with delta chips (under/over).
  - 7-day mini trend (reuse the existing chart container) of calories vs. target line.
  - Compliance score = mean(daily_cal / target_cal) clamped 0–100 with the same 85–115% tolerance band used elsewhere (per memory).
- Realtime subscribe on `nutrition_logs` INSERT for the athlete to refetch.

## 4. Delivery

- No new dependencies. Keep Lucide imports complete. All colors via design tokens (no raw hex/`text-white`). Type-safe, no `any` leakage on Supabase results.

## Technical notes

- `progress-photos` bucket is **private** → use `supabase.storage.from('progress-photos').createSignedUrl(path, 3600)`. The `photo_url` column may already be a full URL; handle both (if it starts with `http`, use directly; otherwise treat as storage path).
- Bento layout key `body-model` is preserved so existing `athlete-card-layout-v2-{id}` localStorage entries keep working — only the rendered component swaps.
- Files touched: delete 2, create 1, edit 3 (`AthleteDetail.tsx`, `WellnessRadar.tsx`, `MetabolicFlux.tsx`).
