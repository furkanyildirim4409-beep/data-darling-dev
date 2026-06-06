## Goal
Make "Yüce Divan" (`/disputes`) visible and accessible only to users with role `super_admin`. Standard coaches must not see the nav item and cannot reach the page by URL.

## Approach
Use the existing `useAuth()` hook (already exposes `role`). Extend the type to include `'super_admin'`, add a DB migration to allow the new role value on `profiles.role`, then filter the nav item and guard the route.

## Changes

### 1. Database migration
`profiles.role` is currently free text in the DB but typed as `'coach' | 'athlete' | null` in code. No `user_roles` table exists. Since the user confirmed no super-admin panel exists yet, the minimal non-disruptive change is:
- Add a CHECK-free convention: allow `'super_admin'` as a valid value in `profiles.role`. If a CHECK constraint or enum exists, extend it; otherwise no schema change is needed beyond documentation. (We will inspect actual constraint via migration tool and only ALTER if a constraint exists.)

No new table, no RLS change. Existing coaches keep `role = 'coach'`. A super-admin is provisioned manually via SQL by the user later.

### 2. `src/contexts/AuthContext.tsx`
- Widen `Profile.role` and `AuthContextType.role` from `'coach' | 'athlete' | null` to `'coach' | 'athlete' | 'super_admin' | null`.
- No logic change — `fetchProfile` already passes through whatever string the DB returns.

### 3. `src/components/layout/AppSidebar.tsx`
- Import `useAuth`.
- Tag the `/disputes` entry in `navItems` with `superAdminOnly: true`.
- Extend `filteredNavItems` memo to also drop items where `superAdminOnly && role !== 'super_admin'`.

### 4. `src/components/layout/MobileNav.tsx`
- `/disputes` is not currently in the mobile nav list — no change needed, but verify (already verified: absent).

### 5. `src/App.tsx`
- Wrap `<Route path="/disputes" element={<Disputes />} />` with a `SuperAdminRoute` guard (local component, similar to `PermissionRoute`) that reads `role` from `useAuth()` and `<Navigate to="/" replace />` when role is not `super_admin`.

## Out of scope
- Creating a `user_roles` table / `app_role` enum / `has_role()` function. Not needed since the user explicitly wants minimal disruption and there is no super-admin panel yet.
- Server-side RLS hardening on `disputes` data. The page-level + nav-level guard is sufficient for this hotfix; data-layer RLS can be a follow-up if requested.
- Changes to `ProfileContext` (kept as social-profile only, per user's choice).
