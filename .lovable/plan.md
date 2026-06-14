# Team UI Overhaul, Permission Expansion & Inactive Blocker (Part 1/4)

## 1. Database Prep — Add `is_active` to `profiles`

Migration: add `profiles.is_active boolean not null default true`. Backfill existing rows to `true`. No RLS changes (existing self-update RPC already whitelists allowed fields; this column is set only by the head coach via the toggle handler below).

For sub-coach team rows, we continue to use the existing `team_members.status` field (`'active' | 'inactive'`) which already gates RLS via `is_active_team_member_of`. The toggle writes to **both** sources when a `member.userId` exists:
- `team_members.status` → `'inactive'` / `'active'`
- `profiles.is_active` → `false` / `true` (drives the blocker)

## 2. Permission Schema Expansion — `src/types/permissions.ts`

Add three high-level UX flags to `GranularPermissions` covering the requested varieties (the rest map to existing groups):

| Requested UI label | Backing flag(s) |
|---|---|
| Finansal Verileri Görme | `finances.view` ✅ already exists |
| Program Yazma | `workouts.create` ✅ already exists |
| E-Ticaret Yönetimi | `store.manage` ✅ already exists |
| Şablon Düzenleme | **NEW** `templates.edit` |
| Sadece Kendi Sporcularını Görme | **NEW** `athletes.scopeOwnOnly` |

Updates:
- Extend `GranularPermissions.athletes` with `scopeOwnOnly: boolean`.
- Add `templates: { view: boolean; edit: boolean }` group.
- Extend `FlatPermissions` with `canEditTemplates`, `canViewTemplates`, `canViewOnlyAssignedAthletes`.
- Update `ALL_TRUE`, `ALL_FALSE`, `LIMITED`, `flattenPermissions` accordingly. `LIMITED` defaults: `templates.view=true, edit=false`, `athletes.scopeOwnOnly=true`.
- `PermissionMatrix` gets two new rows: a "Şablon" group (View/Edit) and a single switch under Athletes for "Sadece kendi sporcularını görsün".

## 3. Drawer Layout Reconstruction — `MemberProfileDrawer.tsx`

### Assignments tab
Replace the inner Radix `<ScrollArea>` with a native `div` so the list visually fills to the bottom of the drawer:

```
<TabsContent value="assignments" className="flex-1 flex flex-col mt-4 overflow-hidden">
  {/* search + counter */}
  <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-2"> … </div>
  <div className="pt-3 border-t border-border"> Save button </div>
</TabsContent>
```

### Permissions tab
Reflow to `flex flex-col items-start justify-start space-y-6`. Move the **Yetki Şablonu** selector to the very top (above the edit-toggle row). Edit button moves to a right-aligned strip below the template selector. Replace inner Radix `<ScrollArea>` with native scroll for the matrix.

### History tab
Same treatment: `flex flex-col items-start justify-start space-y-6` outer, native scroll inner. Each log row gets `w-full`.

### General tab — Status kill switch
Add a new bordered card at the bottom of the General tab:

```
<div className="rounded-xl border border-border bg-background/50 p-4 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium">Kullanıcı Durumu (Aktif/İnaktif)</p>
    <p className="text-xs text-muted-foreground">Devre dışı bırakıldığında kullanıcı uygulamaya giremez.</p>
  </div>
  <Switch checked={isActive} onCheckedChange={handleToggleActive} />
</div>
```

**Visibility gate:** rendered only when the logged-in user is the head coach owner of this member. Concretely: `profile?.role === 'coach' && !isSubCoach` (sub-coaches identified by their own `team_members` row). Use the existing `useAuth().profile` plus a small `useIsHeadCoach()` derivation (already implicit via `role === 'coach'` and absence of `team_members.user_id = auth.uid()`). Toggle dispatches a mutation that writes `team_members.status` and `profiles.is_active` (when `userId` present), then invalidates `["team-members"]`.

## 4. Inactive Blocker — `MainLayout.tsx`

Inside `MainLayout`, read `profile` from `useAuth()`. If `profile?.is_active === false`, **return the blocker only** — no sidebar, no topbar, no `<Outlet />`:

```
<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f] text-foreground">
  <div className="relative flex flex-col items-center gap-6 max-w-md px-8 text-center">
    <div className="absolute inset-0 -z-10 bg-destructive/20 blur-3xl rounded-full" />
    <div className="w-20 h-20 rounded-full border-2 border-destructive/60 bg-destructive/10 flex items-center justify-center shadow-[0_0_60px_hsl(var(--destructive)/0.6)]">
      <Lock className="w-10 h-10 text-destructive animate-pulse" />
    </div>
    <h1 className="text-2xl font-semibold">Hesap Devre Dışı</h1>
    <p className="text-muted-foreground">Kullanıcınız aktif değil. Lütfen ana koçunuz ile görüşün.</p>
    <Button variant="destructive" onClick={signOut}>Çıkış Yap</Button>
  </div>
</div>
```

Since this short-circuits before `<Outlet />`, it is route-proof: any URL the user navigates to still mounts `MainLayout` first and is intercepted. `ProtectedRoute` continues handling the unauthenticated case earlier in the tree.

## Files Touched

- **Migration:** `profiles.is_active boolean default true`.
- `src/types/permissions.ts` — extend granular + flat schemas.
- `src/components/team/PermissionMatrix.tsx` — add Templates group and "Sadece kendi sporcularını görsün" row.
- `src/components/team/MemberProfileDrawer.tsx` — layout reflow, kill-switch card, mutation.
- `src/hooks/useTeam.ts` — extend `useUpdateTeamMember` (or add `useSetMemberActive`) to write `team_members.status` + `profiles.is_active`.
- `src/components/layout/MainLayout.tsx` — full-screen blocker.

## Out of Scope

- Owner role above head coach (none exists in this app — head coach is the owner).
- Reactivation invites/emails.
- Parts 2–4 of launch prep.
