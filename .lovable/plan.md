## Refactor `submitRefund` to use `refund_requests`

In `src/pages/AthleteDetail.tsx`, swap the `orders`-insert refund logic for the new isolated `refund_requests` table.

### Changes

1. **Import `useAuth`** alongside existing imports:
   ```ts
   import { useAuth } from "@/contexts/AuthContext";
   ```

2. **Hook up `activeCoachId`** near the existing `queryClient` hook (line ~113):
   ```ts
   const { activeCoachId } = useAuth();
   ```
   Using `activeCoachId` (not `user.id`) honors the agency IP rule — sub-coaches always write under the Head Coach's id.

3. **Replace the insert block (lines 230–242)** inside `submitRefund`:
   ```ts
   if (!activeCoachId) { toast.error("Yetki doğrulanamadı"); return; }
   const { error } = await supabase
     .from("refund_requests")
     .insert({
       athlete_id: id,
       coach_id: activeCoachId,
       requested_amount: Math.abs(Number(amount)),
       reason: refundReason.trim() || refundKind,
       status: "pending",
     });
   ```
   `reason` is `NOT NULL` in the new table — fall back to `refundKind` ("full"/"partial") when the textarea is empty.

4. **Replace the success toast (line 245)**:
   ```ts
   toast.success("İade talebi admin onayına başarıyla sunuldu.", { icon: "⏳" });
   queryClient.invalidateQueries({ queryKey: ["athlete", id] });
   ```

### Out of scope (later parts)
- Admin Board UI for processing `refund_requests`
- Backfill / migration of existing `orders` refund rows
- Disabling the legacy `latestPaidOrderId` gate (kept as-is so the button still requires a paid order to refund)
