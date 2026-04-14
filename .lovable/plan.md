

## Epic 7 - Part 2: Agency Username System

### Summary
Add username selection for main coaches during registration and enforce `maincoach.subcoach` dot-notation usernames for sub-coaches created via the Team panel.

### Step A — Register Page: Username Input for Coaches
**File: `src/pages/Register.tsx`**
- Add `username` state field
- Show username input only when `role === 'coach'` and no `inviteToken`
- Validation: `/^[a-z0-9]+$/`, min 3 chars, max 20 chars
- Show helper text: "Bu kullanıcı adı e-posta adresiniz olacak: `username@dynabolic.co`"
- Real-time uniqueness check via `supabase.from('profiles').select('id').eq('username', value)` (debounced)
- Pass `username` in metadata during signUp

**File: `src/contexts/AuthContext.tsx`**
- Update `signUp` function signature to accept optional `username` parameter
- Include `username` in `options.data` metadata

### Step B — Database Trigger Update
**Migration SQL** — Update `handle_new_user()` to extract `username` from metadata:
```sql
username = new.raw_user_meta_data->>'username'
```
With `ON CONFLICT` preserving existing username if already set.

### Step C — Sub-Coach Creation: Agency Username
**File: `src/components/team/AddMemberDialog.tsx`**
- Add `subUsername` state field
- Fetch main coach's username from `useAuth().profile.username`
- Show visual prefix lock: `[coachUsername].` followed by editable input, then `@dynabolic.co`
- Validate sub-part: `/^[a-z0-9]+$/`, min 2 chars
- Concatenate: `finalUsername = coachUsername.subUsername`
- Pass `username` to `createSubCoach.mutateAsync()`

**File: `src/hooks/useCreateSubCoach.ts`**
- Add `username` to `CreateSubCoachInput` interface
- Pass `username` in the Edge Function body

**File: `supabase/functions/create-sub-coach/index.ts`**
- Accept `username` from request body
- Include `username` in `user_metadata` so `handle_new_user` trigger stores it
- Also directly update `profiles.username` via admin client as a fallback

**File: `src/contexts/AuthContext.tsx`**
- Add `username` to the `Profile` interface
- Include it in `fetchProfile` mapping

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Register.tsx` | Add username input with validation + uniqueness check |
| `src/contexts/AuthContext.tsx` | Add `username` to Profile interface and signUp params |
| `src/components/team/AddMemberDialog.tsx` | Add sub-coach username with agency prefix UI |
| `src/hooks/useCreateSubCoach.ts` | Add `username` to mutation input |
| `supabase/functions/create-sub-coach/index.ts` | Pass username in metadata + profile update |
| Migration SQL | Update `handle_new_user()` trigger |

