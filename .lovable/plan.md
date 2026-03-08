

# Plan: Connect Command Center to Real Supabase Data

## Current State
- All dashboard components use hardcoded mock data
- No `athlete_details` table exists in DB; `profiles` has `readiness_score` (integer, default 75)
- No `injury_risk` column in DB — must derive risk level from `readiness_score`
- `assigned_workouts` table has `status` field for compliance tracking
- `daily_checkins` has `mood`, `stress`, `soreness` for wellness signals
- `BusinessPulse` and `ActionStream` have no backing tables — will remain mock

## Risk Classification Strategy (from `readiness_score`)
```text
readiness_score >= 70  → Low Risk
readiness_score 50-69  → Medium Risk
readiness_score < 50   → High Risk
```

## Files to Create/Edit

### 1. New: `src/hooks/useDashboardData.ts`
Custom hook that fetches all dashboard data in parallel:
- **Athletes**: `profiles` where `coach_id = user.id` and `role = 'athlete'`
- **Today's Sessions**: `assigned_workouts` where `scheduled_date = today` and coach's athletes
- **Compliance**: Count completed vs total `assigned_workouts` for last 7 days
- **Check-in rate**: Count `daily_checkins` from last 48h vs total athletes
- **Risk distribution**: Group athletes by `readiness_score` thresholds
- **Critical athletes**: Athletes with `readiness_score < 50`, sorted ascending
- Returns: `{ athletes, riskDistribution, criticalAthletes, stats, compliance, isLoading }`

### 2. Edit: `src/pages/CommandCenter.tsx`
- Import `useDashboardData` and `useAuth`
- Replace hardcoded `quickStats` values with real data
- Pass fetched data as props to `RiskRadar` and `CompliancePulse`
- Show `Skeleton` loaders while `isLoading`

### 3. Edit: `src/components/dashboard/RiskRadar.tsx`
- Remove all mock data imports (`mockAthletes`, `riskDistribution`, `criticalAthletes`, `riskReasons`)
- Accept props: `{ athletes, riskDistribution, criticalAthletes, isLoading }`
- `RiskGauge` receives distribution data via props instead of module-level constants
- `RiskDialog` uses real athlete profiles (id, full_name, readiness_score) instead of mock
- Show skeleton when loading

### 4. Edit: `src/components/dashboard/CompliancePulse.tsx`
- Accept props: `{ workoutCompliance, nutritionCompliance, checkinCompliance, isLoading }`
- Replace hardcoded 92/74/60 with real calculated values
- Show skeleton when loading

### 5. No changes to:
- `StatCard.tsx` — already generic
- `BusinessPulse.tsx` — no revenue table, stays mock
- `ActionStream.tsx` — would need a real events table, stays mock

## Data Flow
```text
CommandCenter
  └─ useDashboardData(user.id)
       ├─ profiles (athletes list + readiness)
       ├─ assigned_workouts (sessions + compliance)
       └─ daily_checkins (check-in rate)
       
  Props down to:
    ├─ StatCard (value, change)
    ├─ RiskRadar (athletes, riskDistribution, criticalAthletes)
    └─ CompliancePulse (workoutCompliance, checkinCompliance)
```

## Skeleton Loading
Each section shows pulse skeleton blocks matching its layout while data loads. Uses existing `Skeleton` component from `src/components/ui/skeleton.tsx`.

