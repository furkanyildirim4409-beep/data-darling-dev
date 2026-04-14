

## Epic 7 - Part 3: Missing Username Fallback Alert

### Summary
Create a persistent alert component that forces legacy coaches (who have no `username`) to claim one before using the email system. Mount it at the top of the Command Center dashboard.

### Step A — Create `UsernameFallbackAlert.tsx`
**File: `src/components/dashboard/UsernameFallbackAlert.tsx`**

- Uses `useAuth()` to get `profile`, `isSubCoach`, `user`, `refreshProfile`
- Returns `null` if: no profile, role !== 'coach', or username is already set
- **Sub-coach without username**: Read-only info card explaining they need their head coach to assign one
- **Main coach without username**: Warning card with:
  - Title: "Kurumsal E-Posta Adresinizi Belirleyin"
  - Username input with `/^[a-z0-9]+$/` validation, min 3, max 20 chars
  - Debounced uniqueness check against `profiles` table
  - Live preview: `username@dynabolic.co`
  - "Kaydet ve Aktifleştir" button

### Step B — Update Mutation
- On save: `supabase.from('profiles').update({ username }).eq('id', user.id)`
- Handle unique constraint errors gracefully
- On success: call `refreshProfile()` to update context (alert auto-hides), show success toast

### Step C — Mount in Dashboard
**File: `src/pages/CommandCenter.tsx`**
- Import and render `<UsernameFallbackAlert />` at the very top of the content area (before the heading)

### Files
| File | Action |
|------|--------|
| `src/components/dashboard/UsernameFallbackAlert.tsx` | CREATE |
| `src/pages/CommandCenter.tsx` | EDIT — add import + mount |

