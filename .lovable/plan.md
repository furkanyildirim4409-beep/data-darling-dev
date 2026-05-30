# Plan — Clinical supplement seed + unit-locked dose dialog

## 1) Seed `supplements_library` with 150+ clinically-curated items

Single migration (`INSERT ... WHERE NOT EXISTS` per row, keyed on `name`, so re-runs are idempotent and existing rows untouched). Each row carries `name`, `category`, `default_dosage` (encoded as `"<amount> <unit>"` so the parser in step 2 derives the locked suffix automatically), `description`, `icon`.

Unit-lock groups encoded in `default_dosage`:
- **mg** — Magnezyum Bisglisinat (400 mg), Çinko Pikolinat (30 mg), Ashwagandha KSM-66 (600 mg), Alpha-GPC (300 mg), Koenzim Q10 (200 mg), Demir Kelat (18 mg), Rhodiola Rosea (300 mg), C Vitamini (1000 mg), Kafein Anhidroz (200 mg), L-Theanine (200 mg), Resveratrol (250 mg), Devedikeni / Silymarin (250 mg), Saw Palmetto (320 mg), NAC (600 mg), Potasyum Sitrat (500 mg), B6 Vitamini (50 mg), B12 / Metilkobalamin (1 mg), Kurkumin/Curcumin (500 mg), Quercetin (500 mg), L-Tirozin (500 mg), Bromelain (500 mg), Pterostilbene (100 mg), Berberin (500 mg), Lion's Mane (500 mg), Reishi (500 mg), Cordyceps (500 mg), Spirulina (500 mg), Chlorella (500 mg), Bacopa Monnieri (300 mg), Boswellia (300 mg), Glisin (3000 mg), DIM (200 mg), Tongkat Ali (200 mg), Fenugreek (500 mg), Maca (1500 mg), Tribulus Terrestris (750 mg), Pygeum (100 mg), Lutein (20 mg), Astaxanthin (12 mg), Pycnogenol (100 mg), L-Lysine (1000 mg), L-Ornithine (1000 mg), Phosphatidylserine (100 mg), Inositol (500 mg), TMG / Betaine Anhydrous (2500 mg), Choline Bitartrate (500 mg), Sodyum Hyaluronate (120 mg), MSM (1000 mg), Curcumin C3 Complex (500 mg), Garcinia Cambogia (500 mg).

- **g** — Creapure Kreatin Monohidrat (5 g), L-Glutamin (5 g), AAKG (3 g), L-Citrulline Malate (6 g), Beta-Alanin (3 g), BCAA 2:1:1 (7 g), EAA (10 g), Whey Protein Isolate (30 g), Mikselar Kazein (30 g), D-Aspartik Asit (3 g), Taurin (2 g), Carnosyn Beta-Alanin (3 g), HMB (3 g), Hidrolize Kollajen Peptit (10 g), Insan Whey Concentrate (30 g), Vegan Pea Protein (30 g), Inulin Lif (5 g), Psyllium Husk (5 g), Glikomannan (3 g), Maltodextrin (40 g), Cluster Dextrin (40 g), Waxy Maize (40 g), Spirulina Powder (5 g), Greens Powder (8 g), Karboksilatlı Sitrülin (8 g), Agmatine Sulfate (1 g), Pre-Workout Blend (15 g), Intra-Workout Carb (30 g), L-Carnitine L-Tartrate (3 g).

- **IU** — D3 Vitamini / Kolekalsiferol (5000 IU), A Vitamini / Retinil Palmitat (10000 IU), E Vitamini / dl-Alfa Tokoferil Asetat (400 IU).

- **Kapsül** — Multivitamin Formülü (2 Kapsül), ZMA (3 Kapsül), Sarımsak Ekstresi (1 Kapsül), Ginkgo Biloba (1 Kapsül), Pre-Probiotik 25M CFU (1 Kapsül), Adrenal Support (2 Kapsül), Joint Support Stack (2 Kapsül), Liver Detox Complex (2 Kapsül), Test Booster Complex (3 Kapsül), Sleep Support Blend (2 Kapsül), Fat Burner Thermo (2 Kapsül), Estrogen Blocker (1 Kapsül), DHEA (1 Kapsül), 5-HTP (1 Kapsül), GABA (2 Kapsül).

- **Softgel** — Omega-3 Balık Yağı Yüksek EPA/DHA (2 Softgel), CLA (3 Softgel), Krill Yağı (2 Softgel), MCT Softgel (3 Softgel), Vitamin K2 MK-7 (1 Softgel), Tongkat Ali Softgel (1 Softgel), Borage Oil GLA (1 Softgel), Evening Primrose Oil (1 Softgel), Lecithin (1 Softgel), Astaksantin Softgel (1 Softgel).

- **Tablet** — Glukozamin + Kondroitin + MSM Kompleksi (3 Tablet), Aspirin Düşük Doz (1 Tablet), Iron Bisglycinate Tablet (1 Tablet), Iodine Kelp (1 Tablet), Niacin / B3 (1 Tablet), Selenyum (1 Tablet), Krom Pikolinat (1 Tablet).

- **ml** — Likit L-Karnitin (15 ml), D3+K2 Damla (1 ml), MCT Oil (15 ml), Likit Amino Hidrator (30 ml), Apple Cider Vinegar Liquid (15 ml), Likit Magnezyum (10 ml), Kolloidal Gümüş (5 ml), Vitamin B-Complex Liquid (2 ml).

Total ~160 rows. Icons: 💊 default, 🧪 powders/aminos, 🐟 omega/softgel oils, ☀️ D vitamini, 🌿 botanic/herbal, 🍵 greens/spirulina, 🧠 nootropics, 💉 IU vitamins.

## 2) Unit-locked "Miktar Belirle" dialog on add

### New file: `src/components/program-architect/SupplementAmountDialog.tsx`
- Props: `open`, `onOpenChange`, `supplementName: string`, `icon: string`, `defaultAmount: number`, `unit: string`, `onConfirm(amount: number): void`.
- Shadcn `Dialog` titled `Miktar Belirle — {supplementName}`.
- Numeric input with `inputMode="decimal"`, locked suffix chip on the right (e.g. `mg`, `g`, `IU`, `Kapsül`, `Softgel`, `Tablet`, `ml`).
- Validation: parse with `Number()`, require finite and `> 0` before enabling confirm; show inline helper text on invalid.
- "Onayla" submits `onConfirm(amount)`; Enter key submits when valid.

### `src/components/program-architect/ProgramLibrary.tsx` (supplement branch only)
- Add helper `parseDosage(default_dosage?: string): { amount: number; unit: string }` that matches `^\s*(\d+(?:\.\d+)?)\s*(mg|g|IU|ml|Kapsül|Softgel|Tablet)\s*$` (case-insensitive on `mg/g/ml/iu`, exact-case for the count units). Fallbacks: `{1, "Adet"}`.
- New state `amountDialog: { open, item, amount, unit }`.
- Intercept the supplement add path in the existing item-click/`+` handler: when `builderMode === "supplement"`, instead of calling `onAddItem(item)` directly, open `amountDialog` pre-filled from `parseDosage(item.default_dosage)`.
- On confirm: call `onAddItem({ ...item, default_dosage: \`${amount} ${unit}\` } as LibraryItem)` then close dialog. No other builder modes touched.

### `src/pages/Programs.tsx`
- No changes needed — the supplement branch in `handleAddItem` already reads `(item as any).default_dosage` into `SupplementBuilderItem.dosage`. The dialog just enriches that string before it arrives, so each row lands in the deck pre-filled like `"400 mg"`, `"5 g"`, `"2 Softgel"`.

## Out of scope
- No table schema changes (`supplements_library` already has `name, category, default_dosage, description, icon`).
- No edits to `SupplementBuilder.tsx` internals; per-row dosage field remains free-text so coach can fine-tune later.
- No changes to athlete-side supplement flow, edge functions, or RLS.
