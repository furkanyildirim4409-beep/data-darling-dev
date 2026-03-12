

## Workout Program Import/Export via Library UI

### Overview
Add JSON export to the existing 3-dot dropdown on program cards, and an import button next to "Program Oluştur" in the ProgramDashboard header.

### Changes

**`src/components/program-architect/ProgramDashboard.tsx`**

1. **Export (dropdown item)**
   - Add `handleExportProgram(item)` function
   - For exercise programs: fetch exercises from `exercises` table + `week_config`/`automation_rules` from `programs` table
   - For nutrition templates: fetch foods from `diet_template_foods`
   - Bundle into JSON object: `{ name, description, type, difficulty, targetGoal, weekConfig, exercises }` (or nutrition equivalent)
   - Create Blob, trigger download as `[name]-template.json`
   - Add `<DropdownMenuItem>` with download icon + "📤 Dışa Aktar" text to both exercise and nutrition dropdown sections
   - Add `Download` to lucide imports

2. **Import (header button)**
   - Add hidden `<input type="file" accept=".json" ref={importRef} />`
   - Add `handleImportProgram` function:
     - Parse JSON file
     - Validate structure (must have `name`, `type`, and exercises/foods array)
     - For exercise type: insert into `programs` table, then insert exercises into `exercises` table with proper `order_index` encoding
     - For nutrition type: insert into `diet_templates` + `diet_template_foods`
     - Show success toast, refresh list
   - Add "📥 İçe Aktar" Button next to "Program Oluştur" button (line ~363)
   - Add `Upload` to lucide imports

### Export JSON Structure
```text
{
  name: string,
  type: "exercise" | "nutrition",
  description: string,
  difficulty?: string,
  targetGoal?: string,
  weekConfig: [...],        // from programs.week_config
  exercises: [              // from exercises table
    { name, sets, reps, rir, failure_set, notes, order_index, video_url, rest_time }
  ]
}
```

### File Changes
- **Edit**: `src/components/program-architect/ProgramDashboard.tsx` — add export handler + dropdown item, import handler + button + hidden input

