

## Academy Management Module (Epic 4)

### Changes

| File | Change |
|------|--------|
| `src/pages/Akademi.tsx` | **New** — Academy management page with content grid and add-content dialog |
| `src/App.tsx` | Add `/akademi` route, import Akademi page |
| `src/components/layout/AppSidebar.tsx` | Add "Akademi" nav item with `GraduationCap` icon |

### 1. `src/pages/Akademi.tsx`

- Header with `GraduationCap` icon, title "Akademi Yönetimi", and "+ Yeni İçerik Ekle" button
- Mock data state with ~4 items (title, category: Antrenman/Beslenme/Mental, type: Video/Makale, description)
- Responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) of content cards:
  - Category badge (color-coded), type badge, title, description preview, hover effects
- Add Content Dialog (shadcn `Dialog`) with form fields:
  - Başlık (Input), Açıklama (Textarea), Kategori (Select), İçerik Tipi (Select), Medya Linki (Input)
  - Submit adds to local state + `toast.success("İçerik eklendi")`

### 2. `src/App.tsx`

Add `<Route path="/akademi" element={<Akademi />} />` inside the MainLayout routes block. Import `Akademi` at top.

### 3. `src/components/layout/AppSidebar.tsx`

Add nav item after "İçerik Stüdyosu": `{ path: "/akademi", label: "Akademi", icon: GraduationCap }`. Import `GraduationCap` from lucide-react.

