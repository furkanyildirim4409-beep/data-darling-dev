

## Part 2: AI Context Injection & Strict Exercise Mapping

### Changes

**1. Edge Function (`supabase/functions/generate-ai-program/index.ts`)**
- Accept `validExercises: string[]` from request body
- Inject the exercise list into the system prompt with a strict directive: "ONLY use exercise names from this list verbatim"
- If the list is too large for a single prompt, truncate to first ~1200 entries (token safety)

**2. Client (`src/pages/Programs.tsx`)**
- Import `useValidExercises` hook
- In `handleAIGenerate`: check if `validExerciseNames` is empty → show toast and abort
- Pass `validExercises: validExerciseNames` in the edge function body
- Add `validExerciseNames` to the `useCallback` dependency array

### File Changes

**`supabase/functions/generate-ai-program/index.ts`** (lines ~27-35):
- Parse `body.validExercises` as `string[]`
- Update `systemPrompt` to append: `"SADECE aşağıdaki listeden egzersiz seç. Listedeki isimleri birebir kullan, değiştirme, çevirme veya yeni isim uydurma. Egzersiz listesi: ${validExercises.join(', ')}"`

**`src/pages/Programs.tsx`** (lines ~1, ~336-381):
- Add `import { useValidExercises } from "@/hooks/useValidExercises";`
- Call `const { validExerciseNames } = useValidExercises();` in component body
- Guard: if `validExerciseNames.length === 0` → `toast.error("Egzersiz kütüphanesi yükleniyor...")` and return
- Pass `validExercises: validExerciseNames` in the invoke body

