

## The Verdict Engine — Part 3 of 3

### Overview

Create a Postgres RPC function to atomically resolve disputes (update status, assign winner, transfer Bio-Coins), a React Query mutation hook, and wire the modal buttons.

### Changes

| File | Change |
|------|--------|
| **Migration** | `resolve_dispute` RPC function |
| `src/hooks/useResolveDispute.ts` | **New** — mutation hook calling `supabase.rpc('resolve_dispute', ...)` |
| `src/components/disputes/DisputeResolutionModal.tsx` | Wire verdict buttons to mutation, add loading/disabled states |

### 1. Migration — `resolve_dispute` RPC

```sql
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_challenge_id UUID,
  p_winner_id UUID DEFAULT NULL,
  p_is_draw BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_loser_id UUID;
BEGIN
  SELECT * INTO v_challenge FROM challenges
  WHERE id = p_challenge_id AND status = 'disputed'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found or not disputed'; END IF;

  IF p_is_draw THEN
    UPDATE challenges SET status = 'completed', winner_id = NULL WHERE id = p_challenge_id;
    RETURN TRUE;
  END IF;

  -- Determine loser
  IF p_winner_id = v_challenge.challenger_id THEN
    v_loser_id := v_challenge.opponent_id;
  ELSIF p_winner_id = v_challenge.opponent_id THEN
    v_loser_id := v_challenge.challenger_id;
  ELSE
    RAISE EXCEPTION 'Invalid winner_id';
  END IF;

  -- Update challenge
  UPDATE challenges SET status = 'completed', winner_id = p_winner_id WHERE id = p_challenge_id;

  -- Transfer coins (only if wager > 0)
  IF v_challenge.wager_coins > 0 THEN
    UPDATE profiles SET bio_coins = GREATEST(COALESCE(bio_coins, 0) - v_challenge.wager_coins, 0)
    WHERE id = v_loser_id;

    UPDATE profiles SET bio_coins = COALESCE(bio_coins, 0) + v_challenge.wager_coins
    WHERE id = p_winner_id;
  END IF;

  RETURN TRUE;
END;
$$;
```

Key details: `SECURITY DEFINER` to bypass RLS for coin transfers. `FOR UPDATE` row lock prevents race conditions. `GREATEST(..., 0)` prevents negative balances.

### 2. `src/hooks/useResolveDispute.ts`

- `useMutation` calling `supabase.rpc('resolve_dispute', { p_challenge_id, p_winner_id, p_is_draw })`
- On success: invalidate `["disputes"]`, show `toast.success("Karar verildi! ⚖️")`, call `onSuccess` callback
- On error: `toast.error("Karar verilemedi")`
- Returns `{ resolveDispute: mutate, isResolving: isPending }`

### 3. `DisputeResolutionModal.tsx`

- Import and use `useResolveDispute` with `onSuccess: onClose`
- Wire 3 buttons:
  - "Sol Kazandı" → `resolveDispute({ p_challenge_id: dispute.id, p_winner_id: dispute.challenger_id, p_is_draw: false })`
  - "Berabere" → `resolveDispute({ p_challenge_id: dispute.id, p_winner_id: null, p_is_draw: true })`
  - "Sağ Kazandı" → `resolveDispute({ p_challenge_id: dispute.id, p_winner_id: dispute.opponent_id, p_is_draw: false })`
- Add `disabled={isResolving}` to all 3 buttons

