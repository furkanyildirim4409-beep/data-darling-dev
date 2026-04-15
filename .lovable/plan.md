

## Epic 9 - Part 2: Template Management UI

### Summary
Create a template management page at `/mailbox/templates` with CRUD capabilities, a create/edit dialog, and sidebar navigation. No existing files deleted.

### Step A — Create `src/pages/EmailTemplates.tsx` (NEW)

Full-page template manager:
- Header: "Mail Şablonları" title + "Yeni Şablon" button
- Grid of Cards from `useEmailTemplates` hook
- Each card: name, subject preview, "Sistem Şablonu" badge if `is_system`
- Edit/Delete buttons only on non-system templates
- Delete uses AlertDialog confirmation
- Mutations: direct Supabase `insert`, `update`, `delete` on `email_templates`
- Sets `owner_id = user.id` on create
- Invalidates `["email-templates"]` query key on success

### Step B — Inline `TemplateDialog` component (inside EmailTemplates.tsx)

Dialog with form fields:
- Şablon Adı (name) — required Input
- Mail Konusu (subject) — required Input
- Mail İçeriği (body_html) — Textarea with helper text: `{{isim}} değişkenini kullanabilirsiniz`
- Mode: create vs edit (pre-fill fields when editing)
- On save: insert or update, then invalidate query cache

### Step C — Route + Sidebar

**`src/App.tsx`**: Add `<Route path="/mailbox/templates" element={<EmailTemplates />} />` inside the protected layout block, next to the `/mailbox` route.

**`src/components/layout/AppSidebar.tsx`**: Add a new nav item after the Mail Kutusu entry:
```
{ path: "/mailbox/templates", label: "Şablonlar", icon: FileText }
```

### Files

| File | Action |
|------|--------|
| `src/pages/EmailTemplates.tsx` | CREATE — page + dialog |
| `src/App.tsx` | EDIT — add route |
| `src/components/layout/AppSidebar.tsx` | EDIT — add nav item |

No existing files deleted.

