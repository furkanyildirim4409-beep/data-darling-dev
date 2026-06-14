# Email Template Studio Overhaul (Part 4/4)

Most of the studio infrastructure is already in place — `RichTextEditor` is wired into the create/edit dialog, `openEdit()` prefills the form, and `handleSave()` already branches between `UPDATE` (when `form.id` exists) and `INSERT`. The remaining gaps are: (1) the category list is the old 5-key set instead of the 8 professional coaching categories, (2) generated HTML is not wrapped in a branded Dynabolic shell, and (3) the rich text editor needs to remain the single source of truth on both create and edit paths.

## Changes — `src/pages/EmailTemplates.tsx`

### 1. Category expansion

Replace the current `categoryColors` / `categoryLabels` maps and the `<Select>` options with the exact 8 categories:

```
['Hoşgeldin & Onboarding', 'Ödeme & Fatura Hatırlatması',
 'Antrenman/Program Güncellemesi', 'Motivasyon & Uyarı',
 'Haftalık Check-in', 'Kutlama & Başarı',
 'Genel Duyuru', 'Beslenme Revizyonu']
```

Each gets a stable slug key (e.g. `welcome_onboarding`, `payment_invoice`, `program_update`, `motivation_alert`, `weekly_checkin`, `celebration`, `general_announcement`, `nutrition_revision`) used in DB, with `categoryLabels` mapping back to the Turkish display string and `categoryColors` assigning distinct semantic-token chip colors (emerald, amber, blue, rose, violet, fuchsia, slate, lime). Legacy keys (`general`, `onboarding`, `transactional`, `retention`, `marketing`) fall through to a default chip so older rows still render. Default `empty.category` becomes `general_announcement`.

### 2. Dynabolic HTML wrapper

Add a helper `wrapWithDynabolicShell(innerHtml: string): string` that returns:

```
<div style="font-family: -apple-system, 'SF Pro Display', Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; line-height: 1.6; color: #1a1a1a;">
  {innerHtml}
</div>
```

Apply only when the body does not already start with a wrapper marker comment (`<!--dyn-shell-->`). Prepend the marker so re-saving an existing template doesn't double-wrap. Used inside `handleSave()` before both `insert` and `update`.

### 3. Edit button gating

Keep the existing `openEdit()` flow, but ensure the "Düzenle" button is rendered for all user-owned templates (it already is — `!t.is_system`). No behavioral change here beyond verifying the click path still routes through the dialog.

## Out of Scope

- `RichTextEditor` component itself (already production-grade).
- `useEmailTemplates` hook / schema.
- Parts 1–3 of launch prep.

## Files Touched

- `src/pages/EmailTemplates.tsx` (single file)
