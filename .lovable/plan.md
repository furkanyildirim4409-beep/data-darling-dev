

## Supreme Court — Dispute Dashboard (Part 1 of 3)

### Overview

Create a "Yüce Divan" page listing disputed challenges, with a data hook, UI page, and routing/navigation integration.

### Important Schema Corrections

The user's plan has a few column name mismatches that must be corrected:
- Join uses `challenged_id` — actual column is **`opponent_id`** → fix the Supabase join to `profiles!opponent_id`
- References `bio_coins_reward` — actual column is **`wager_coins`**
- References `challenged_value` — actual column is **`opponent_value`**

### RLS Consideration

The `challenges` table has no coach-specific RLS policy. Current policies only allow challenger/opponent users and completed-status public reads. Coaches cannot query `status = 'disputed'` challenges unless they are a participant.

**Options:**
1. Add an RLS policy for coaches (requires migration)
2. Query via an edge function with service role

We should add an RLS policy so coaches can view disputed challenges for their athletes. This requires a migration:

```sql
CREATE POLICY "Coaches can view disputed challenges"
ON public.challenges
FOR SELECT
TO authenticated
USING (
  status = 'disputed' AND (
    is_coach_of(challenger_id) OR is_coach_of(opponent_id)
  )
);
```

---

### Changes

| File | Change |
|------|--------|
| **Migration** | Add RLS policy for coaches to view disputed challenges |
| `src/hooks/useDisputes.ts` | **New** — fetch disputed challenges with double profile join |
| `src/pages/Disputes.tsx` | **New** — dispute dashboard with skeleton loading, empty state, and card grid |
| `src/App.tsx` | Add `/disputes` route inside MainLayout |
| `src/components/layout/AppSidebar.tsx` | Add "Yüce Divan" nav item with `Scale` icon |

---

### 1. Migration — RLS Policy

Allow coaches to SELECT disputed challenges where they coach either participant.

### 2. `src/hooks/useDisputes.ts`

```typescript
const { data, error } = await supabase
  .from("challenges")
  .select('*, challenger:profiles!challenger_id(full_name, avatar_url), opponent:profiles!opponent_id(full_name, avatar_url)')
  .eq("status", "disputed")
  .order("created_at", { ascending: false });
```

Map results to flatten `challengerName`, `challengerAvatar`, `opponentName`, `opponentAvatar` using safe access (`c.challenger?.full_name`).

### 3. `src/pages/Disputes.tsx`

- Header with `Scale` icon and title "Yüce Divan"
- Loading: 6-item skeleton grid
- Empty state: centered `Scale` icon + "Adalet sağlandı. Şu an itiraz edilen bir düello yok."
- Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`): dispute cards
- Each card: challenge type header + `wager_coins` badge, VS layout (challenger avatar/name/value vs opponent avatar/name/value), "İncele ve Karar Ver" button (console.log for now)

### 4. `src/App.tsx`

Add `<Route path="/disputes" element={<Disputes />} />` inside the MainLayout block.

### 5. `src/components/layout/AppSidebar.tsx`

Add nav item after alerts: `{ path: "/disputes", label: "Yüce Divan", icon: Scale }`. Import `Scale` from lucide-react.

