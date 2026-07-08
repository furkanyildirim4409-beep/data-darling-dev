## Amaç
Her koçun paket satmadan önce bir "Koçluk Sözleşmesi" şablonu oluşturmasını zorunlu kılmak. Şablon Ayarlar altında yönetilecek, DB'ye kaydedilecek, ve paket kaydetme akışında guardrail olarak devreye girecek.

## 1. Veritabanı (Migration)
`profiles` tablosuna yeni alanlar:
- `contract_template` (text, nullable) – HTML/metin sözleşme içeriği
- `contract_updated_at` (timestamptz, nullable) – son güncelleme zamanı

Neden `profiles`: her koçun tek bir aktif şablonu olacak, ayrı tablo overkill. RLS için mevcut `profiles` politikaları yeterli (koç kendi satırını okuyup güncelliyor). `update_own_profile` RPC whitelist'i varsa `contract_template` alanı eklenir; yoksa doğrudan update policy geçerli.

Ayrıca ajans senaryosu: sub-coach, head coach'un aktif şablonunu kullanır. Sözleşme her zaman `activeCoachId` (yani head coach) profilinden okunacak — memory core kuralına uygun.

## 2. Yeni Hook – `src/hooks/useCoachContract.ts`
- `contract: string | null`, `updatedAt`, `isLoading`, `hasContract: boolean`
- `fetchContract()` – `profiles.contract_template` alanını `activeCoachId` üzerinden çeker
- `saveContract(html: string)` – aynı satırı günceller, `contract_updated_at = now()`
- Boş içerik veya sadece whitespace/HTML tag boşsa `hasContract = false`
- Toast + refetch pattern (diğer hook'larla uyumlu)

## 3. Varsayılan Şablon
`src/lib/defaultCoachingContract.ts` – Türkçe, koç adı/paket adı placeholder'ları içeren robust taslak:
- Taraflar & tanımlar
- Hizmet kapsamı ve süresi
- Ücret & ödeme koşulları
- İade politikası (14 gün cayma, dijital hizmet istisnaları)
- Sağlık sorumluluk reddi (medikal tavsiye değildir, doktor onayı)
- KVKK / gizlilik kısa maddesi
- Fesih koşulları, mücbir sebep
- Uyuşmazlık çözümü

Editör ilk açıldığında `contract` boşsa bu şablon `defaultValue` olarak yüklenir; kullanıcı düzenleyip kaydeder.

## 4. Yeni Component – `src/components/settings/CoachingContractSettings.tsx`
- Başlık + kısa açıklama
- `RichTextEditor` (mevcut `src/components/mailbox/RichTextEditor.tsx`) — HTML formatlı sözleşme için ideal
- "Varsayılan Şablonu Yükle" butonu (mevcut içeriği override eder, onay dialogu ile)
- "Kaydet" butonu (loading state)
- Son güncelleme timestamp gösterimi
- İçerik boşsa uyarı Alert'i: "Sözleşme şablonunuz henüz kayıtlı değil. Paket satabilmek için kaydetmelisiniz."

## 5. Settings sayfasına entegrasyon
`src/pages/Settings.tsx` içine yeni tab:
- Value: `contract`
- Label: "Koçluk Sözleşmesi"
- İçerik: `<CoachingContractSettings />`
Mevcut Tabs sırasına uygun konumlanır.

## 6. Guardrail
**`PackageFormDialog.tsx`:**
- `useCoachContract()` çağrısı
- `hasContract === false` iken form üstünde `<Alert variant="destructive">` (istenen metinle) + Settings'e link
- "Kaydet" butonu `disabled={!hasContract || saving}`

**`CoachingPackagesManager.tsx`:**
- Aynı hook ile "Yeni Paket Ekle" butonunu `disabled` yap
- Liste üstünde persistent Alert göster
- Hover/title ile açıklama

Guardrail sadece **yayınlama/kaydetme**yi engeller; mevcut paketlerin görüntülenmesi ve silinmesi etkilenmez (kullanıcı deneyimi). Zaten yayında olan paketler için ek bir toggle yapılmaz — bu Faz 3 kapsamı dışı.

## Dokunulan dosyalar
- `supabase/migrations/…` (yeni) – profiles alanları
- `src/hooks/useCoachContract.ts` (yeni)
- `src/lib/defaultCoachingContract.ts` (yeni)
- `src/components/settings/CoachingContractSettings.tsx` (yeni)
- `src/pages/Settings.tsx` (tab eklenir)
- `src/components/business/PackageFormDialog.tsx` (guardrail)
- `src/components/business/CoachingPackagesManager.tsx` (guardrail)

## Kapsam dışı (bilerek)
- Athlete tarafında sözleşme onay akışı (Phase 4 konusu)
- Paket bazlı özel sözleşme override'ı
- Sözleşme sürüm geçmişi
