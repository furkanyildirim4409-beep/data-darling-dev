

## Action Button Completed State Polish

### Changes

**`src/pages/Alerts.tsx` (lines 304-310):**
- Replace generic "Çözüldü ✓" with `{action.label}` and a `CheckCircle2` icon
- Update className to success-oriented styling: `border-emerald-500/30 bg-emerald-500/10 text-emerald-400 opacity-80 cursor-not-allowed`
- Import `CheckCircle2` from lucide-react (add to existing import)

**`src/components/athlete-detail/AiHistoryWidget.tsx` (lines 396-408):**
- Same change: replace "Çözüldü ✓" with `{action.label}` and `CheckCircle2` icon
- Update className to match: `border-emerald-500/30 bg-emerald-500/10 text-emerald-400 opacity-80 cursor-not-allowed`
- `CheckCircle2` already imported

### Result
Completed buttons retain their original label (e.g., "D Vitamini Başlat") with a green checkmark icon and success styling, instead of showing the generic "Çözüldü ✓" text.

