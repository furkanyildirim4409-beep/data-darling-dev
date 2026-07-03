## Amaç
1. `proxy-exercise-image` üzerindeki 401 sorununu HMAC imzalı kısa ömürlü URL ile çöz.
2. DB'deki **1329 egzersizin** 1080p görselini RapidAPI rate-limit'ine (120 req/dk) uygun şekilde arka planda Supabase Storage'a indir.
3. Frontend `<img>` tag'lerini artık RapidAPI proxy'sine değil, Storage public URL'ine baksın.
4. İşlem bitince cron kendini silsin.

---

## 1. HMAC İmzalama Altyapısı

**Secret**: `EXERCISE_IMAGE_SIGNING_SECRET` (generate_secret ile 64 karakter random).

**İmza formatı**: `HMAC-SHA256(secret, "exerciseId:resolution:expiresAt")` → base64url.

**URL formatı**:
```
/functions/v1/proxy-exercise-image?exerciseId=0001&resolution=180&exp=<unix>&sig=<hmac>
```

**Değişecek fonksiyon**: `proxy-exercise-image/index.ts`
- JWT guard'ı **kaldırılır**.
- Yerine `exp` ve `sig` query param doğrulaması:
  - `exp > now()` (URL ömrü max 1 saat).
  - `sig` yeniden hesaplanıp constant-time karşılaştırılır.
- Başarısızsa 401.

**İmza üreteci**: Frontend'de kullanılmayacak (secret sızmasın). Sadece backfill sonrası fallback için gerekirse ayrı bir `sign-exercise-image` edge function eklenir — ilk aşamada gerek yok çünkü hedef Storage'a geçmek.

---

## 2. Storage Bucket

**Yeni bucket**: `exercise-gifs` (public).
**Path şeması**: `{exerciseId}.gif` (ExerciseDB görselleri GIF döner).

**exercise_library tablosuna yeni kolonlar**:
- `storage_path TEXT` — bucket içindeki path (`0001.gif`).
- `image_synced_at TIMESTAMPTZ` — indirme başarılıysa doldurulur.
- `image_sync_error TEXT` — son hata mesajı (debug için).

Böylece cron nerede kaldığını `image_synced_at IS NULL` ile bulur (offset yerine idempotent).

---

## 3. Backfill Edge Function: `backfill-exercise-images`

**Trigger**: pg_cron → `net.http_post` (her 1.5 dakikada bir).

**Davranış (her çağrıda)**:
1. `exercise_library` içinden `image_synced_at IS NULL` olan **ilk 120 kaydı** `video_url` sonundaki `exerciseId=XXXX` regex'iyle çıkararak seç (name ASC sıralı, deterministik).
2. Her egzersiz için:
   - `GET https://exercisedb.p.rapidapi.com/image?exerciseId={id}&resolution=1080` (x-rapidapi-key header'ı).
   - Response byte'larını `exercise-gifs/{id}.gif`'e upload et (`upsert: true`).
   - `image_synced_at = now()`, `storage_path = '{id}.gif'` güncelle.
   - Hata olursa `image_sync_error` doldur, döngüye devam.
3. İşlem bitince kalan sayıyı say. `pending_count == 0` ise `cron.unschedule('backfill-exercise-images')` çalıştırılır (fonksiyon içinden `service_role` ile SQL RPC).

**Rate-limit güvencesi**:
- 120 request / 90 saniye = ~80 req/dk (RapidAPI limit 120/dk altında güvenli marj).
- İstekler arasında 500ms `sleep` (120 × 500ms = 60s → 90s cron aralığına sığar).

**Yetki**: `verify_jwt = false`, ancak body'de `SUPABASE_SERVICE_ROLE_KEY` beklenir (cron'dan gelen apikey header'ıyla doğrulanır) — dış çağrıları engeller.

---

## 4. Cron Schedule

`supabase--insert` ile (kullanıcıya özgü URL & anon key içerdiği için migration değil):

```sql
select cron.schedule(
  'backfill-exercise-images',
  '*/2 * * * *',  -- her 2 dakikada bir (Postgres cron dakika altı desteklemez; 1.5dk yerine 2dk)
  $$
  select net.http_post(
    url:='https://fsbhbfltathfcpvcjfzt.supabase.co/functions/v1/backfill-exercise-images',
    headers:='{"Content-Type":"application/json","apikey":"<SERVICE_ROLE>"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

**Not**: `pg_cron` minimum aralığı **1 dakika**. 1.5dk mümkün değil → **2 dakika** kullanılacak (120 req/2 dk = 60 req/dk, limit altında rahat marj).

**Toplam süre tahmini**: 1329 / 120 = ~12 tur × 2dk = **~24 dakika**.

**Otomatik durma**: Fonksiyon `pending_count == 0` gördüğü ilk turda kendini `cron.unschedule` eder.

---

## 5. Frontend Değişikliği

**exercise_library** okuyan tüm yerler (`useValidExercises`, `Programs`, `AssignTrainingDialog`, `ExerciseLibraryEditor`, `ProgramLibrary`, `SortableExerciseItem`, vb.) zaten `video_url`'ü direkt `<img src>` olarak kullanıyor.

**Yaklaşım**: DB'deki `video_url` alanı, indirme tamamlanan her satır için Storage public URL'ine güncellenir (backfill fonksiyonu içinde):
```
https://fsbhbfltathfcpvcjfzt.supabase.co/storage/v1/object/public/exercise-gifs/{id}.gif
```

Böylece **hiçbir frontend kodu değişmez** — sadece DB satırları güncellenir, `<img>` etiketleri artık RapidAPI proxy'sine değil Storage CDN'ine gider (auth gerekmez, hızlıdır, ücretsizdir).

Henüz indirilmemiş satırlar eski `proxy-exercise-image` URL'sini kullanmaya devam eder — bu yüzden **1. adımdaki HMAC değişikliği** kritik: geçiş süresi boyunca bu URL'lerin de çalışması lazım.

Ancak HMAC signed URL üretimi frontend'de secret gerektirir. **Basit alternatif**: Geçiş süresi (24 dk) boyunca proxy'de mevcut JWT guard'ı gevşetip sadece `apikey` header (anon key) kontrolüne düşürelim → tarayıcı `<img>` yine header gönderemez. **Doğru çözüm**: proxy fonksiyonunda `exp+sig` query param kontrolü + frontend'de görsel URL'lerini render sırasında signed URL üreten hafif bir `sign-exercise-image` edge function (yalnız authenticated coach çağırır, sonuç 1 saat cache).

**Öneri (sadeleştirme)**: Backfill hızlı bitecek (24dk). Frontend'i şu şekilde değiştirelim:
- `useValidExercises` içinde `video_url` boşsa/`proxy-exercise-image` içeriyorsa **placeholder göster** ("Görsel hazırlanıyor…").
- Backfill bittiğinde tüm satırlar Storage URL'ine döner, placeholder kalkar.

Bu durumda **HMAC ekleme adımı atlanabilir**; proxy fonksiyonu deprecated olur ve backfill bittikten sonra silinebilir.

---

## Onay Gereken Karar

Aşağıdaki iki yaklaşımdan hangisini uygulayayım?

**A) Sade (önerilen)**: HMAC kısmını atla, backfill süresince (~24dk) henüz indirilmemiş görseller için placeholder göster. Bitince `proxy-exercise-image` fonksiyonunu sil.

**B) Tam paket**: HMAC signed URL akışı + backfill + frontend'de signer entegrasyonu. Daha karmaşık, daha çok kod.

## Adım Özeti (A yaklaşımı)

1. Migration: `exercise_library`'ye `storage_path`, `image_synced_at`, `image_sync_error` kolonları.
2. Storage bucket: `exercise-gifs` (public).
3. Edge function: `backfill-exercise-images/index.ts` (batch=120, rate-limited, DB update + `cron.unschedule` kendi kendine).
4. `supabase--insert` ile cron schedule: `*/2 * * * *`.
5. Frontend `SortableExerciseItem` ve benzeri: `video_url` `proxy-exercise-image` içeriyorsa placeholder ikonu göster.
6. Backfill tamamlandıktan sonra manuel olarak `proxy-exercise-image` fonksiyonunu ve `fetch-exercises`'ı gözden geçir (fetch-exercises ilk sync için hâlâ lazımsa kalabilir).
