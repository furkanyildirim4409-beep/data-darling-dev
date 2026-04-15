

## Epic 10 - Part 3: Global System Automation Hub (Self-Signup)

### Summary
Create a system-level Edge Function triggered by `profiles` INSERT webhook that detects user role and sends the appropriate visual welcome template. Seed a new "Kaptan Hoş Geldin" coach-specific template. Unlike the existing coach-scoped functions, this one operates as a platform-level sender (`system@dynabolic.co`).

### Step A — SQL Migration: Seed "Kaptan Hoş Geldin" Template

Insert a new system template with the emerald/dark coaching theme:

- `name`: 'Kaptan Hoş Geldin'
- `category`: 'onboarding'
- `is_system`: true, `owner_id`: null
- `subject`: 'Dynabolic''e Hoş Geldin Kaptan! Ekibini Kurmaya Hazır Mısın? 🦅'
- `required_variables`: `["isim", "baslangic_linki"]`
- `body_html`: Full table-based inline-CSS HTML with:
  - Dark `#0f172a` / `#1e293b` background, emerald `#10b981` accents
  - "DYNABOLIC" brand header
  - Hero image placeholder
  - Coach-specific messaging (team building, athlete management)
  - Feature highlights: Athlete Management, Program Architect, Analytics
  - Emerald "Paneline Git" CTA button linking to `{{baslangic_linki}}`
  - Footer with platform tagline

HTML snippet preview:
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
  <tr><td align="center" style="padding:40px 0;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b; border-radius:12px;">
      <tr><td style="padding:32px; text-align:center;">
        <h1 style="color:#10b981; font-family:sans-serif; font-size:28px; margin:0;">DYNABOLIC</h1>
        <p style="color:#64748b; font-size:12px;">COACHING PLATFORM</p>
      </td></tr>
      <tr><td style="padding:0;">
        <img src="https://placehold.co/600x200/0f172a/10b981?text=Welcome+Captain" width="600" style="display:block;"/>
      </td></tr>
      <tr><td style="padding:40px 32px; color:#e2e8f0; font-family:sans-serif;">
        <h2 style="color:#fff; font-size:24px;">Hoş Geldin Kaptan, {{isim}}! 🦅</h2>
        <p>Dynabolic ile sporcularını profesyonelce yönet...</p>
        <!-- 3 feature highlight cards -->
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="background:#0f172a; border-radius:8px; padding:16px; text-align:center; color:#10b981;">
              <strong>👥 Sporcu Yönetimi</strong>
            </td>
          </tr>
          <!-- ... more features -->
        </table>
        <div style="text-align:center; padding-top:24px;">
          <a href="{{baslangic_linki}}" style="display:inline-block; padding:16px 48px; background:#10b981; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px;">Paneline Git</a>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### Step B — Create `supabase/functions/global-system-automation/index.ts` (NEW)

Webhook-triggered function for `profiles` INSERT:
- Extract `id`, `role`, `email`, `full_name` from `payload.record`
- Guard: skip if no `email` or no `role`
- **Role branching:**
  - `role === 'coach'` → fetch template `name = 'Kaptan Hoş Geldin'`, fallback to `'Premium Hoş Geldin'` with warning log
  - `role === 'athlete'` (or any other) → fetch `'Premium Hoş Geldin'`
- Replace `{{isim}}` and `{{baslangic_linki}}` (`https://app.dynabolic.co/login`)
- Send via Resend from `Dynabolic Platform <system@dynabolic.co>`
- Log to `emails` table: `owner_id = record.id`, `direction = 'outbound'`, `from_email = 'system@dynabolic.co'`, `is_read = true`
- Always return 200

### Step C — Update `supabase/config.toml` (EDIT)

Append:
```toml
[functions.global-system-automation]
verify_jwt = false
```

### Files

| File | Action |
|------|--------|
| Migration SQL | CREATE — seed 'Kaptan Hoş Geldin' template |
| `supabase/functions/global-system-automation/index.ts` | CREATE |
| `supabase/config.toml` | EDIT — add function config |

No DB trigger migration. Webhook configured manually via Dashboard.

