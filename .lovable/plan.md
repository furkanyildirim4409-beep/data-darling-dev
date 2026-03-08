

# Fix AuthContext and Login Role-Based Redirection

## Task 1: Update `src/contexts/AuthContext.tsx`

### Changes:
- **Update `Profile` interface** to: `{ id, email, full_name, role, avatar_url, coach_id, created_at }`
- **Remove `fetchRole` function** entirely (lines 47-54)
- **Update `fetchProfile`** to cast `data` as `any` and extract `role` from it, calling `setRole(p.role)` alongside `setProfile()`
- **Remove all `fetchRole()` calls** from `onAuthStateChange` (line 66) and `getSession` (line 81)
- **Update `role` state type** from `'admin' | 'coach' | 'athlete'` to `'coach' | 'athlete'`

### Important Note:
The current `profiles` table in Supabase does NOT have `role`, `email`, or `coach_id` columns. A migration will be needed to add these columns. The code will use `as any` cast on the query result to avoid TypeScript errors from the auto-generated types.

## Task 2: Update `src/pages/Login.tsx`

### Changes:
- Destructure `profile` and `signOut` from `useAuth()` in addition to `signIn`
- After successful `signIn`, use a `useEffect` to watch for `profile` state changes
- Add a `pendingLogin` state flag to track when we're waiting for the profile to load
- When profile arrives:
  - If `profile.role === 'coach'` → `navigate('/')`
  - If `profile.role === 'athlete'` → `toast.error("Bu panel sadece Koçlar içindir!")`, call `signOut()`, stay on login
- Import `toast` from `sonner` and `useEffect` from React

## Implementation Order
1. Edit `AuthContext.tsx` — profile interface, remove fetchRole, merge role into fetchProfile
2. Edit `Login.tsx` — add useEffect for role-based redirect after login

