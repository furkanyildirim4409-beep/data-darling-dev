# Coach Packages Studio Manager

The `coaching_packages` table already exists in Supabase with the right schema (title, description, price, duration_months, features JSONB, is_active, coach_id) and proper RLS. No migration needed.

## Files to create

### 1. `src/hooks/useCoachPackages.ts`
React Query hook exposing:
- `packages` — list of the logged-in coach's packages (ordered by created_at desc)
- `isLoading`
- `createPackage(input)` — insert with `coach_id = auth user id`
- `updatePackage(id, input)` — update own row
- `deletePackage(id)` — delete own row
- `togglePackageActive(id, is_active)`

Uses `supabase` client, invalidates `['coaching-packages', coachId]` on mutations, surfaces errors via `toast`.

### 2. `src/components/business/CoachingPackagesManager.tsx`
Cyberpunk-glass section:
- Header row: H2 "Koçluk Paketlerim" + subdued count + green `Plus` button "Yeni Paket Ekle".
- Empty state with `Coins` icon when no packages.
- Responsive grid (`md:grid-cols-2 xl:grid-cols-3`) of package cards:
  - `bg-white/[0.01] border border-white/5 rounded-2xl p-4` (uses existing `glass` class for parity).
  - Title + active/inactive `Badge`.
  - Price badge `X ₺ / Ay` (formatted via `toLocaleString("tr-TR")`) + duration chip (`{duration_months} Ay`).
  - Description (muted).
  - Feature list rendered with `Check` icons (emerald).
  - Footer actions: `Edit` (ghost) and `Trash` (destructive ghost) buttons; delete confirmed via `AlertDialog`.
- Permission gate: only render create/edit/delete controls when `canManageFinances` from `usePermissions` is true (read-only view otherwise, matching existing Business page pattern).

### 3. `src/components/business/PackageFormDialog.tsx`
Controlled `<Dialog>` used for both create and edit:
- Props: `open`, `onOpenChange`, `initialPackage?`, `onSubmit(values)`.
- Fields:
  - Paket Adı — `Input`
  - Fiyat (₺) — numeric `Input`
  - Süre (Ay) — `Select` with options 1 / 3 / 6 / 12
  - Açıklama — `Textarea`
  - Paket Özellikleri — text input + add button; added items render as removable chips (`Pill` icon prefix, `X` to remove). Stored as `string[]` and persisted to `features` JSONB.
- Validates required fields (title, price > 0, duration) before submit; resets on close.

## File to update

### `src/pages/Business.tsx`
Import and render `<CoachingPackagesManager />` as a full-width standalone section directly below the existing Main Grid (after the payments + schedule grid), preserving current spacing (`space-y-6`).

## Technical notes
- All Lucide icons used: `Pill`, `Check`, `Trash2`, `Edit`, `Plus`, `Coins`.
- Coach id sourced from `useAuth()` (existing `AuthContext`).
- No backend/schema changes — table + RLS already permit owner CRUD.
- Sub-coach access follows existing `canManageFinances` permission to stay consistent with the rest of the Business page.
