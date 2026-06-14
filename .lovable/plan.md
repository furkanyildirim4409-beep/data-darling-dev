# Mailbox Engine Bug Fixes (Part 1/4)

## Problem Analysis

**Triple-insert bug (confirmed in DB):** every inbound email creates 3 rows — 2 with `html_len=0, text_len=0` and 1 with the real body, all within ~500ms with identical subject/sender. Resend's webhook fires for multiple event types (`email.delivered`, `email.bounced`, `email.received`, etc.) at the same endpoint. The current `inbound-email/index.ts` does not filter `payload.type`, so every event is inserted. The empty rows are non-`received` events that carry no body; only `email.received` (or `inbound.created`) carries `email_id` and content.

**Template HTML bug (confirmed in `ComposeMailDialog.tsx`):** the dialog strips template HTML to plain text (`tpl.body_html.replace(/<[^>]*>/g, "\n")`) into a `<Textarea>`, then `send-custom-email` does `bodyText.replace(/\n/g, "<br>")` and ships that as `html`. So formatting/images are lost and `{{isim}}` is never substituted.

## Fix 1 — `supabase/functions/inbound-email/index.ts`

1. Parse `payload.type`. **Only proceed when `type === 'email.received'`** (Resend inbound). For any other event type (`email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, etc.) immediately return `200 { skipped: 'event_type' }` **before** any DB insert. This single guard kills the 2 empty rows per email.
2. Additionally require a non-empty `email_id` and at least one of `html`/`text` (post-SDK fetch). If both bodies are still empty after the Resend SDK fetch, log and skip (defensive — should never happen for `email.received`).
3. Make the insert idempotent on `email_id` (provider message id): add a UNIQUE index on a new nullable `provider_message_id` column on `public.emails`, store `email_id` there, and use `.upsert(..., { onConflict: 'provider_message_id', ignoreDuplicates: true })`. Protects against Resend webhook retries causing future duplicates.
4. Keep the existing Svix verification, `from`/`to` parsing, and profile lookup as-is.

## Fix 2 — `src/components/mailbox/ComposeMailDialog.tsx`

1. Replace the plain `<Textarea>` with the existing `RichTextEditor` (already used elsewhere). Hold body as **HTML** in a new `bodyHtml` state.
2. On template select: set `subject` and `bodyHtml = tpl.body_html` directly — no HTML stripping.
3. Add an **Athlete selector** (`<Select>`) populated from `useAthletes()` so the coach can pick the recipient. Selecting an athlete auto-fills `toEmail` and stores `selectedAthleteName` (full_name). Free-text `toEmail` input remains as a fallback for arbitrary addresses.
4. Before invoking the function, run:
   ```ts
   const finalHtml = bodyHtml.replace(/\{\{isim\}\}/g, selectedAthleteName || 'Sporcu');
   const finalSubject = subject.replace(/\{\{isim\}\}/g, selectedAthleteName || 'Sporcu');
   ```
5. Pass `{ toEmail, subject: finalSubject, bodyHtml: finalHtml }` to `useSendEmail`.

## Fix 3 — `src/hooks/useEmails.ts` (`useSendEmail`)

Change payload type to `{ toEmail; subject; bodyHtml }` and forward as-is to the edge function.

## Fix 4 — `supabase/functions/send-custom-email/index.ts`

1. Accept `bodyHtml` (preferred) with backward-compat fallback to `bodyText`.
2. When `bodyHtml` is provided, send it **verbatim as `html`** to Resend — do NOT wrap, do NOT `\n→<br>`, do NOT escape.
3. Derive `body_text` for the log as a stripped version of `bodyHtml` (`html.replace(/<[^>]+>/g,'').trim()`) so the `emails` table still has a searchable text fallback.
4. Insert into `emails` with both `body_html` (the real HTML) and `body_text` (the stripped version).

## Migration

```sql
ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS provider_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS emails_provider_message_id_key
  ON public.emails(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
```

No new GRANTs / RLS — column is additive on an existing table.

## Out of Scope
- Parts 2–4 of the launch prep.
- Backfilling the 2 empty historical rows per email (can be cleaned manually after deploy if desired — happy to add a one-shot cleanup query on request).
- Resend domain/DNS changes.

## Files Touched
- `supabase/migrations/<new>.sql` (new)
- `supabase/functions/inbound-email/index.ts`
- `supabase/functions/send-custom-email/index.ts`
- `src/components/mailbox/ComposeMailDialog.tsx`
- `src/hooks/useEmails.ts`
