## Wire "Fesih Kaldır" reinstate flow

Align both surfaces to the same lifecycle mutation: set `subscription_status='active'` AND clear `active_program_id`, with consistent toast + cache invalidation.

### A. `src/pages/AthleteDetail.tsx`

1. **New handler `handleRemoveTermination`** placed next to `handleUnfreezeAthlete` (~line 274):
   ```ts
   const handleRemoveTermination = async () => {
     if (!id) return;
     const { error } = await supabase
       .from('profiles')
       .update({ subscription_status: 'active', active_program_id: null } as any)
       .eq('id', id);
     if (!error) {
       haptic();
       toast.success("Fesih başarıyla kaldırıldı! Sporcu hesabı ve mağaza erişimi anında aktifleştirildi.", { icon: "🟢" });
       queryClient.invalidateQueries({ queryKey: ['athletes'] });
       queryClient.invalidateQueries({ queryKey: ['athlete', id] });
       fetchAthleteData();
     } else {
       toast.error("Fesih kaldırılamadı: " + error.message);
     }
   };
   ```

2. **Dropdown menu (lines 414–433)** — expand to handle three states:
   - `terminated` → single emerald **"♻️ Fesih Kaldır"** item calling `handleRemoveTermination`, plus separator and the existing terminate is hidden (already gone since they're terminated).
   - `frozen` → existing unfreeze item (unchanged).
   - else → freeze / refund / terminate trio (unchanged).
   
   Refund + Terminate items remain visible only when **not** terminated (avoid double-terminating or refunding a closed account).

### B. `src/pages/StoreManager.tsx` — `TerminatedAthletesPanel`

Update the existing `reinstate` mutation:
- Add `active_program_id: null` to the update payload.
- Update success toast to: `"Fesih başarıyla kaldırıldı! Sporcu hesabı ve mağaza erişimi anında aktifleştirildi."` with `{ icon: "🟢" }`.
- Add `queryClient.invalidateQueries({ queryKey: ['athlete', id] })` per row alongside the existing two invalidations.

### Out of scope
- Restoring `coach_id` (terminate nulled it; re-linking requires explicit roster flow).
- Backend triggers or RPC wrappers — direct table update is sufficient under existing RLS.
- New UI in any other page.
