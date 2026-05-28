# Roster Row Polish — Real Package Pills & Cell Containment

## 1. Source the package title

`src/hooks/useAthletes.ts` (already queries paid coaching orders):
- Also capture `items` JSON on the order select.
- Build `packageTitle: Map<athleteId, string>` from the latest paid coaching order: take the first item where `type==='coaching'` (or `item_type==='coaching'`) and read `title`.
- Pass `packageTitle.get(r.id) ?? null` into `mapProfileToAthlete` and set `packageTitle` on the returned `Athlete`.

## 2. Type extension

`src/types/shared-models.ts` — add to `Athlete`:
```ts
packageTitle?: string | null;
```

## 3. Row cell overhaul — `src/components/athletes/AthleteTableRow.tsx`

- Replace the static `tier` `<Badge>` with a cyberpunk glass pill rendering `athlete.packageTitle`. Fall back to `athlete.tier` only when no active package is present. Class set verbatim:
  ```
  border border-primary/20 bg-primary/10 text-primary uppercase text-[10px] tracking-wider rounded-md font-bold px-2 py-0.5 whitespace-nowrap
  ```
- Apply `whitespace-nowrap truncate` (and a sensible `max-w` where useful) to the text spans inside:
  - Athlete name + sport
  - Compliance row label/value
  - Readiness number block
  - Injury Risk badge content
  - Last Active timestamp
- Keep all existing semantic tokens, colors, and behavior intact; no logic changes outside the badge swap.

## Files

- `src/hooks/useAthletes.ts`
- `src/types/shared-models.ts`
- `src/components/athletes/AthleteTableRow.tsx`
