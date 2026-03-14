

## Plan: Enhanced Program Cards UI

### Changes to `ProgramTab.tsx` (lines 315-367)

Replace the compact list rows with larger, visually distinct program cards in a vertical stack:

**Selected card**: Glowing primary border (`border-primary glow-lime`), primary-tinted background, larger icon with primary color
**Unselected card**: Subtle border, hover effect with `glass-hover`

Each card will be bigger (`p-5` instead of `p-4`) with:
- Larger icon area (`w-12 h-12`)
- Program title in `text-base font-bold`
- Badges row showing: difficulty, target goal, duration/days if available — using colored Badge variants
- Description snippet if exists (1-line truncated)
- "Kaldır" button stays on the right

```text
┌─ border-primary + glow-lime ─────────────────────┐
│  🏋️  HYPERTROPHY PROGRAM                [Kaldır] │
│      ┌──────────┐ ┌──────────┐ ┌────────┐        │
│      │Orta Seviye│ │Kas Geliş.│ │4 gün/hf│        │
│      └──────────┘ └──────────┘ └────────┘        │
│      Kas kütlesi artırma odaklı program...       │
└──────────────────────────────────────────────────┘
                    ↕ gap-3
┌─ border-border ──────────────────────────────────┐
│  🏋️  AI YAĞ YAKIM PROGRAMI              [Kaldır] │
│      ┌──────────┐ ┌──────────┐                   │
│      │İleri     │ │Yağ Yakımı│                   │
│      └──────────┘ └──────────┘                   │
└──────────────────────────────────────────────────┘
```

### Files
- `src/components/athlete-detail/ProgramTab.tsx` — lines 315-367 replaced with enhanced card layout

