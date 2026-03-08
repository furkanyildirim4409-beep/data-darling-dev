

# Connect Athletes to Supabase

## Problem
`useAthletes.ts` and `Athletes.tsx` use localStorage/mockAthletes instead of the real Supabase database.

## Approach

### 1. Create `link_athlete_to_coach` RPC function (migration)
A security definer function that:
- Looks up a profile by email where `role = 'athlete'`
- Returns `'not_found'` if no match
- Returns `'already_linked'` if `coach_id` is already set to another coach
- Sets `coach_id = _coach_id` and returns `'ok'`

### 2. Rewrite `useAthletes.ts`
- Remove all localStorage/mockAthletes logic
- Query `profiles` table: `select * from profiles where role = 'athlete' and coach_id = user.id`
- Map DB rows to the `Athlete` interface (fill missing UI fields like `compliance`, `injuryRisk` etc. with defaults since they don't exist in DB yet)
- Add realtime subscription on `profiles` table filtered by `coach_id`
- Return `{ athletes, isLoading, error, refetch }`

### 3. Rewrite `handleLinkAthlete` in `Athletes.tsx`
- Remove mockAthletes import and localStorage constant
- Call `supabase.rpc('link_athlete_to_coach', { _coach_id: user.id, _athlete_email: linkEmail.trim() })`
- Handle `not_found`, `already_linked`, and success responses with appropriate toasts

### 4. Update Supabase types
- Add the new RPC function signature to `types.ts`

### Data Mapping Note
The `Athlete` interface has many UI-specific fields (compliance, injuryRisk, checkInStatus, etc.) that don't exist in the `profiles` table. These will be filled with sensible defaults until dedicated tables/columns are created.

