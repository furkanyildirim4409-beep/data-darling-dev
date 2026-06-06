## Content Studio Stories Engine — Düzeltmeler

### 1) 24 saatlik Aktif Hikaye filtresi (sıkı kural)

**Dosya:** `src/components/content-studio/ActiveStoriesDialog.tsx` (satır 123-125)

Şu an aktif listeyi sadece `expires_at > now()` ile filtreliyor. Bir hikaye Öne Çıkanlara eklendiğinde `expires_at` ileri taşınmış olabiliyor; bu yüzden 24 saat geçse bile "Aktif" halkasında kalıyor. Instagram benzeri davranış için filtreyi **kesinlikle `created_at`** üzerinden uygulayacağız:

```ts
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
const activeStories = (allStories ?? []).filter(
  (s) => new Date(s.created_at) >= twentyFourHoursAgo
);
```

- 24 saatten eski hikayeler Aktif Hikayeler diyaloğunda görünmeyecek.
- Mapped oldukları Öne Çıkan gruplarında (`HighlightsSection` + `HighlightDetailSheet`, `useCoachHighlights`) görünmeye devam ediyorlar çünkü orada `is_highlighted=true` filtresi var; herhangi bir değişiklik gerekmiyor.
- `timeRemaining(expires_at)` etiketi yerine "kalan süreyi" `created_at + 24h`'a göre hesaplayacağız ki gösterilen "X kaldı" değeri her zaman tutarlı olsun.

### 2) StoryUploadModal — Gerçek Öne Çıkan grupları

**Dosya:** `src/components/content-studio/StoryUploadModal.tsx`

- Etiket: **"Kategori Seçimi" → "Öne Çıkanlara Ekle (Opsiyonel)"**.
- `storyCategories` mock importunu ve `categories` sabitini kaldır.
- Mevcut `useCoachHighlights()` hook'unu kullanarak koçun gerçek Öne Çıkan gruplarını çek (zaten `coach_highlight_metadata` + `coach_stories` üzerinden çalışıyor ve `customCoverUrl` ile `category` adını döndürüyor — yeni hook gerekmiyor).
- Select açılır listede her seçeneğin yanına kapak küçük resmini (`group.customCoverUrl ?? group.stories[0]?.media_url`) bir `Avatar`/`img` ile göster; metin olarak `group.category`. Hiç grup yoksa: "Henüz öne çıkan grup yok — önce 'Yeni Grup' oluştur" placeholder.
- "Yok / Sadece 24 saat aktif kalsın" şeklinde bir `none` seçeneği baş tarafta dursun (zaten varsayılan).
- `handleUpload` içinde `createStory({ media_url, duration_hours: 24, category })` çağrısı zaten kategori parametresini destekliyor; sadece seçilen grubun `category` adını geçeceğiz. Ayrı bir mapping tablosu yok — projedeki şema **`coach_stories.category` text + `is_highlighted` boolean** ile çalışıyor (gerçek tablo: `coach_stories` + `coach_highlight_metadata`).
- `useCreateStory` hook'unu kategori verildiğinde `is_highlighted=true` da yazacak şekilde küçük bir güncellemeyle düzeltmek gerekirse `src/hooks/useSocialMutations.ts` içindeki `useCreateStory` payload'una eklenecek (gerekiyorsa yapılacak; mevcut davranış kontrol edilecek).

### 3) Yayındaki içeriklerden "Düzenle" butonlarını kaldır

- **`src/components/content-studio/FeedPlanner.tsx`** (satır ~113-135 PostCard menüsü): Sadece `post.status === "published"` olan kartlarda **Düzenle** `DropdownMenuItem`'ı render edilmesin. "Sil" kalabilir; published olmayan (draft/scheduled) kartlarda Düzenle korunur. Edit dialog (satır 608+) draft/scheduled için kullanılmaya devam eder.
- **`src/components/content-studio/HighlightsSection.tsx`**: Buradaki "Düzenle" butonu yayında olan içerik değil, highlight grubu yeniden sıralama moduydu. User direktifi "yayında olan içerikler" üzerine olduğundan bu dokunulmaz; **kapsam dışı** (gerekirse ikinci turda kaldırılır).
- **`src/pages/ContentStudio.tsx`**: Üst seviye taramada başka "Düzenle" tetikleyicisi yok; ek değişiklik gerekmiyor.

### Veritabanı

Şema değişikliği gerekmiyor. Mevcut tablolar:
- `coach_stories(id, coach_id, media_url, expires_at, created_at, category, is_highlighted)`
- `coach_highlight_metadata(coach_id, category_name, custom_cover_url, order_index, is_pinned_to_kokpit, show_on_profile)`

### Dokunulacak dosyalar

```text
src/components/content-studio/ActiveStoriesDialog.tsx   (24h created_at filtresi + kalan süre etiketi)
src/components/content-studio/StoryUploadModal.tsx      (mock kaldır, gerçek highlight listesi + label)
src/components/content-studio/FeedPlanner.tsx           (published kartlarda Düzenle gizle)
src/hooks/useSocialMutations.ts                         (gerekiyorsa createStory is_highlighted senkronu)
```

### Doğrulama

- 25 saat önce oluşturulmuş bir hikaye Aktif Hikayeler diyaloğunda görünmemeli, ama bağlı olduğu Öne Çıkan grubunda görünmeli.
- StoryUploadModal açılır listesinde gerçek grup adları ve kapakları çıkmalı; seçilip yüklenince yeni hikaye o grupta görünmeli.
- Yayınlanmış post kartının kebap menüsünde sadece "Sil" olmalı; taslak/planlı kartlarda Düzenle kalmalı.
