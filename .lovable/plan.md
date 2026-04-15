

## Epic 10 - Part 2: Visual Template Studio (WYSIWYG)

### Summary
Upgrade the EmailTemplates page with a rich text editor, category badges, and variable metadata display. No routing or unrelated Mailbox features will be modified.

### Step A — Install `react-quill-new`

Using `react-quill-new` instead of `react-quill` — it's the actively maintained fork with full React 18 + Vite ESM compatibility. The original `react-quill` has known SSR/ESM issues and is unmaintained.

### Step B — Create `src/components/mailbox/RichTextEditor.tsx` (NEW)

Controlled component wrapping ReactQuill:
- Props: `value: string`, `onChange: (html: string) => void`
- Toolbar: Headers, Bold, Italic, Underline, Lists, Link, Color, Clean
- Import Quill Snow CSS theme
- Custom styling to match the dark theme (override `.ql-toolbar` and `.ql-editor` borders/bg)

### Step C — Revamp `src/pages/EmailTemplates.tsx` (EDIT)

**TemplateForm interface** — extend with `category` and `required_variables`:
```typescript
interface TemplateForm {
  id?: string;
  name: string;
  subject: string;
  body_html: string;
  category?: string;
  required_variables?: string[];
}
```

**Card Grid enhancements:**
- Category badge with color mapping: onboarding → emerald, transactional → blue, retention → amber, general → gray
- Display `required_variables` as small `{{var}}` code badges below subject
- Render a sanitized HTML preview snippet (via `dangerouslySetInnerHTML` in a constrained div with `max-h-24 overflow-hidden`)

**Edit Dialog upgrades:**
- Replace `<Textarea>` with `<RichTextEditor>` for `body_html`
- Widen dialog to `sm:max-w-2xl` for editor comfort
- Add "Kullanılabilir Değişkenler" section showing `required_variables` as copyable badges (click to insert `{{var}}` text)
- Add a `category` select dropdown (onboarding / transactional / retention / general)

**Data flow:**
- `openEdit` populates `category` and `required_variables` from template data
- `handleSave` persists `category` and `required_variables` alongside existing fields
- System templates remain view-only (no edit/delete buttons)

### Files

| File | Action |
|------|--------|
| `package.json` | EDIT — add `react-quill-new` |
| `src/components/mailbox/RichTextEditor.tsx` | CREATE |
| `src/pages/EmailTemplates.tsx` | EDIT — WYSIWYG + metadata UI |

No routing changes. No files deleted. No existing Mailbox features affected.

