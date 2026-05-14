## Printable Packing Slip & Barcode — Part 4/4

### Goal
Add a print-ready packing slip / shipping label coaches can print directly from the `OrderFulfillmentSheet`. Black & white, minimalist, thermal-printer friendly, with a barcode visual derived from the order ID.

---

### Step A: `PackingSlipPrintView.tsx` (new)

**File:** `src/components/store-manager/PackingSlipPrintView.tsx`

**Props:**
```ts
interface Props {
  order: OrderItem;
  coachName?: string;
}
```

**Structure:** Root `<div id="printable-packing-slip">`. Always rendered when an order is present, but hidden in normal viewing via global print CSS.

**Layout:**
1. **Header band**
   - Left: bold "DYNABOLIC LOGISTICS" wordmark + smaller "Packing Slip / Kargo Fişi"
   - Right: Order date + short order ID (`#ORD-XXXX`)
2. **Barcode block** — Pure SVG generated from order ID:
   - Hash the cleaned order ID into a deterministic series of bar widths (1–3px) across ~80 bars.
   - Render as black `<rect>` elements inside an SVG, with the full UUID printed monospace below.
3. **From / To grid (2 columns)**
   - **Gönderen (From):** Coach name (or "Dynabolic Coach"), system address line.
   - **Alıcı (To):** Customer full name, phone, full address (street, zip, city, province, country).
4. **Contents table** — minimal `<table>` with columns: `#`, `Ürün`, `Adet`. Maps `order.items` (skip price for label simplicity, but include qty totals at bottom).
5. **Footer** — "Toplam Adet: N" + "Bu fiş Dynabolic tarafından üretilmiştir." + reprint timestamp.

**Visual rules (inline styles + classes):**
- Pure black on white. No glass, no neon. `font-family: ui-sans-serif, system-ui`. Strong borders.
- Width capped at `100mm` for thermal-friendly preview, expands to full page in print.

### Step B: Global Print CSS

**File:** `src/index.css` — append a print block:
```css
@media print {
  body * { visibility: hidden; }
  #printable-packing-slip,
  #printable-packing-slip * {
    visibility: visible;
    color: black !important;
    background: white !important;
    box-shadow: none !important;
    border-color: black !important;
  }
  #printable-packing-slip {
    position: absolute;
    left: 0; top: 0;
    width: 100%;
    padding: 16mm;
  }
  @page { margin: 0; }
}

/* Hide the print view during normal browsing */
@media screen {
  #printable-packing-slip { display: none; }
}
```

This guarantees the slip is invisible on screen, visible on print, and overrides the dark theme so output is pure B&W.

### Step C: Trigger in `OrderFulfillmentSheet.tsx`

- Import `Printer` icon and `PackingSlipPrintView`.
- Fetch coach name lazily — pass `order.shipping_address.coachName` if available, otherwise the current authenticated user's display name from `useAuth` (fallback "Dynabolic Coach"). No new DB calls.
- Add a **secondary outline button**: "Kargo Fişi Yazdır" with `<Printer />` icon, placed:
  - For `processing` orders: next to the existing "Kargoya Verildi Olarak İşaretle" submit (use a 2-button row, primary fills, print is `variant="outline"`).
  - For `shipped` / `completed` orders with tracking: appended below the read-only tracking block.
- `onClick` handler:
  ```ts
  const handlePrint = () => {
    // Defer one tick so the hidden node is in DOM before print dialog opens.
    requestAnimationFrame(() => window.print());
  };
  ```
- Mount `<PackingSlipPrintView order={order} coachName={coachName} />` near the bottom of the sheet (still inside the Sheet content). Because of the print CSS, it stays hidden on screen.

### Verification Checklist
- [ ] In normal view, no packing slip is visible anywhere on the page.
- [ ] Clicking "Kargo Fişi Yazdır" opens the browser print dialog.
- [ ] Print preview shows ONLY the packing slip — no app chrome, no sheet, no dark background.
- [ ] All text is black on white (works on a thermal printer).
- [ ] Barcode block renders deterministically per order ID.
- [ ] From / To blocks show correct coach + customer info.
- [ ] Item table lists every order item with quantities.

### Files
- `src/components/store-manager/PackingSlipPrintView.tsx` (new)
- `src/components/store-manager/OrderFulfillmentSheet.tsx` (add button + mount print view)
- `src/index.css` (append `@media print` block)