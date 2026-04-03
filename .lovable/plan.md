

## Supplement Template Assignment Flow

### Summary
Create an assignment dialog for supplement templates and wire it into ProgramDashboard's dropdown menu, bridging saved templates to athlete assignments.

### 1. Create `src/components/program-architect/AssignSupplementTemplateDialog.tsx`

Mirror the `AssignDietTemplateBulkDialog` pattern:
- Props: `open`, `onOpenChange`, `templateId`, `templateName`
- Fetch coach's athletes from `profiles` (same query pattern as diet dialog)
- Checkbox multi-select for athletes with avatar/name
- On submit: fetch `supplement_template_items` for the templateId, then for each selected athlete, bulk-insert into `assigned_supplements` with mapping:
  - `athlete_id`, `coach_id: activeCoachId`
  - `name_and_dosage: "${item.supplement_name} - ${item.dosage}"`
  - `dosage: item.dosage`, `timing: item.timing`, `icon: item.icon`
  - `total_servings: 30`, `servings_left: 30`, `is_active: true`
- Success toast with count of athletes assigned

### 2. Modify `src/components/program-architect/ProgramDashboard.tsx`

- Add state: `supAssignDialog` (same shape as `dietAssignDialog`)
- In the `item.type === "supplement"` dropdown section (lines 846-865), add a "Sporculara Ata" menu item gated by `canAssignPrograms`
- Render `<AssignSupplementTemplateDialog>` at the bottom alongside the other dialogs

### Files
| File | Action |
|------|--------|
| `src/components/program-architect/AssignSupplementTemplateDialog.tsx` | NEW |
| `src/components/program-architect/ProgramDashboard.tsx` | MODIFY — add state + menu item + dialog render |

