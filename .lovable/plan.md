## Sorun

`AlertActionCard.handleMarkResolved` yalnızca yerel `isDismissed` state'ini set edip başarı toast'u gösteriyor. `Alerts.tsx`'teki `dismissedIds` de sadece bileşen state'i — sayfa yenilenince set boşalıyor ve tüm uyarılar geri geliyor.

Ek olarak: uyarılar (`useAlerts`) sentetiktir — `health-crit-<athleteId>`, `pay-<id>`, `checkin-<id>` gibi string anahtarlardan üretilir; DB'de doğrudan güncellenecek tek bir "notifications" satırı yoktur. Bu yüzden kalıcı çözüm için ayrı bir "kapatıldı" tablosu gerekir.

## Çözüm

### 1. Yeni tablo: `dismissed_alerts`
- Kolonlar: `id`, `coach_id` (auth.uid), `alert_key` (text — `alert.id` string hali), `resolved_at`, `created_at`.
- `UNIQUE(coach_id, alert_key)` — aynı uyarıyı iki kez yazmayı engeller.
- RLS: koç yalnızca kendi satırlarını okur/yazar/siler. Standard GRANT bloğu (authenticated + service_role, anon YOK).

### 2. Yeni hook: `useDismissedAlerts`
- `list()`: coach için tüm `alert_key` set'ini React Query ile çeker.
- `dismiss(alertKey)`: upsert (`resolved_at = now()`).
- `undismiss(alertKey)`: satırı siler (opsiyonel geri alma; şu an UI'da yok, sadece API'de bırakılır).
- Realtime kanalı ile başka sekmelerde de senkronize olur.

### 3. `AlertActionCard.tsx`
- Prop olarak `onResolve: (alertKey: string) => Promise<void>` ekle (veya hook'u doğrudan içeride kullan; parent akışına uyalım — parent'tan callback).
- `handleMarkResolved` artık `async`:
  1. `await onResolve(String(alert.id))`
  2. Başarı → `toast("Uyarı arşive taşındı")` + `handleDismiss()` (fade animasyonu).
  3. Hata → `toast({ variant: "destructive", ... })`, `isDismissed` set edilmez, kart görünür kalır.
- Buton yükleme durumu için `isResolving` state'i, çift tıklamayı engeller.

### 4. `Alerts.tsx`
- `useDismissedAlerts()` çağır; `dismissedIds` başlangıç değeri DB'den gelen set olsun (sunucu state'i canonical).
- `handleDismiss(id)` sadece optimistic local set; kalıcı yazma `onResolve` içinde.
- `handleMarkAllRead` → tüm görünür `alert.id`'leri `dismiss` mutation'ına bulk yazacak (Promise.all).
- Sayfa yenilendiğinde arşivlenmiş uyarılar filtrelenmiş kalır.

### 5. Kapsam dışı
- Diğer bildirim yüzeyleri (`coach_notifications`, `messages`) değişmez.
- UI davranışı (fade animasyonu, layout) aynen korunur; sadece yazma tarafı DB'ye bağlanır.

## Teknik detaylar

Migration (özet):
```sql
CREATE TABLE public.dismissed_alerts (
  id uuid PK default gen_random_uuid(),
  coach_id uuid NOT NULL,
  alert_key text NOT NULL,
  resolved_at timestamptz NOT NULL default now(),
  created_at timestamptz NOT NULL default now(),
  UNIQUE(coach_id, alert_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dismissed_alerts TO authenticated;
GRANT ALL ON public.dismissed_alerts TO service_role;
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach manages own" ... USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
```

`alert_key` neden text? Çünkü `Notification.id: string | number` ve sentetik uyarılar string prefix taşıyor; olduğu gibi saklamak en güvenli yoldur.
