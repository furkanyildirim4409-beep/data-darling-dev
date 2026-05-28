# Supplement Card Unification + Daily-Average Macros

> Note: the supplement & nutrition cards actually live in `src/components/athlete-detail/ActiveBlocks.tsx`, not `ProgramTab.tsx`. Work happens there.

## 1. Daily-average diet macros

In `ActiveBlocks.tsx` around lines 270–308, the diet macro totals reduce across every `diet_template_foods` row, so a 7-day plan shows cumulative weekly values instead of a daily average.

Fix:
- Extend the food select to include `day_number`: `select("template_id, day_number, calories, protein, carbs, fat")`.
- For each template, compute `activeDaysCount = new Set(tf.map(f => f.day_number).filter(n => n != null)).size || 1`.
- Replace each `totalX` with `Math.round(totalX / activeDaysCount)` to yield daily averages.
- Keep the `isPrimary` override behavior, but make the fallback use the averaged value (when `nutrition_targets.daily_calories` / `protein_g` / `carbs_g` / `fat_g` are null). Guard every division so `activeDaysCount` is never zero.

The labels at lines 605–607 already render in the format `{cal} kcal · {p}g P · {c}g K · {f}g Y`, so once the source is averaged they automatically show daily values. No string changes needed.

## 2. Supplement card visual + behavior parity

Restructure the supplement section (lines 626–710) to mirror Training/Diet:

- Outer row uses `rounded-lg p-3 hover:bg-secondary/40 transition-colors cursor-pointer` and is clickable.
- Left cluster: `w-8 h-8 rounded-md bg-purple-500/15` square with `<Pill>` icon, then `text-sm font-semibold` title (`name_and_dosage`) and `text-[11px] text-muted-foreground` subtitle (`{timing} · {dosage}` when present).
- Right cluster: timing badge + `servings_left/total_servings` badge + a `DropdownMenu` (3-dot `MoreVertical`) with items:
  - `Power / PowerOff` toggle (Aktif/Pasif),
  - `Trash2` Kaldır (gated by `canDeleteAthletes`).
  - Each item calls `e.stopPropagation()`.
- Below row: `Progress` bar (purple) showing `servings_left / total_servings` with `%` mono text — same layout as the training progress row.

Click on the row opens a new `<Sheet side="right" className="w-full sm:max-w-md">` (`supplementSheet` state holding the `SupplementData`). Sheet content shows:
- Header: emoji icon + name, close button (`SheetClose`).
- Detail grid: Timing badge, Dosage, Servings per use, Servings left / total, Last taken date (`last_taken_date` formatted tr-TR), Today's intake (`servings_taken_today`).
- Progress bar.

Empty state stays as-is.

## 3. Type updates

Extend `SupplementData` with the optional fields needed in the Sheet: `dosage: string | null`, `servings_per_use: number | null`, `servings_taken_today: number | null`, `last_taken_date: string | null`. Update the `assigned_supplements` select to include them.

## Out of scope
- No DB migrations.
- No changes to AssignSupplementDialog / Diet assignment logic.
- No edits to ProgramTab.tsx (the supplement UI doesn't live there).
