# Risk Radar — Show risk reasons in drill-down dialog

Replace the generic "Yüksek Risk" / "Orta Risk" subtitle under each athlete name in the Risk Radar drill-down dialog with the concrete reason (e.g. "3 Antrenman Kaçırdı • 5 Gün Beslenme Kaydı Yok").

## Changes

### `src/hooks/useDashboardData.ts`
- Add optional `risk_reason: string | null` to `DashboardAthlete`.
- In the per-athlete loop, build the same `issues` string already produced for `CriticalAthlete.issue` and attach it to the athlete object (null for low-risk).
  - High: `${missed} Antrenman Kaçırdı`, `${nutGap} Gün Beslenme Kaydı Yok` (thresholds ≥3 / ≥5).
  - Medium: same fields at ≥2 / ≥3 thresholds.
  - Low: `null`.

### `src/components/dashboard/RiskRadar.tsx` (RiskDialog)
- In each athlete row inside the dialog, replace the static `{config.label}` line under the name with `athlete.risk_reason ?? config.label`. Low-risk dialog keeps the friendly "Düşük Risk" copy since there's nothing to flag.

No other files touched; gauge counts, critical-alerts panel, and tooltip logic are unchanged.
