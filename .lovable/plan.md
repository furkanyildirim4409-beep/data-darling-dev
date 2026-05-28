## EnergyBank Refactor — 6 Biometric Pillars + Shadcn Tooltips

### Scope
Single file: `src/components/athlete-detail/EnergyBank.tsx`. No backend / schema changes.

### Data mapping
`daily_checkins` currently exposes: `mood`, `sleep_hours`, `soreness`, `stress`, `digestion`. There is no dedicated "sleep quality" or "energy level" raw column, so we derive them:

| Pillar | Source | Display |
|---|---|---|
| Ruh Hali | `mood` | `n/5` |
| Uyku Kalitesi | `min(sleep_hours/8,1) * 5` rounded | `n/5` |
| Enerji Seviyesi | `computeEnergy(checkin)` | `%n` |
| Kas Ağrısı | `soreness` | `n/5` (düşük iyi) |
| Stres | `stress` | `n/5` (düşük iyi) |
| Uyku Süresi | `sleep_hours` | `n sa` |

(`digestion` is dropped from the UI per the spec's 6-pillar list; it stays in `computeEnergy` so the aggregate score is unchanged.)

### Step A — Pillar config array
Introduce a `PILLARS` array of `{ key, label, icon, tooltip, accentClass, getValue(c), formatValue(v) }` using Lucide `Smile`, `Moon`, `Zap`, `Flame`, `Brain`, `Clock`. Tooltip strings exactly as specified in the brief.

### Step B — Shadcn Tooltip wrapping
- Import `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`.
- Wrap the whole dialog badge region in a single `<TooltipProvider delayDuration={120}>`.
- Each badge becomes:
  ```tsx
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="...badge..."><Icon/> {formatted}</span>
    </TooltipTrigger>
    <TooltipContent className="bg-popover/95 backdrop-blur-md border border-white/10 p-2.5 max-w-[280px] rounded-xl text-xs font-medium text-foreground shadow-2xl tracking-wide select-none animate-in fade-in zoom-in-95 duration-150">
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="text-muted-foreground">{tooltip}</p>
    </TooltipContent>
  </Tooltip>
  ```
- Remove the legacy native `title=""` attributes (replaced by tooltips).

### Step C — Historical dialog grid
Inside the `history.map(...)` row, replace the current 6-chip flex with a 6-column responsive grid (`grid grid-cols-3 sm:grid-cols-6 gap-1.5`) that always renders all six pillars side-by-side, never truncating. Each cell uses the same Tooltip wrapper from Step B so hovering any historical entry reveals the same definitions.

### Out of scope
- Outer card layout (3-dot vs title overlap) — already addressed in the prior pass.
- `computeEnergy` formula, decay logic, realtime subscriptions, dropdown menu — untouched.
- No new dependencies.
