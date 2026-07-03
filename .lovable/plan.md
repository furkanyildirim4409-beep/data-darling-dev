## Değişiklik Zaten Uygulandı

Belirtilen üç akış önceki turda RPC'lere bağlandı. Mevcut `src/pages/AthleteDetail.tsx` durumu:

- **Satır 182** — `executeFreeze` → `supabase.rpc('coach_freeze_athlete', { p_athlete_id: id, p_days, p_reason })`
- **Satır 206** — `executeTerminate` → `supabase.rpc('coach_terminate_athlete', { p_athlete_id: id })`
- **Satır 344** — `handleUnfreezeAthlete` → `supabase.rpc('coach_unfreeze_athlete', { p_athlete_id: id })`

OTP `handleOtpVerify` doğrulaması geçtikten sonra `pendingAction`'a göre bu üç fonksiyondan biri çağrılıyor (satır 336-338). `refund_requests` INSERT akışı zaten olduğu gibi duruyor.

Kalan tek `profiles.update` çağrısı (satır 363) `handleRemoveTermination` (**feshi geri alma**) fonksiyonuna ait ve senin istediğin üç akışın dışında. Bu akış hâlâ direkt `UPDATE` yapıyor ve `subscription_status` trigger'ına takılacak.

### Yapılacak Ek İş (opsiyonel — onay bekliyor)

Eğer **feshi geri alma** akışını da güvenli hale getirmek istersen:

1. Yeni RPC: `coach_reinstate_athlete(p_athlete_id uuid)` — SECURITY DEFINER. Yetki kontrolü: çağıran, sporcunun **son coach'u** olduğunu ispatlamalı. `coach_id` feshte NULL'a çekildiği için `is_coach_of` çalışmaz; onun yerine `coach_action_ledger` veya son `orders.coach_id` üzerinden doğrulama gerekir. Alternatif: yalnızca son 30 gün içinde bu koç tarafından feshedilmiş olma şartı.
2. `subscription_status='active'`, `coach_id = <çağıran>`, `active_program_id=null` set edilir.
3. `handleRemoveTermination` bu RPC'ye bağlanır.

Bu ek işi yapmamı ister misin, yoksa şu anki hâliyle bırakalım mı?
