## Part 2/3 — Business dashboard surgical cleanup

Single file: `src/pages/Business.tsx`. Deterministic edits, no behavior changes.

### A. Remove the Payout Desk
- Delete the `<PayoutDesk payments={payments} />` render (currently inside the left column of the main grid).
- Drop the `PayoutDesk` import. Keep `PayoutDesk.tsx` on disk (unused) so future re-introduction is trivial.

### B. Re-map the 4 StatCards (order + titles + values)

| # | Title | Value | Icon | Variant |
|---|---|---|---|---|
| 1 | `Gelir` | `fmtTRY(metrics?.total_revenue ?? 0)` | `DollarSign` | `success` |
| 2 | `Aktif Sporcular` | `String(metrics?.active_athletes ?? 0)` | `Users` | `default` |
| 3 | `Hakediş` | `fmtTRY(metrics?.pending_custom_revenue ?? 0)` | `CreditCard` | `pending>0 ? "warning" : "default"` |
| 4 | `Sonraki Ödeme Günü` | computed next 1st/15th, fallback `"15 Haz"` | `Calendar` | `default` |

Next-payout helper (local, inline):
```ts
const nextPayoutLabel = () => {
  const now = new Date();
  const d = now.getDate();
  const target = d < 15 ? new Date(now.getFullYear(), now.getMonth(), 15)
                        : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return target.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};
```

E-Ticaret card is removed entirely. ShoppingBag import dropped.

### C. Donut chart colors
Update `REVENUE_COLORS`:
```ts
const REVENUE_COLORS = {
  packages: "#10B981", // emerald — brand primary
  store:    "#F97316", // orange — brand accent
};
```
Subtitle under "Gelir Dağılımı" → `"Tüm zamanlar — koçluk paketleri ve e-ticaret kırılımı"` so the legend/tooltip context reads as all-time.

### Out of scope
- No changes to `PayoutDesk.tsx`, `useBusinessMetrics`, or the payments list / today's schedule sections.
- No backend changes.