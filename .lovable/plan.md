## Hedef
`profiles.bio` alanına HTML/script enjeksiyonunu engelleyen bir CHECK constraint eklemek ve kullanıcı bio'sunda `<...>` içeren bir metin kaydetmeye çalışırsa arayüzde anlaşılır Türkçe bir hata göstermek.

## 1. Veritabanı Migrasyonu
`profiles` tablosuna constraint ekle:

```sql
-- Mevcut HTML içeren bio'ları temizle (constraint eklenmeden önce, yoksa migration fail eder)
UPDATE public.profiles
SET bio = regexp_replace(bio, '<[^>]*>', '', 'g')
WHERE bio ~ '<[^>]*>';

ALTER TABLE public.profiles
ADD CONSTRAINT bio_no_html CHECK (bio IS NULL OR bio !~ '<[^>]*>');
```

Not: Mevcut veride HTML varsa migration patlar, bu yüzden önce sanitize ediyoruz.

## 2. Arayüz Hata Mesajı
Bio'nun kaydedildiği yerler:
- `src/pages/Settings.tsx` — profil bio güncellemesi (ana yer)
- `src/contexts/ProfileContext.tsx` üzerinden okunuyor

Yapılacak:
- **Client-side validation**: Bio kaydedilmeden önce `/<[^>]*>/` regex'i ile kontrol; eşleşirse `toast.error("Bio alanında HTML etiketleri (<...>) kullanılamaz. Lütfen düz metin girin.")` göster ve kaydetme.
- **Server hatası fallback**: Supabase `update_own_profile` RPC çağrısı constraint nedeniyle hata dönerse (`bio_no_html` ya da `check constraint` içeriyor) yine aynı Türkçe mesajı toast olarak göster, ham Postgres hatasını kullanıcıya gösterme.

## Teknik Detaylar
- Constraint adı: `bio_no_html`
- Regex (Postgres): `'<[^>]*>'` — herhangi bir `<tag>` formunu yakalar
- Regex (JS): `/<[^>]*>/` — aynı mantık
- Hata mesajı (TR): "Bio alanında HTML etiketleri (`<...>`) kullanılamaz. Lütfen düz metin girin."

## Dosyalar
- Yeni migration (CHECK constraint + sanitize update)
- `src/pages/Settings.tsx` — bio kaydetme handler'ında validation + error map

## Onayınızla Devam
Mevcut DB'de HTML içeren bio'lar varsa yukarıdaki `UPDATE` ile temizlenecek. Bu kabul edilebilir mi, yoksa migration'ı önce dry-run yapıp kaç satır etkilendiğini mi göstereyim?