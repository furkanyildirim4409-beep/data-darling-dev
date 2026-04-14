
## Epic 7 - Part 4: Settings Profile Management for Username

### Summary
Add a username field to the Settings profile section with validation, uniqueness checking, and sub-coach read-only protection. Update the save logic to persist username changes.

### Step A — Add username state and sync
**File: `src/pages/Settings.tsx`**
- Add `username` to `formData` state, initialized from `profile?.username || ""`
- Add `isSubCoach` from `useAuth()`
- Add debounced uniqueness check state (`isCheckingUsername`, `isUsernameAvailable`)
- Sync username from profile in the existing `useEffect`

### Step B — Add username UI in profile section
**File: `src/pages/Settings.tsx`** (after the email field, ~line 341)
- Add a "Kullanıcı Adı" input with `@dynabolic.co` suffix display
- If `isSubCoach`: field is `disabled` with helper text "Alt koç kullanıcı adları yalnızca Baş Antrenör tarafından değiştirilebilir."
- If main coach: editable with live validation feedback (available/taken) and preview "E-posta adresiniz: username@dynabolic.co"
- Validation: `/^[a-z0-9]+$/`, min 3, max 20 chars
- Debounced uniqueness check (400ms) via `supabase.from('profiles').select('id').eq('username', value).neq('id', user.id).maybeSingle()`

### Step C — Update save logic
**File: `src/pages/Settings.tsx`**
- In `handleSaveProfile`, after the RPC call, if username changed: run `supabase.from('profiles').update({ username }).eq('id', user.id)`
- Handle `23505` unique constraint error with a toast
- Note: We use a direct update for username (not the RPC) since `update_own_profile` doesn't have a `_username` param and adding it would be a security concern (username changes need uniqueness validation)

### Files
| File | Action |
|------|--------|
| `src/pages/Settings.tsx` | EDIT — add username field, validation, save logic |

### Notes
- No migration needed — `update_own_profile` RPC is not modified; username is saved via direct `.update()` which is allowed since profiles RLS permits own-row updates
- The uniqueness check excludes the current user's own ID to avoid false "taken" results
