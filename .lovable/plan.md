# Risk Radar Drill-Down Sync Fix

## Problem
`useDashboardData` computes `riskDistribution` from behavioral signals (missed workouts ≥3, nutrition gap ≥5d), but `RiskRadar.tsx` re-classifies the drill-down dialog list with `classifyRisk(readiness_score)`. Counts and list rows diverge.

## Changes

**`src/hooks/useDashboardData.ts`**
- Extend `DashboardAthlete` with `calculated_risk_level: "Low" | "Medium" | "High"`.
- In the athlete loop, derive each level from the same `isHighRisk` / `isMediumRisk` predicates that drive `dist`, attach to the athlete object before pushing.
- Use a fresh array so type strictness is preserved (avoid mutating raw query rows).

**`src/components/dashboard/RiskRadar.tsx`**
- Delete `classifyRisk` and the readiness-based filter.
- In `RiskDialog`, filter via `a.calculated_risk_level === riskLevel`.
- Replace the misleading `Hazırlık: {readiness_score}` row with the actual risk badge (Low/Medium/High) so the dialog reflects the behavioral classification.
- Update subtitle copy: "Sporcu hazırlık skoru dağılımı" → "Davranışsal risk dağılımı" for consistency.

No backend, no other consumer changes (verified no other file imports `DashboardAthlete` beyond `RiskRadar`).
