

## AI Program Generator — Implementation Plan

### Overview
Add a "✨ AI ile Program Üret" button to WorkoutBuilder that calls a Gemini-powered edge function. The AI returns a structured 3-day workout split, which auto-populates the builder's `weekPlan` state.

### Architecture

```text
[Button Click] → [Edge Function: generate-ai-program]
                    → Lovable AI Gateway (gemini-2.5-flash)
                    → Structured JSON response
                 ← Parse & map to DayPlan[] 
              ← setWeekPlan(aiGeneratedDays)
```

### Changes

**1. Edge Function: `supabase/functions/generate-ai-program/index.ts`**
- CORS + POST handler
- Uses `LOVABLE_API_KEY` (already available) to call Lovable AI Gateway
- Model: `google/gemini-2.5-flash`
- System prompt: elite S&C coach, returns pure JSON array of days with exercises
- Tool calling for structured output (day objects with `dayName` + `exercises` array)
- Returns parsed JSON to client

**2. `supabase/config.toml`**
- Add `[functions.generate-ai-program]` with `verify_jwt = false`

**3. `WorkoutBuilder.tsx`**
- Add new prop: `onAIGenerate` callback
- Add glowing "✨ AI ile Program Üret" button in the header area
- Add loading state with overlay message

**4. `Programs.tsx`**
- Add `handleAIGenerate` function that:
  - Calls `supabase.functions.invoke('generate-ai-program')`
  - Parses the AI response
  - Maps each AI exercise to `BuilderExercise` with generated UUIDs
  - Maps each AI day to `DayPlan` with proper labels/blockTypes
  - Calls `setWeekPlan(mappedDays)` to populate the builder
- Pass `onAIGenerate` to `WorkoutBuilder`

### Data Mapping (AI Response → Builder State)
```text
AI returns:
[
  { dayName: "1. Gün: İtme", exercises: [{name, sets, reps, notes}] },
  ...
]

Maps to DayPlan[]:
- day: index + 1
- label: dayName
- blockType: "hypertrophy" (default)
- exercises: mapped to BuilderExercise with crypto.randomUUID() ids
```

### File Changes
- **New**: `supabase/functions/generate-ai-program/index.ts`
- **Edit**: `supabase/config.toml` — add function entry
- **Edit**: `src/components/program-architect/WorkoutBuilder.tsx` — add button + prop
- **Edit**: `src/pages/Programs.tsx` — add handler + pass prop

