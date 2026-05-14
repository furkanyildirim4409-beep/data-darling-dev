## Order Fulfillment & Tracking Sheet — Part 3/4

### Goal
When a coach clicks an order card in `StoreOrdersList`, a detailed fulfillment sheet slides in showing customer info, a packing list, and (for `processing` orders) a tracking input form.

---

### Step A: Create `OrderFulfillmentSheet.tsx`

**File:** `src/components/store-manager/OrderFulfillmentSheet.tsx` (new)

**UI Type:** shadcn `<Sheet>` (right-side slide-in).

**Props:**
```ts
interface OrderItem {
  id: string; items: any; total_price: number; total_coins_used: number;
  status: string; created_at: string; order_type: string;
  external_reference_id: string | null; shipping_address: any;
  tracking_number: string | null; tracking_url: string | null;
  carrier_name: string | null; updated_at: string; expires_at: string | null;
}
interface Props {
  order: OrderItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Sections inside the sheet:**
1. **Header** — Order ID (`#ORD-...`) + StatusBadge + close trigger.
2. **Customer Info Block** — Glass card with:
   - Full name, phone, email from `shipping_address`
   - Full address: street + zip, city, country
3. **Packing List Block** — Glass card with:
   - Map `order.items` (expect JSONB array with `title`, `quantity`, `price`, `image`).
   - Render thumbnail, title, qty × price subtotal.
4. **Totals Block** — `total_coins_used` (if >0) + `total_price` bold.
5. **Fulfillment Action Block** — Only visible when `status === 'processing'`:
   - Input: "Kargo Takip No" (tracking_number)
   - Input: "Kargo Takip Linki (opsiyonel)" (tracking_url)
   - Button: "Kargoya Verildi Olarak İşaretle" (primary, with Loader2 when mutating)
6. **Read-Only Tracking Display** — When status is `shipped` or `completed` and `tracking_number` exists, show the number and a link icon to open `tracking_url`.

**Mutation logic (inline, no separate hook needed for now):**
- Use `useState` for `trackingNumber`, `trackingUrl`, and `isSubmitting`.
- On submit: call `supabase.from('orders').update({ status: 'shipped', tracking_number: trackingNumber.trim(), tracking_url: trackingUrl.trim() || null }).eq('id', order.id)`.
- On success: `toast.success("Sipariş başarıyla kargolandı!")`, call `onOpenChange(false)`, invalidate query cache via `queryClient.invalidateQueries({ queryKey: ['store-orders'] })`.
- On error: `toast.error("İşlem başarısız: " + error.message)`.

**Styling:** Matches existing dark-glass theme. Uses `bg-background/40 backdrop-blur-md border border-white/5` cards inside the sheet.

### Step B: Update `StoreOrdersList.tsx`

**File:** `src/components/store-manager/StoreOrdersList.tsx`

- Add `useState<OrderItem | null>(null)` for `selectedOrder`.
- Add `useState(false)` for `sheetOpen`.
- Wrap each order card with `cursor-pointer` and `onClick` that sets `selectedOrder` and opens sheet.
- Import and render `<OrderFulfillmentSheet order={selectedOrder} open={sheetOpen} onOpenChange={setSheetOpen} />` at bottom of component.

### Verification Checklist
- [ ] Clicking an order card opens the sheet with correct data.
- [ ] Customer block shows full name, phone, email, full address.
- [ ] Packing list shows product images, titles, quantities, and prices.
- [ ] For `processing` orders, tracking inputs and submit button appear.
- [ ] Submitting successfully updates DB status to `shipped`, shows toast, closes sheet.
- [ ] For `shipped`/`completed` orders, tracking info is shown read-only.
- [ ] No build errors.

### Files to Edit
- `src/components/store-manager/OrderFulfillmentSheet.tsx` (new)
- `src/components/store-manager/StoreOrdersList.tsx`