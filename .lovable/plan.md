## Amaç
Egzersiz verilerini çeken RapidAPI için yeni bir key'e geçmek. Endpoint (`exercisedb.p.rapidapi.com`), edge function kodu ve DB şeması aynı kalıyor — sadece secret değeri güncellenecek.

## Adımlar

1. **Yeni secret'ı iste**
   - `update_secret` ile `RAPIDAPI_KEY` için güvenli form aç.
   - Kullanıcı yeni key değerini (ExersizDB-RapidAPI hesabından aldığı) forma yapıştıracak.
   - Not: Secret adı Supabase'de yalnızca harf/rakam/alt-çizgi kabul ettiği için ad olarak `RAPIDAPI_KEY` kalır; "ExersizDB-RapidAPİ" sadece kullanıcı tarafındaki etiket.

2. **Otomatik yayılım**
   - `fetch-exercises` ve `proxy-exercise-image` edge function'ları `Deno.env.get("RAPIDAPI_KEY")` okuyor → yeni değer deploy gerektirmeden aktif olur.

3. **Doğrulama**
   - `supabase--edge_function_logs` ile `fetch-exercises` çağrısında 200 döndüğünü kontrol et.
   - Gerekirse örnek bir istek at ve response'u görüntüle.

## Dokunulmayacaklar
- `supabase/functions/fetch-exercises/index.ts`
- `supabase/functions/proxy-exercise-image/index.ts`
- `exercise_library` tablosu ve diğer DB şeması
- Config, RLS, grants

## Riskler
- Eski key hâlâ RapidAPI'de aktifse çift kullanım olur; kullanıcı isterse eski key'i RapidAPI panelinden revoke etmeli.
- Yeni key'in RapidAPI'de `exercisedb` aboneliği olması gerekiyor, aksi halde 401/403 döner.
