

## Epic 10 - Part 1: Visual Email Template Engine & Master HTML Seeding

### Summary
Evolve the `email_templates` table with new metadata columns, seed 3 enterprise-grade visual HTML templates, and update the hook. No UI changes in this part.

### Step A — Database Migration: Schema Evolution

Add 3 new columns to `email_templates`:

```sql
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS required_variables jsonb DEFAULT '[]'::jsonb;
```

Also update the 2 existing system templates with appropriate `category` and `required_variables`:
- "Hoş Geldin (Kurumsal)" → category: 'onboarding', required_variables: '["isim"]'
- "Antrenman Programı Hatırlatması" → category: 'retention', required_variables: '["isim"]'

### Step B — Seed 3 Master Visual HTML Templates

All templates use table-based layouts with inline CSS for universal email client compatibility. Each template includes:
- Brand header with logo placeholder
- Hero image area
- CTA button with inline styles
- Dark/modern aesthetic with `#1a1a2e` / `#16213e` backgrounds
- Responsive `max-width: 600px` wrapper

**Template 1: "Premium Hoş Geldin"** (onboarding)
- Subject: `Dynabolic Ailesine Hoş Geldiniz, {{isim}}! 🚀`
- Variables: `["isim", "baslangic_linki"]`
- Design: Dark gradient header, motivational hero, emerald "Hemen Başla" CTA

HTML snippet preview:
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b; border-radius:12px;">
      <!-- Logo Header -->
      <tr><td style="padding:32px; text-align:center; background:linear-gradient(135deg,#1e293b,#0f172a);">
        <h1 style="color:#10b981; font-family:sans-serif; font-size:28px;">DYNABOLIC</h1>
      </td></tr>
      <!-- Hero -->
      <tr><td style="padding:0;">
        <img src="https://placehold.co/600x250/1e293b/10b981?text=Welcome" width="600" style="display:block;" />
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:40px 32px; color:#e2e8f0; font-family:sans-serif;">
        <h2 style="color:#ffffff;">Hoş Geldin, {{isim}}! 🚀</h2>
        <p>Dynabolic ailesine katıldığın için çok mutluyuz...</p>
        <a href="{{baslangic_linki}}" style="display:inline-block; padding:16px 40px; background:#10b981; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">Hemen Başla</a>
      </td></tr>
    </table>
  </td></tr>
</table>
```

**Template 2: "Sipariş Onayı"** (transactional)
- Subject: `Siparişiniz Onaylandı! (No: {{siparis_no}})`
- Variables: `["isim", "siparis_no", "paket_adi", "tutar"]`
- Design: Clean receipt style, order details table, blue accent

**Template 3: "Üyelik Yenileme Hatırlatması"** (retention)
- Subject: `{{isim}}, Programının Bitmesine Çok Az Kaldı! ⏳`
- Variables: `["isim", "kalan_gun", "yenileme_linki"]`
- Design: Urgency-driven, amber/orange accent, countdown highlight, bold CTA

### Step C — Update `useEmailTemplates` Hook

Update ordering to: `is_system` desc → `category` asc → `created_at` desc. The `select("*")` already fetches all columns, so new columns are automatically included.

### Files

| File | Action |
|------|--------|
| Migration SQL | CREATE — add columns + seed 3 templates + update existing 2 |
| `src/hooks/useEmailTemplates.ts` | EDIT — update ordering |

No UI changes. No files deleted.

