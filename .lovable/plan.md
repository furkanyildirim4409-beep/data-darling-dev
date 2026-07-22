## Sorun
`PackageFormDialog` (rich_description) ve `useCoachContract.saveContract` (coach_contracts.content) ham HTML'i DB'ye yazıyor. DOMPurify yalnızca önizleme render'ında çalışıyor — mobil uygulama veya ileride başka bir tüketici bu HTML'i sanitize etmeden render ederse XSS riski oluşur.

## Çözüm
Yazma yolunda savunma derinliği ekle: DB'ye yalnızca sanitize edilmiş HTML gitsin.

### 1. Ortak yardımcı — `src/lib/sanitizeHtml.ts` (yeni)
- `sanitizeRichHtml(html: string): string` — DOMPurify ile aynı katı config'i (mevcut önizlemedekiyle birebir) tek bir yerde tanımlar:
  - `USE_PROFILES: { html: true }`
  - `FORBID_TAGS: ["style","script","form","iframe","object","embed"]`
  - `FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onfocus","onblur"]`
- Boş/whitespace-only girişlerde `""` döner.

### 2. `src/components/business/PackageFormDialog.tsx`
- `handleSubmit` içinde `rich_description` alanı `sanitizeRichHtml(richDescription).trim() || null` olarak gönderilir.
- Önizleme render'ı da aynı helper'a taşınır (tek kaynak).

### 3. `src/hooks/useCoachContract.ts`
- `saveContract(html)` çağrısında `content: sanitizeRichHtml(html)` upsert edilir.
- `stripHtml` boşluk kontrolü sanitize sonrası HTML üzerinde çalışır (davranış değişmez, sadece güvenli girişle).

### Kapsam dışı
- DB migration yok — yalnızca yazımdan önceki client-side sanitize.
- UI/render davranışı değişmez; ham HTML yerine sanitize edilmiş HTML persist edilir.
- Mevcut satırlar geriye dönük temizlenmez (bu bir defensive-in-depth ekleme; istenirse ayrıca backfill talep edilebilir).
