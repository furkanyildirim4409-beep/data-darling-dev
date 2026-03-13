

## Part 3: AI Program Personalization & Config Modal

### 1. New File: `src/components/program-architect/AIGeneratorModal.tsx`
A Dialog component with:
- **Goal** select: Hipertrofi, Güç, Yağ Yakımı, Kondisyon
- **Days** slider: 1-7 (default 3)
- **Level** select: Başlangıç, Orta, İleri
- **Special Notes** textarea: free-text for injuries, bloodwork notes, etc.
- A gradient "Programı Üret" button calling `onGenerate({ goal, days, level, specialNotes })`

### 2. Update `src/pages/Programs.tsx`
- Add `isAIModalOpen` state
- Change `handleAIGenerate` to accept `{ goal, days, level, specialNotes }` params instead of hardcoded values
- Pass all params to edge function body: `{ goal, days, level, specialNotes, validExercises }`
- The existing AI button click opens the modal; modal's onGenerate triggers the actual generation

### 3. Update `src/components/program-architect/WorkoutBuilder.tsx`
- The `onAIGenerate` prop now just opens the modal (no signature change needed, Programs.tsx controls this)

### 4. Update Edge Function `generate-ai-program/index.ts`
- Parse `level` and `specialNotes` from body
- Enhance system prompt:
  - Add `Sporcu Seviyesi: ${level}` 
  - Add `Özel Notlar: ${specialNotes || 'Yok'}. Bu durumlara dikkat ederek programı optimize et.`
- Map goal to blockType dynamically in the client response handler

### Files Modified
- **New**: `src/components/program-architect/AIGeneratorModal.tsx`
- **Edit**: `src/pages/Programs.tsx` (~15 lines changed)
- **Edit**: `supabase/functions/generate-ai-program/index.ts` (~5 lines changed)

