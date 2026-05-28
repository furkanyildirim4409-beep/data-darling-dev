## Objective
Add a state-aware "Unfreeze / Reactivate" handler inside `src/pages/AthleteDetail.tsx` that replaces the freeze menu item with an inverse unfreeze action when `subscription_status === 'frozen'`.

## Step A: Imports
- Add `CheckCircle2` to the existing `lucide-react` import block.
- Add `useQueryClient` import from `@tanstack/react-query`.

## Step B: Hook Instantiation
Inside `AthleteDetail` component body, declare:
```typescript
const queryClient = useQueryClient();
```

## Step C: `handleUnfreezeAthlete` Handler
Insert immediately below the existing `submitFreeze` / `submitTerminate` / `submitRefund` handlers:
```typescript
const handleUnfreezeAthlete = async () => {
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      freeze_until: null,
      freeze_reason: null,
    })
    .eq('id', id);

  if (!error) {
    toast.success("Sporcunun aboneliği ve tüm premium özellikleri başarıyla aktifleştirildi!", { icon: "🟢" });
    queryClient.invalidateQueries({ queryKey: ['athlete', id] });
    fetchAthleteData();
  } else {
    toast.error("Abonelik aktifleştirilirken veritabanı senkronizasyon hatası oluştu.");
  }
};
```

## Step D: Dropdown Conditional Toggle
Replace the static freeze `<DropdownMenuItem>` (currently at lines 391-394) inside `<DropdownMenuContent>` with a conditional fork:

```tsx
{athlete?.subscription_status === 'frozen' ? (
  <DropdownMenuItem onClick={handleUnfreezeAthlete} className="text-emerald-400 font-semibold focus:text-emerald-400 focus:bg-emerald-500/10 cursor-pointer">
    <CheckCircle2 className="w-4 h-4 mr-2" /> Aboneliği Aktifleştir / Dondurmayı Kaldır
  </DropdownMenuItem>
) : (
  <DropdownMenuItem onClick={() => setFreezeOpen(true)} className="gap-2 cursor-pointer">
    <Snowflake className="w-4 h-4 text-sky-400" />
    <span>🚨 Üyeliği Dondur</span>
  </DropdownMenuItem>
)}
```

## Step E: Verification
- TypeScript compilation must pass with zero errors.
- No new dependencies required (`@tanstack/react-query` is already in `package.json`).
- All existing freeze/terminate/refund flows remain untouched.

## Out of Scope
- No changes to Supabase RLS, schema, or edge functions.
- No changes to the freeze/terminate/refund dialog implementations.
- No changes to other tabs or child components.