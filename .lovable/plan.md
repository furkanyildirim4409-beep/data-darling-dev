# Academy Archive & Edit Engine — Part 2/5

All changes in `src/pages/Akademi.tsx`.

## 1. Tabs layout
- Wrap the course list (the grid + empty state + result count) in shadcn `<Tabs value={activeTab} onValueChange={setActiveTab}>`.
- Two tabs: `active` ("Aktif Eğitimler") and `archived` ("Arşivlenenler").
- Each tab trigger shows a count badge from the filtered base set.
- Add a status filter step to `filteredItems`:
  - `active` tab → keep `status === 'published'` (treat any non-`archived` legacy row as active).
  - `archived` tab → keep `status === 'archived'`.
- Drafts are out of scope here (Part 1 schema retained). They will not appear in either tab — that's the spec's "zero data leakage" rule for archived only; we'll explicitly only surface `published` in the active tab to match the brief.
- Empty states adapt per tab (e.g. "Arşivlenmiş içerik yok").

## 2. Archive / Unarchive
- New `handleArchive(id, nextStatus: 'archived' | 'published')` doing `supabase.from('academy_content').update({ status: nextStatus }).eq('id', id)`.
- Optimistic local update of `items` state + `toast.success` ("Arşivlendi" / "Arşivden çıkarıldı"); rollback + `toast.error` on failure.
- Dropdown menu:
  - Active tab card → "Arşivle" (Archive icon).
  - Archived tab card → "Arşivden Çıkar" (ArchiveRestore icon).
  - "Düzenle" remains in both.

## 3. Edit flow
- Add `editingId: string | null` state.
- `handleEdit(item: AcademyItem)`:
  - Hydrate `form` with title/description/category/type/tags joined/thumbnail/visibility/status.
  - Hydrate `thumbnailPreview` = item.thumbnail (no `thumbnailFile`).
  - Hydrate `modules` from `item.modules` mapped to `CourseModuleLocal` with `videoFile: null` and existing `videoUrl`, `articleContent`, `contentType`.
  - `setEditingId(item.id); setOpen(true);`
- Dialog title/description switch dynamically based on `editingId`.
- Footer primary button: "Güncelle" when editing, otherwise "Ekle".
- `handleSubmit` branches on `editingId`:
  - Editing → `update({...payload}).eq('id', editingId)`; do NOT overwrite `coach_id`.
  - Creating → existing insert path.
  - Payload identical otherwise (uploaded thumbnail/modules + visibility/status).
- `resetFormState` also clears `editingId`.

## 4. Display order / data integrity
- Filtering pipeline order: status tab → search → category → type → sort. Archived items never appear in the active tab and vice versa.
- Existing realtime/fetch logic untouched.

## Files touched
- `src/pages/Akademi.tsx` only.
