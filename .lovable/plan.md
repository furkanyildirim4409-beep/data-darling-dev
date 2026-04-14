

## Epic 8 - Part 1: Inbound Webhook Payload Fix

### Summary
Fix the `inbound-email` Edge Function to unwrap Resend's `payload.data` wrapper and add detailed debug logging.

### Change — `supabase/functions/inbound-email/index.ts` (EDIT)

**Line 58-59** — After parsing JSON, unwrap the `data` property and add logging:

```typescript
const payload = JSON.parse(rawBody);
console.log('inbound-email: raw webhook payload:', JSON.stringify(payload));

// Resend wraps email data inside payload.data
const emailData = payload.data || payload;
const { from, to, subject, text, html } = emailData;

console.log('inbound-email: extracted fields:', JSON.stringify({ from, to, subject }));
```

**Lines 62-73** — Keep existing `to`/`from` parsing logic intact (already handles arrays and angle brackets).

**After line 84** — Add username log:
```typescript
console.log('inbound-email: cleanTo:', cleanTo, 'cleanFrom:', cleanFrom, 'username:', username);
```

Then redeploy the function.

### Files
| File | Action |
|------|--------|
| `supabase/functions/inbound-email/index.ts` | EDIT — unwrap `payload.data`, add logging |

### Deploy
Deploy `inbound-email` after edit.

