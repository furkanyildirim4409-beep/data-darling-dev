

## Part 4: Dynamic Workout Player UI (GIF & Data Sync)

### Current State
- `ProgramTab.tsx` renders assigned exercises as plain text rows with number badges, sets/reps/RIR data
- The `exercises` JSON in `assigned_workouts` already contains `video_url` (embedded during assignment) plus `rest_time`, `rir`, `failure_set`, `notes`
- The `ExerciseJson` interface is missing `video_url` and `rest_time` fields

### Changes (single file: `src/components/athlete-detail/ProgramTab.tsx`)

**1. Update `ExerciseJson` interface** to include `video_url?: string` and `rest_time?: string`

**2. Replace the plain exercise rows (lines 267-293)** with a rich card layout per exercise:
- **GIF thumbnail**: Show `ex.video_url` as a 48x48 rounded image with lazy loading and a skeleton/pulse placeholder while loading. On error or missing URL, show a gradient placeholder with a Dumbbell icon
- **Clickable preview**: Clicking the thumbnail opens a Dialog showing the full-size GIF (reuse the same pattern from `SortableExerciseItem.tsx`)
- **Exercise info**: Name + notes displayed with proper truncation
- **Metrics row**: Display sets/reps as "3 Set × 8-10 Tekrar" format, RIR badge (red when 0), failure (Zap) icon, and rest time with Clock icon if present

**3. Add preview Dialog state** (`previewExercise` state) to show full-size GIF in a modal when thumbnail is clicked

### No backend changes needed
The `video_url` is already embedded in the exercises JSON during program assignment. No additional DB queries or joins required.

