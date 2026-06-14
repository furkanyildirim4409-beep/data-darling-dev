# Abonelik Butonu Davranışı — Tier'a Göre Dinamik

## Hedef

`/settings → Abonelik` ekranındaki 3 paket kartının (Başlangıç, Elit, Pro) "Satın Al / Yükselt" butonları, kullanıcının aktif aboneliğine göre tutarlı davransın.

## Davranış Matrisi

| Mevcut plan        | Başlangıç kartı   | Elit kartı        | Pro kartı         |
|--------------------|-------------------|-------------------|-------------------|
| Yok (aboneliksiz)  | Planı Satın Al    | Planı Satın Al    | Planı Satın Al    |
| Başlangıç (aktif)  | Aktif Plan ✓      | **Planı Yükselt** | **Planı Yükselt** |
| Elit (aktif)       | Soluk / Geçersiz  | Aktif Plan ✓      | **Planı Yükselt** |
| Pro (aktif)        | Soluk / Geçersiz  | Soluk / Geçersiz  | Aktif Plan ✓      |

- "Soluk / Geçersiz" = `disabled`, muted renk, "Daha Düşük Plan" etiketi, tıklanamaz.
- "Planı Yükselt" = primary buton, tıklanabilir, Stripe checkout başlatır.
- "Aktif Plan" = mevcut görünüm aynen.

## Teknik Detaylar

Dosya: `src/pages/Settings.tsx` (mevcut TIERS map'i, ~525-617).

1. Her kart için karşılaştırma `tier.priceMonthly` vs `currentTierObj.priceMonthly` üzerinden:
   - `isCurrent` → "Aktif Plan" (mevcut)
   - `isUpgrade` (tier.priceMonthly > current) → label'ı sabit `"Planı Yükselt"` olarak göster (tier.cta yerine).
   - `isLowerTier` (tier.priceMonthly < current) → disabled + muted + "Daha Düşük Plan".
   - Aktif abonelik yoksa (`subscription_status` ≠ active/trialing) → orijinal `tier.cta` metni.

2. `hasActiveSub` koşulu mevcut migration'daki status alanını kullanır (`active` veya `trialing`); diğer statüler (canceled, past_due, vs.) için tüm planlar normal satın alma davranışını sürdürür.

3. Sub-coach hesaplar abonelik satın alamadığından bu blok zaten head coach görünümünde; ek role guard gerekmiyor.

4. `subscriptionTiers.ts` değişmiyor — sadece UI mantığı güncelleniyor.

## Kabul Kriterleri

- Başlangıç kullanıcısı kartları gördüğünde Elit ve Pro'da "Planı Yükselt" butonu aktif olmalı.
- Elit kullanıcı Başlangıç butonunu tıklayamamalı (muted), Pro'da "Planı Yükselt" görmeli.
- Pro kullanıcı hem Başlangıç hem Elit butonlarını tıklayamamalı.
- Aboneliği olmayan/iptal etmiş kullanıcı tüm planlarda satın alma butonunu görmeli.
