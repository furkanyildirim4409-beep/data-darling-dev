

## Academy Content Studio UI Overhaul (Prompt 1/3)

### Single file change: `src/pages/Akademi.tsx` — full rewrite

### 1. New data model

Add `tags` and `thumbnail` fields to `AcademyItem`. Extend initial mock data accordingly. Add more mock items (~6-8) for a fuller grid.

### 2. Search & Filter Bar

Below the header, a flex row with:
- **Search Input** with `Search` icon — filters by title (case-insensitive)
- **Category Select** — "Tümü" + 3 categories
- **Type Select** — "Tümü", "Video", "Makale"
- **Sort Select** — "En Yeni", "En Eski", "A-Z"

State: `searchQuery`, `filterCategory`, `filterType`, `sortBy`. Derive `filteredItems` with `useMemo`.

### 3. Redesigned Content Cards

Each card becomes a horizontal layout with:
- **Left thumbnail area** (fixed ~120px wide): if `thumbnail` exists show image, else show a gradient placeholder with Video/FileText icon
- **Right content area**: larger title (`text-base font-semibold`), `line-clamp-2` description, row of category + type badges
- **Triple-dot menu** (top-right): `DropdownMenu` with "Düzenle", "Arşivle" (placeholder toasts), and "Sil" (destructive, calls delete)

### 4. Upgraded Dialog

- `max-w-2xl`, `max-h-[85vh] overflow-y-auto`
- Title: "Yeni İçerik Ekle"
- New fields: **Thumbnail URL** input, **Tags** input (comma-separated)
- Textarea gets `min-h-[150px]` and helper text
- Form state extended with `thumbnail` and `tags`

### 5. Imports to add

`Search`, `MoreVertical`, `Pencil`, `Archive` from lucide-react. `DropdownMenu` components from shadcn.

