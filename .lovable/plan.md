## Add "📦 Paketler & Abonelikler" tab to StoreManager

Mount a third tab in `src/pages/StoreManager.tsx` with a 2-column layout: the existing `CoachingPackagesManager` on the left, a "Feshedilenler" terminated-athletes roster on the right with a "Fesih Kaldır" action.

### Changes to `src/pages/StoreManager.tsx`

1. **Imports**
   - `CoachingPackagesManager` from `@/components/business/CoachingPackagesManager`
   - `supabase` from `@/integrations/supabase/client`
   - `useQuery`, `useQueryClient`, `useMutation` from `@tanstack/react-query`
   - `Button`, `toast`, `RotateCcw` (lucide)

2. **Add tab trigger** (line ~273, inside `<TabsList>`):
   ```tsx
   <TabsTrigger value="coaching_packages">📦 Paketler & Abonelikler</TabsTrigger>
   ```

3. **Add `<TabsContent value="coaching_packages">`** after the `orders` tab (line ~657):
   ```tsx
   <TabsContent value="coaching_packages" className="mt-0">
     <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
       <div><CoachingPackagesManager /></div>
       <TerminatedAthletesPanel />
     </div>
   </TabsContent>
   ```

4. **New inline component `TerminatedAthletesPanel`** in the same file (kept local to avoid file sprawl for one-screen widget):
   - `useQuery(['terminated-athletes', activeCoachId])` → `profiles` filter:
     ```ts
     supabase
       .from('profiles')
       .select('id, full_name, avatar_url, updated_at')
       .eq('subscription_status', 'terminated')
       .eq('coach_id', activeCoachId)
       .order('updated_at', { ascending: false })
     ```
     `activeCoachId` from `useAuth()` (agency IP rule — sub-coaches see head coach's roster).
   - Render glass card with a scrollable list (max-h, native overflow + `.scrollbar-hide`): avatar, full_name, severance timestamp (tr-TR), and a `Button size="sm"` labeled **Fesih Kaldır**.
   - Empty state: "Feshedilmiş sporcu bulunmuyor." (no mock data — core rule).

5. **Mutation `handleReinstate(athleteId)`**:
   - `supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', athleteId)`
   - On success: `toast.success("Fesih kaldırıldı; sporcu yeniden aktif.")`, invalidate `['terminated-athletes']` and `['athletes']`.
   - On error: toast.error with message.

### Out of scope
- Restoring the previously-cleared `coach_id` / `active_program_id` (terminate sets them null; reinstating subscription doesn't auto-reassign coach — that requires a separate roster-reassign flow).
- Editing the existing two tabs.
- New DB tables/migrations.
