

## Epic 8 - Part 4: Fetch Inbound Body via Resend SDK

### Summary
Replace the failing REST API fetch (`GET /emails/{id}` — outbound-only, returns 404) with the Resend SDK's `resend.emails.receiving.get(email_id)` endpoint for inbound emails.

### Current State
- Svix verification: ✅ Already using official `svix@1.21.0` — no changes needed
- Body fetch: ❌ Uses `https://api.resend.com/emails/${email_id}` REST endpoint (outbound-only, 404s)
- DB insert: ✅ Already uses `htmlBody`/`textBody` variables

### Change — `supabase/functions/inbound-email/index.ts` (EDIT)

**Line 1** — Add Resend SDK import:
```typescript
import { Resend } from 'npm:resend';
```

**Lines 55-77** — Replace the REST `fetch` block with SDK call:
```typescript
// Fetch full inbound email content using the Resend SDK
if (email_id) {
  const resendKey = Deno.env.get('RESEND_DIRECT_API_KEY');
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { data: fetchedEmail, error: fetchErr } = await resend.emails.receiving.get(email_id);

      if (fetchedEmail) {
        htmlBody = fetchedEmail.html || htmlBody;
        textBody = fetchedEmail.text || textBody;
        console.log(`inbound-email: fetched full body via SDK for email_id=${email_id}`);
      } else {
        console.error('inbound-email: Resend SDK fetch failed:', fetchErr);
      }
    } catch (err) {
      console.error('inbound-email: error using Resend SDK:', err);
    }
  } else {
    console.warn('inbound-email: RESEND_DIRECT_API_KEY not set, skipping body fetch');
  }
}
```

Everything else (Svix verification, to/from parsing, profile lookup, DB insert) remains untouched.

### Deploy
Redeploy `inbound-email` after edit.

### Files
| File | Action |
|------|--------|
| `supabase/functions/inbound-email/index.ts` | EDIT — add `npm:resend` import, replace REST fetch with SDK `receiving.get()` |

