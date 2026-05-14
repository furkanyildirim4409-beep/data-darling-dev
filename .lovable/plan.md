## E-Commerce Order List Dashboard — Part 2/4: `StoreOrdersList` Component

### Goal
Replace the placeholder in the Orders tab with a premium, scannable order list that matches the existing cyberpunk-dark glass aesthetic.

---

### Step A: Create `StoreOrdersList.tsx`

**File:** `src/components/store-manager/StoreOrdersList.tsx` (new)

**Props:**
```ts
interface OrderItem {
  id: string;
  user_id: string | null;
  items: any[];
  total_price: number;
  total_coins_used: number;
  status: string;
  created_at: string;
  order_type: string;
  external_reference_id: string | null;
  shipping_address: any;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier_name: string | null;
  updated_at: string;
  expires_at: string | null;
}

interface Props {
  orders: OrderItem[];
  isLoading?: boolean;
}
```

**Layout per row (glass card):**
- Full-width card with `glass rounded-xl border border-border p-4` styling.
- Grid: `grid-cols-[1fr_1fr_1fr_auto]` on desktop, stacking on mobile.
- **Left Col:**
  - Shortened order ID: `#ORD-{id.slice(0,4).toUpperCase()}`
  - Date: formatted as `14 Mayıs 2026, 21:50` (Turkish locale, `new Date(created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })`)
- **Mid Col:**
  - Customer: `{shipping_address?.firstName ?? ''} {shipping_address?.lastName ?? ''}` (fallback: "Bilinmeyen Müşteri")
  - City/District: `{shipping_address?.city ?? ''}` / `{shipping_address?.province ?? ''}`
- **Right Col:**
  - Total: `₺{total_price.toLocaleString('tr-TR')}` bold
  - Status badge via `Badge` with color mapping:
    - `processing` → Blue badge with subtle glow ("Yeni Sipariş - Hazırlanıyor")
    - `shipped` → Purple badge ("Kargolandı")
    - `completed` → Emerald/Success badge ("Teslim Edildi")
    - fallback → Muted badge with raw status text

**Empty State:**
- When `orders.length === 0`, render a centered glass card with `Package` icon and "Henüz sipariş bulunmuyor" message.

**Loading State:**
- When `isLoading === true`, render 3 skeleton rows using the `Skeleton` component.

### Step B: Integrate into `StoreManager.tsx`

**File:** `src/pages/StoreManager.tsx`

- Import `StoreOrdersList` and `useStoreOrders`.
- Inside the `orders` tab `<TabsContent>`, replace the placeholder `<div id="orders-container">` with:
  ```tsx
  <StoreOrdersList orders={orders} isLoading={isOrdersLoading} />
  ```
- Call `useStoreOrders()` at component top level (before return).
- Maintain `canManageStore` guard: if the user cannot manage store, show the existing permission block inside the Products tab, but the Orders tab should remain visible (read-only orders list).

### Verification Checklist
- [ ] Component renders a glass card for each order with correct ID, date, customer name, city, total, and status badge.
- [ ] `processing` status shows blue badge, `shipped` shows purple, `completed` shows emerald.
- [ ] Empty state and loading skeletons work correctly.
- [ ] Turkish date formatting is correct.
- [ ] No build errors; all imports resolve.

### Files to Edit
- `src/components/store-manager/StoreOrdersList.tsx` (new)
- `src/pages/StoreManager.tsx` (replace orders placeholder with component)