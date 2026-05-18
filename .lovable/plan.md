# Plan: Add Spotify URL Input to Workout Builder (Part 2/2)

## Where the input actually lives

`WorkoutBuilder.tsx` has **no** program title/description inputs — it only edits per-day exercises. Program metadata (title, description, difficulty, target) is collected in **`SaveTemplateDialog.tsx`** when the coach clicks "Kaydet". The page header in `Programs.tsx` displays the title but is not an input.

## Changes

### 1. SaveTemplateDialog.tsx — add the Spotify input

Add a new text input between the Description field and the Difficulty/Hedef row:
- Label: "Spotify Playlist Linki (Opsiyonel)" with a `Music` icon (Lucide)
- Placeholder: "Örn: https://open.spotify.com/playlist/..."
- Styling: glass input (`bg-background/50` border) — consistent with existing inputs
- State: `spotifyUrl` string, pre-filled from `editingProgram?.spotifyUrl`
- Passed into `onSave({ title, description, difficulty, targetGoal, spotifyUrl })`

### 2. SaveTemplateDialogProps & Programs.tsx — wire the value

- Expand `onSave` callback type to include `spotifyUrl: string`
- In `Programs.tsx`, `handleSaveProgram` already receives the meta object and writes to `programs`. Add `spotify_url: meta.spotifyUrl || null` to both `.insert()` and `.update()` payloads.

### 3. ProgramData (ProgramDashboard.tsx) — carry spotify_url

- Add `spotifyUrl?: string` to `ProgramData` interface
- In `fetchPrograms`, map `p.spotify_url` → `spotifyUrl`

### 4. Programs.tsx handleEditProgram — load spotify_url

- When loading an existing program for editing, fetch `spotify_url` alongside `automation_rules, week_config` so it flows into `editingProgram` and pre-fills the Save dialog.

## Out of scope

- Per-day Spotify URLs (would require a DB schema change not in Part 1)
- URL format validation (coaches can paste any link)
- Deep-link launch UI (athlete mobile app, not coach app)
