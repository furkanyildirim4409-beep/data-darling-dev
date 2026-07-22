## Amaç
Kimliksiz erişilebilen dev/test endpoint'i `dev-trigger-email`'i tamamen kaldırarak spam ve sipariş veri sızıntısı riskini kapat. Prod e-posta akışı (`handle-universal-orders` + `send-email` + `shopify-webhook`) etkilenmez çünkü UI hiçbir yerden bu fonksiyonu çağırmıyor.

## Adımlar
1. `supabase/functions/dev-trigger-email/` klasörünü (içindeki `index.ts` ile birlikte) sil.
2. `supabase/config.toml` içinden `[functions.dev-trigger-email] verify_jwt = false` bloğunu (satır 87-88) kaldır.
3. Deploy edilmiş fonksiyonu Supabase'ten sil (`supabase--delete_edge_functions` ile `dev-trigger-email`) — böylece canlı endpoint de kapanır.
4. Güvenlik bulgusunu `mark_as_fixed` olarak işaretle.

## Teknik notlar
- `rg` ile doğrulandı: `dev-trigger-email` referansı yalnız kendi klasöründe ve `config.toml`'da. Frontend/başka edge function çağırmıyor.
- Prod sipariş e-postaları: `shopify-webhook` → `handle-universal-orders` → `send-email` zinciri; bu değişiklikten bağımsız.
