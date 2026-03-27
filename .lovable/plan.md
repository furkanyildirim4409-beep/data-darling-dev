

## Dispute Resolution Modal — Part 2 of 3

### Changes

| File | Change |
|------|--------|
| `src/components/disputes/DisputeResolutionModal.tsx` | **New** — side-by-side evidence comparison modal |
| `src/pages/Disputes.tsx` | Add `selectedDispute` state, wire button onClick, render modal |

### 1. `src/components/disputes/DisputeResolutionModal.tsx`

New component using `Dialog` / `DialogContent` from shadcn.

- **Props**: `isOpen`, `onClose`, `dispute` (the challenge object)
- **Helper**: `isVideo(url)` — regex test for `.mp4`, `.mov`, `.webm`, `.avi`
- **Layout**:
  - `DialogContent` with `max-w-5xl`, glassmorphic styling (`bg-background/95 backdrop-blur-xl border-border/50`)
  - **Header**: challenge name + wager badge
  - **Body**: 2-column grid (`grid-cols-1 md:grid-cols-2 gap-6`)
    - **Left (Challenger)**: avatar + name + claimed value, then media from `dispute.proof_url` (video or image), or "Kanıt Yüklenmedi" empty state
    - **Right (Opponent)**: same layout using `dispute.opponent_proof_url`
  - **Footer**: 3 verdict buttons (console.log only — backend wiring in Part 3):
    1. "Sol (Challenger) Kazandı" — primary outline
    2. "Berabere (İptal Et)" — muted outline
    3. "Sağ (Rakip) Kazandı" — destructive outline

### 2. `src/pages/Disputes.tsx`

- Add `useState<any>(null)` for `selectedDispute`
- Change button onClick from `console.log` to `setSelectedDispute(d)`
- Render `<DisputeResolutionModal isOpen={!!selectedDispute} onClose={() => setSelectedDispute(null)} dispute={selectedDispute} />` at bottom

