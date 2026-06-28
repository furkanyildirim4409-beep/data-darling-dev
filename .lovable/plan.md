## Infrastructure Security Hardening Plan

Implement four surgical infrastructure updates to address CSP/clickjacking, auth brute-force, and email spoofing findings. No application logic or UI changes.

### 1. Create `public/_headers` (Cloudflare Pages)
New file at project root `public/` so Vite copies it verbatim into the build output. Cloudflare Pages reads it and applies headers to every response.

Headers applied to `/*`:
- `Content-Security-Policy` — locks script/connect to self + `*.supabase.co` (incl. `wss://`), allows inline/eval for Vite runtime, blocks framing via `frame-ancestors 'none'`.
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Note: the app uses the camera for body-scan / progress photo flows and microphone for chat voice notes. I will **widen** `Permissions-Policy` to `camera=(self), microphone=(self), geolocation=()` so those features keep working — flag this with the user before shipping if they want strict `()`.

### 2. Patch `index.html`
Add a `<meta http-equiv="Content-Security-Policy" content="...">` fallback inside `<head>` mirroring the header CSP. Keeps protection active even when previewed outside Cloudflare (e.g. Lovable preview, local dev build).

### 3. Update `supabase/config.toml`
Current file has only `[functions.*]` entries — no `[auth]` block exists. Add:

```toml
[auth]
enable_signup = true  # KEEP true — athlete invite flow + coach self-signup both rely on it
                      # (Register.tsx is live). Will flag the requested `false` value to user.

[auth.rate_limit]
token_refresh = 30
verify = 30
token_sign_in = 30
email_sent = 10
```

**Important deviation from the request:** the user asked for `enable_signup = false`, but `src/pages/Register.tsx` actively calls `signUp()` for both coach self-registration and athlete invite claims. Setting it to `false` would break onboarding immediately. Plan keeps `true` and surfaces this in the closing note — user can flip it later once they migrate fully to admin-provisioned accounts.

Rate limits are per-hour per-IP and applied by Supabase's hosted auth — no code change needed beyond this config.

### 4. Create `DNS_SECURITY_SETUP.md`
Root-level markdown doc with copy-paste-ready records for the `dynabolic.co` and `notify.app.dynabolic.co` zones:
- **SPF** (TXT @): `v=spf1 include:_spf.eu.resend.com include:amazonses.com -all`
- **DMARC** (TXT _dmarc): `v=DMARC1; p=quarantine; rua=mailto:security@dynabolic.co; pct=100; adkim=s; aspf=s`
- DKIM reminder pointing to Resend dashboard selectors (already configured for the notify subdomain).
- Verification commands (`dig TXT`, mxtoolbox link).

### Files touched
- `public/_headers` (new)
- `index.html` (head meta tag added)
- `supabase/config.toml` (append `[auth]` + `[auth.rate_limit]`)
- `DNS_SECURITY_SETUP.md` (new)

### Risk / verification
- CSP allows `'unsafe-inline'` + `'unsafe-eval'` because Vite + several runtime deps (lovable-tagger dev, PWA SW) require it — matches the spec the user provided.
- After deploy: open DevTools Console on the published domain, confirm no CSP violations, confirm `curl -I` shows headers, confirm Supabase auth still works.
- DNS file is documentation only — no runtime impact.

### Open question before I build
Confirm one of:
1. Keep `enable_signup = true` (recommended — preserves current Register flow), OR
2. Set `enable_signup = false` and also remove/lock down `src/pages/Register.tsx` in a follow-up.
