# DNS Security Setup — Dynabolic

These records harden the `dynabolic.co` zone against email spoofing and phishing. Add them at your DNS provider (Cloudflare recommended). DNS changes propagate in 5 minutes–24 hours.

> Apply these on the **root zone** `dynabolic.co`. If you also send mail from the subdomain `notify.app.dynabolic.co`, repeat the SPF + DMARC records on that subdomain's zone as well (Resend manages its DKIM selectors automatically there).

---

## 1. SPF — Sender Policy Framework

Authorises Resend and Amazon SES as the only legitimate senders for `@dynabolic.co`.

| Type | Name | Value |
|------|------|-------|
| TXT  | `@`  | `v=spf1 include:_spf.eu.resend.com include:amazonses.com -all` |

The `-all` hard-fails any unauthorised sender. Only one SPF record may exist per domain — merge with any existing one rather than duplicating.

---

## 2. DMARC — Domain-based Message Authentication

Tells receiving mail servers what to do with messages that fail SPF/DKIM and where to send aggregate reports.

| Type | Name      | Value |
|------|-----------|-------|
| TXT  | `_dmarc`  | `v=DMARC1; p=quarantine; rua=mailto:security@dynabolic.co; pct=100; adkim=s; aspf=s` |

- `p=quarantine` — failing mail lands in spam (upgrade to `p=reject` after 2 weeks of clean reports).
- `adkim=s` / `aspf=s` — strict alignment; the `From:` domain must exactly match the SPF/DKIM domain.
- `rua` — daily aggregate reports. Make sure `security@dynabolic.co` exists or use a DMARC processor (Postmark, dmarcian, Valimail).

---

## 3. DKIM — DomainKeys Identified Mail

Already managed automatically by Resend on the `notify.app.dynabolic.co` subdomain. Verify in the **Resend Dashboard → Domains** that all three CNAME records (`resend._domainkey`, `_dmarc`, etc.) show **Verified**. If they don't, copy them from Resend into Cloudflare DNS.

---

## 4. Verification

After propagation:

```bash
dig +short TXT dynabolic.co
dig +short TXT _dmarc.dynabolic.co
```

Or use a web checker:

- https://mxtoolbox.com/spf.aspx
- https://mxtoolbox.com/dmarc.aspx
- https://www.mail-tester.com (send a test from the app, score should be ≥ 9/10)

---

## 5. Hardening Roadmap

1. **Week 1** — deploy `p=quarantine`, watch `rua` reports.
2. **Week 2** — flip to `p=reject` once no legitimate sender is failing.
3. **Month 2** — add **BIMI** (`default._bimi` TXT) with a verified VMC for logo-in-inbox display.
4. **MTA-STS** — add `_mta-sts` and `mta-sts.dynabolic.co` records to force TLS on inbound mail.

---

## 6. Related Web Security

Cloudflare-edge HTTP security headers are configured in [`public/_headers`](./public/_headers) and applied automatically on every deploy. Supabase auth rate limiting is configured in [`supabase/config.toml`](./supabase/config.toml) under `[auth.rate_limit]`.
