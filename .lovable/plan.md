

## Epic 7 - Part 5: Dynamic Outbound Email Engine

### Summary
Update `useSendCoachingInvite` to pass the coach's `username` and update the Edge Function to use `username@dynabolic.co` as the dynamic sender address.

### Step A — Update Frontend Hook
**File: `src/hooks/useSocialMutations.ts`**
- Add `useAuth` import and call it inside `useSendCoachingInvite`
- Add pre-flight check: if `!profile?.username`, show `toast.error("Lütfen davet göndermeden önce Ayarlar sayfasından kullanıcı adınızı belirleyin.")` and throw
- Add `coachUsername: profile.username` to the payload sent to the Edge Function

### Step B — Update Edge Function
**File: `supabase/functions/send-coaching-invite/index.ts`**
- Add `coachUsername` to the destructured payload
- Add validation: return 400 if `coachUsername` is missing
- Change `from` field from hardcoded `'Dynabolic <noreply@dynabolic.co>'` to dynamic: `` `${coachName} <${coachUsername}@dynabolic.co>` ``
- Deploy the updated function

### Files
| File | Action |
|------|--------|
| `src/hooks/useSocialMutations.ts` | EDIT — add auth check + `coachUsername` in payload |
| `supabase/functions/send-coaching-invite/index.ts` | EDIT — accept `coachUsername`, use as dynamic sender |

