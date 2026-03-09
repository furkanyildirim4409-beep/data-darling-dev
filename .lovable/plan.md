

# Inject Group ID into Exercise JSONB during Assignment

## Changes — `AssignProgramDialog.tsx`

1. **Update `WeekConfigDay` interface** to type `groups` properly:
   ```ts
   groups?: Array<{ id: string; exerciseIds: string[] }>;
   ```

2. **Update `ExerciseRow` interface** to include `id`:
   ```ts
   id: string;
   ```

3. **In the exercise mapping** (lines 177-188), look up each exercise's group from `cfg?.groups` and inject `groupId`:
   ```ts
   const dayGroups = cfg?.groups || [];
   const exercisesJson = (exs ?? [])
     .sort(...)
     .map((ex) => {
       const foundGroup = dayGroups.find(g => g.exerciseIds.includes(ex.id));
       return {
         ...existing fields...,
         groupId: foundGroup?.id ?? null,
       };
     });
   ```

Single file, minimal change — just adds `groupId` to the output JSON so the athlete app can render superset/circuit groupings.

