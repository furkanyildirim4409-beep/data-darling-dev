# Mailbox UI Overhaul + Reply/Forward Engine (Part 2/4)

## 1. Layout Overhaul — `src/pages/Mailbox.tsx`

Current shell is `flex h-[calc(100vh-4rem)] overflow-hidden` with rigid widths (`w-60` sidebar, `w-[350px]` list). On 1280–1440 MacBook resolutions this leaves the reading pane starved.

Changes:
- Outer wrapper: `flex h-[calc(100vh-theme(spacing.16))] w-full max-w-[1600px] mx-auto overflow-hidden bg-background`.
- Folder sidebar: keep `w-60 shrink-0` but add `border-r` separation untouched (already fine).
- Email list column: switch from fixed `md:w-[350px]` to fluid `min-w-[300px] w-1/3 max-w-[400px] shrink-0`.
- Reading pane wrapper: `flex-1 flex flex-col bg-background min-w-0`.
- Reading pane header: `p-6 lg:p-8 border-b` with subject as `text-xl lg:text-2xl font-semibold`.
- Reading pane body ScrollArea: inner padding `p-6 lg:p-8`, content wrapped in `max-w-3xl` for readable measure.
- Mobile (`!isMobile` branch unchanged) keeps full-width behavior.

## 2. Reply / Forward Engine

### `src/components/mailbox/ComposeMailDialog.tsx`

Extend props with an optional `prefill`:

```ts
export interface ComposePrefill {
  toEmail?: string;
  subject?: string;
  bodyHtml?: string;  // pre-built HTML including quoted original
}
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: ComposePrefill;
}
```

- On `open` transitioning to `true` AND `prefill` present, seed local state from `prefill` (use `useEffect([open, prefill])`). The athlete picker resets to "Manuel e-posta gir" when a prefill recipient is provided so the address field is editable.
- On `open=false`, clear the prefill-applied flag so the next non-prefill open shows a fresh form.
- Template selector remains available; selecting one overwrites the prefill body (acceptable — user-initiated).

### `src/pages/Mailbox.tsx` — Reading-pane header buttons

Add two buttons in the reading-pane header row (next to the subject, right-aligned on desktop):
- **↩️ Yanıtla** → builds prefill from `selectedEmail.from_email`/`subject`/`body_html|body_text`.
- **➡️ İlet** → builds prefill with blank recipient.

Helpers (inline in `Mailbox.tsx`):

```ts
function quoteOriginal(email: Email): string {
  const meta = `<p>${new Date(email.created_at).toLocaleString('tr-TR')} tarihinde ` +
               `${email.from_email} şunu yazdı:</p>`;
  const body = email.body_html?.trim()
    ? email.body_html
    : `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(email.body_text || '')}</pre>`;
  return `<p><br></p><hr/><p><strong>--- Orijinal Mesaj ---</strong></p>${meta}<blockquote style="border-left:3px solid #ccc;margin:0;padding-left:12px;color:#555">${body}</blockquote>`;
}
function withPrefix(prefix: 'Re' | 'Fwd', subject: string | null) {
  const s = subject || '';
  const re = new RegExp(`^\\s*${prefix}:`, 'i');
  return re.test(s) ? s : `${prefix}: ${s || '(Konu yok)'}`;
}
```

`handleReply`:
```ts
setComposePrefill({
  toEmail: selectedEmail.from_email,
  subject: withPrefix('Re', selectedEmail.subject),
  bodyHtml: `<p></p>${quoteOriginal(selectedEmail)}`,
});
setComposeOpen(true);
```

`handleForward`:
```ts
setComposePrefill({
  toEmail: '',
  subject: withPrefix('Fwd', selectedEmail.subject),
  bodyHtml: `<p></p>${quoteOriginal(selectedEmail)}`,
});
setComposeOpen(true);
```

State additions: `const [composePrefill, setComposePrefill] = useState<ComposePrefill | undefined>();` cleared on dialog close via `onOpenChange`.

The buttons appear in both inbound and outbound reading panes; for outbound the "Yanıtla" target becomes the original `to_email` instead of `from_email`. Logic: `replyTarget = activeTab === 'inbound' ? from_email : to_email`.

## Out of Scope
- Threading / conversation grouping.
- CC / BCC fields.
- Attachments (Resend inbound webhook does not surface them in the current pipeline).
- Parts 3–4 of the launch prep.

## Files Touched
- `src/pages/Mailbox.tsx` — layout + Reply/Forward buttons + prefill state.
- `src/components/mailbox/ComposeMailDialog.tsx` — `prefill` prop + seeding effect.
