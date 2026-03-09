

# 7-Day Program Builder

## Current Architecture

- `Programs.tsx` (parent) holds `selectedExercises: BuilderExercise[]` as a flat list
- `ProgramLibrary` adds items via `onAddItem` callback (click-based, no DnD library)
- `WorkoutBuilder` renders the flat exercise list with sets/reps/RPE inputs
- `WeeklySchedule` is a separate panel with native HTML drag-and-drop for assigning blocks to days

There is **no DnD library** in use for the library-to-builder flow -- exercises are added via a "+" button click. The `WeeklySchedule` uses native `dragstart/dragover/drop` events. The `@dnd-kit` packages are installed but not used here.

## Plan

### 1. Refactor data structure in `Programs.tsx`

Replace:
```ts
const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>([]);
```

With a 7-day structure:
```ts
interface DayPlan {
  day: number;       // 1-7
  label: string;     // e.g. "Push Day", "Rest Day"
  exercises: BuilderExercise[];
}

const [weekPlan, setWeekPlan] = useState<DayPlan[]>(
  Array.from({ length: 7 }, (_, i) => ({ day: i + 1, label: '', exercises: [] }))
);
const [activeDay, setActiveDay] = useState(0); // index of currently selected day
```

Update `handleAddItem` to push exercises into `weekPlan[activeDay].exercises`. Update `handleRemoveExercise`, `handleUpdateExercise`, `handleClearAll` to operate on the active day's array. Flatten all days' exercises for the save logic.

### 2. Rewrite `WorkoutBuilder.tsx` to 7-day accordion layout

- Replace the single exercise list with a **vertical Accordion** (one item per day, `AccordionItem value="day-{n}"`)
- Each day header shows: day number, editable label `Input`, exercise count badge, and a visual indicator for rest days (0 exercises = grayed out styling)
- Clicking a day sets `activeDay` so the library "+" button targets that day
- Each day's content renders its exercise list with the existing sets/reps/RPE inputs and remove button
- The currently active/open day is highlighted with a primary border

Props change:
```ts
interface WorkoutBuilderProps {
  weekPlan: DayPlan[];
  activeDay: number;
  onSetActiveDay: (index: number) => void;
  onUpdateDayLabel: (dayIndex: number, label: string) => void;
  onRemoveExercise: (dayIndex: number, exerciseId: string) => void;
  onUpdateExercise: (dayIndex: number, exerciseId: string, field: keyof BuilderExercise, value: number | string) => void;
  onClearDay: (dayIndex: number) => void;
  onClearAll: () => void;
}
```

### 3. Adapt `ProgramLibrary.tsx` -- no changes needed

The library uses a click-based `onAddItem` callback. The parent (`Programs.tsx`) already controls which day receives the exercise via `activeDay`. No modifications to `ProgramLibrary` required.

### 4. Update `WeeklySchedule.tsx` integration

Pass flattened exercises or the full `weekPlan` so the weekly preview reflects per-day exercise counts. The schedule blocks auto-populate from `weekPlan` data instead of requiring manual drag-and-drop assignment (since exercises are already assigned to days in the builder).

### 5. Update save logic in `Programs.tsx`

Flatten all 7 days into a single exercises array with a `day_index` field for each exercise row when inserting into Supabase. On edit/load, group exercises by `day_index` to reconstruct the `weekPlan`.

Note: The `exercises` table currently has `order_index`. We will use a convention like `day_index * 100 + order_index` to encode both day and order in the existing column, OR add the day label to the `notes` field. Since we can't add columns without a migration, we'll encode day info into `order_index` (e.g., day 1 exercises get indices 100-199, day 2 gets 200-299, etc.).

### 6. Visual polish

- Rest days (0 exercises): `opacity-60 bg-muted/20` styling with a "Dinlenme Günü" placeholder
- Active day accordion item: `border-l-2 border-primary` highlight
- Day headers show Turkish day names (Pazartesi through Pazar)
- Stats bar at top: total exercises across all days, total sets

### Files modified
- `src/pages/Programs.tsx` -- state refactor + handler updates
- `src/components/program-architect/WorkoutBuilder.tsx` -- full rewrite to accordion layout
- `src/components/program-architect/WeeklySchedule.tsx` -- accept `weekPlan` prop, auto-populate grid

