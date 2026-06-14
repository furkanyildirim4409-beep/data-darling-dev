## Plan: Fix Subscription Tier Button Labels

### Problem
The tier buttons on the Settings → Abonelik page do not show the correct labels when the user has no active subscription. Currently they show the per-tier `cta` text ("Planı Satın Al", "Planı Yükselt", etc.) instead of all showing "Planı Satın Al".

### Desired Behavior
- **No active subscription:** every button says **"Planı Satın Al"** (normal/clickable)
- **Has active subscription:**
  - Current tier → **"Aktif Plan"** (muted, disabled)
  - Lower-priced tier → **"Planı Satın Al"** (muted, disabled)
  - Higher-priced tier → **"Planı Yükselt"** (normal, clickable)

### Change
Edit `src/pages/Settings.tsx` in the button text conditional (around line 614–622).

Current:
```tsx
: isCurrent ? "Aktif Plan"
: isLowerTier ? "Planı Satın Al"
: hasActiveSub ? "Planı Yükselt"
: tier.cta
```

New:
```tsx
: isCurrent ? "Aktif Plan"
: isLowerTier ? "Planı Satın Al"
: hasActiveSub ? "Planı Yükselt"
: "Planı Satın Al"
```

No other changes required; the styling/disabled logic already behaves correctly.