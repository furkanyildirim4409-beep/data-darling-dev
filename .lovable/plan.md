

## Integrate Resend Email for Coaching Invites (Epic 6 - Part 3)

### Pre-requisite: Link Resend Connection

The Resend connector "Dynabolic" exists in the workspace but is **not yet linked to this project**. Before writing any code, we must link it so the `RESEND_API_KEY` and `LOVABLE_API_KEY` secrets become available to Edge Functions.

### Plan

#### 1. Link Resend connector to project
Use the connector tool to link the existing "Dynabolic" Resend connection (ID: `std_01kp67a7r8epnvgcxyv517vjmm`) to this project.

#### 2. Create Edge Function (`supabase/functions/send-coaching-invite/index.ts`)
- Standard CORS headers, OPTIONS preflight handler
- Accept POST with `{ coachName, leadName, leadEmail }`
- Validate input (all three fields required)
- Send email via Resend gateway (`https://connector-gateway.lovable.dev/resend/emails`) using `LOVABLE_API_KEY` + `RESEND_API_KEY` headers
- From: `Dynabolic <onboarding@resend.dev>`, professional Turkish HTML body with coach name, CTA button
- Return success/error JSON with CORS headers

#### 3. Add `email` to `useCheckViewerStatus` query (`src/hooks/useSocialMutations.ts`)
- Change `.select("id, coach_id, full_name, avatar_url")` → `.select("id, coach_id, full_name, avatar_url, email")`

#### 4. Add `useSendCoachingInvite` mutation (`src/hooks/useSocialMutations.ts`)
- Accepts `{ coachName, leadName, leadEmail }`
- Calls `supabase.functions.invoke('send-coaching-invite', { body })`
- Success/error toasts

#### 5. Wire UI (`src/components/content-studio/ActiveStoriesDialog.tsx`)
- Expand `selectedLead` state to include `email: string`
- Pass email from `handleViewerClick` → `setSelectedLead`
- Replace dummy `handleSendInvite` with real mutation call using coach's `profile.full_name`
- Add `isPending` loading state to the invite button
- Add `supabase/config.toml` entry: `[functions.send-coaching-invite]` with `verify_jwt = false`

### Files

| File | Action |
|------|--------|
| Resend connector | LINK to project |
| `supabase/functions/send-coaching-invite/index.ts` | CREATE |
| `supabase/config.toml` | MODIFY — add function config |
| `src/hooks/useSocialMutations.ts` | MODIFY — add email to viewer query, add `useSendCoachingInvite` |
| `src/components/content-studio/ActiveStoriesDialog.tsx` | MODIFY — wire real mutation, add email to lead state |

