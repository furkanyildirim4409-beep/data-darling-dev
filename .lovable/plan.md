## Plan: Hassas Abonelik İşlemleri için Güvenli RPC Fonksiyonları

Koçların `profiles` tablosuna doğrudan `UPDATE` atamasını engelleyen `enforce_coach_profile_write_whitelist` trigger'ı, dondurma/fesih işlemlerini de bloke ediyor. Çözüm: bu değişiklikleri `SECURITY DEFINER` RPC'ler üzerinden, koç kimliği doğrulanarak yapmak.

### 1. Migration (yeni dosya)

Üç fonksiyon oluşturulacak. Her biri:
- `auth.uid()` NULL değilse doğrular
- Hedef sporcunun `profiles.coach_id` değerinin çağıran koça ait olduğunu ya da çağıranın aktif team member olduğunu (`is_coach_of(p_athlete_id)`) doğrular
- Değilse `RAISE EXCEPTION 'Forbidden: not your athlete'`
- `SECURITY DEFINER`, `SET search_path = public`
- Trigger'lar `current_user IN ('postgres','service_role','supabase_admin')` bypass'ına sahip olmadığından, `SECURITY DEFINER` fonksiyonu **fonksiyon sahibi (postgres)** olarak çalışacak ve whitelist trigger'ını bypass edecek.

#### a) `coach_freeze_athlete(p_athlete_id uuid, p_days int, p_reason text)`
- `p_days` 1–365 aralığında olmalı, yoksa exception
- Update: `subscription_status='frozen'`, `freeze_until = now() + make_interval(days => p_days)`, `freeze_reason = p_reason`, `updated_at = now()`

#### b) `coach_unfreeze_athlete(p_athlete_id uuid)`
- Update: `subscription_status='active'`, `freeze_until=null`, `freeze_reason=null`, `updated_at=now()`

#### c) `coach_terminate_athlete(p_athlete_id uuid)`
- Update: `subscription_status='terminated'`, `coach_id=null`, `active_program_id=null`, `updated_at=now()`
- Not: `coach_id` NULL'a çekildiği için trigger tetiklenmeden önce yetki kontrolü fonksiyon içinde manuel yapılıyor (RLS/trigger'a güvenilmiyor).

#### İzinler
```sql
REVOKE ALL ON FUNCTION public.coach_freeze_athlete(uuid,int,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.coach_freeze_athlete(uuid,int,text) TO authenticated;
-- unfreeze ve terminate için aynısı
```

#### Denetim (opsiyonel ama önerilen)
Her fonksiyon, mevcut `coach_action_ledger` tablosuna bir kayıt düşer (action: 'freeze' / 'unfreeze' / 'terminate', target_athlete_id, meta jsonb). Böylece hangi koç ne zaman hangi sporcuyu dondurdu izlenir.

### 2. Frontend (`src/pages/AthleteDetail.tsx`)

Mevcut dondurma/fesih akışları (`supabase.from('profiles').update(...)`) yerine RPC çağrılarına geçirilecek:

```ts
await supabase.rpc('coach_freeze_athlete', { p_athlete_id, p_days, p_reason })
await supabase.rpc('coach_unfreeze_athlete', { p_athlete_id })
await supabase.rpc('coach_terminate_athlete', { p_athlete_id })
```

OTP reauth akışı olduğu gibi kalır — reauth başarılı olduktan sonra ilgili RPC çağrılır. Hata mesajlarında `Forbidden` yakalanırsa Türkçe "Bu sporcu üzerinde yetkiniz yok." toast'u gösterilir.

### 3. Doğrulama
- Migration sonrası `supabase--read_query` ile 3 fonksiyonun ve grantlarının varlığını doğrula
- Preview'da bir sporcuda Dondur → Kaldır → Feshet akışını çalıştırıp toast + DB state kontrol et
- Başka koçun sporcusunda çağrı denenirse "Forbidden" alındığı doğrulanır

### Teknik Notlar
- Fonksiyonlar `postgres` rolüne ait olacağı için `enforce_coach_profile_write_whitelist` trigger'ının `auth.uid() IS NULL OR auth.uid() = NEW.id` shortcut'ı devreye girmez — bunun yerine trigger içindeki `current_user` bypass yolu kullanılamaz (trigger böyle bir bypass'a sahip değil). Bu yüzden trigger `SECURITY DEFINER` fonksiyon içinden çağrıldığında da whitelist mantığını çalıştırır ve `subscription_status`/`coach_id` değişikliklerini reddeder.
- **Çözüm:** trigger'a `enforce_coach_profile_write_guards`'daki gibi `IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;` bypass'ı eklenecek. Böylece RPC fonksiyonu (postgres olarak çalışırken) trigger'ı geçer; normal client update'leri hâlâ bloke edilir.
