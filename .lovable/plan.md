## Amaç
`public.link_athlete_to_coach` RPC'sini, çağıranın gerçekten `_coach_id` sahibi (veya admin) olduğundan emin olacak şekilde sertleştir. Meşru davet/bağlama akışı bozulmaz çünkü `Athletes.tsx` zaten `_coach_id: user.id` geçiyor.

## Adım
1. Migration: `CREATE OR REPLACE FUNCTION public.link_athlete_to_coach(...)` — mevcut imza, dönüş tipi, SECURITY DEFINER ayarları ve gövdenin geri kalanı AYNI kalır. Sadece gövdenin en başına şu iki guard eklenir:
   - `IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;`
   - `IF auth.uid() <> _coach_id AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'A coach can only link athletes to themselves'; END IF;`
2. Kod değişikliği yok (frontend zaten uyumlu). Test: koç kendi id'siyle çağırınca eskisi gibi `ok / already_yours / already_linked / not_found` döner; farklı `_coach_id` verildiğinde exception.

## Teknik notlar
- Fonksiyonun mevcut tanımını migration içinde tekrar yazmam gerekiyor (Postgres, CREATE OR REPLACE ile imza + gövdeyi tümüyle ister). Bunu yapmadan önce mevcut tanımı `supabase--read_query` ile `pg_get_functiondef` üzerinden çekip birebir koruyacağım; sadece gövdenin başına iki guard bloğu eklenecek.
- `search_path`, `LANGUAGE`, `VOLATILITY`, `SECURITY DEFINER` bayrakları korunur.
