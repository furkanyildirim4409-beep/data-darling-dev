# AI Edge Function'larına Kullanıcı-Başına Rate Limit

## Kapsam Tespiti
Kodda `LOVABLE_API_KEY` / AI gateway çağıran fonksiyonlar:
- `ai-doctor` — rate limit YOK, eklenecek
- `generate-ai-program` — zaten `bump_edge_rate_limit` ile hour/day sınırı VAR (10/saat, 30/gün, admin bypass). Kullanıcının istediği 5/dk + 30/saat şablonuna hizalanacak.
- `timeline-forecast` — auth VAR, rate limit YOK. Bonus olarak eklemek istiyor musunuz? (Aşağıda "opsiyonel" olarak listeledim)
- `radar-worker` — cron/dispatcher tarafından tetiklenen background job, kullanıcı çağırmıyor → dokunulmuyor.

Kullanıcının bahsettiği `analyze-bloodwork` ve `search-food` fonksiyonları projede **mevcut değil** (proje ağacında yok). Bu iki fonksiyon oluşturulmayacak; kullanıcı yanılıyor ya da başka projeden kalma bir istek olabilir — planı sadece var olan fonksiyonlar üzerinden ilerlet.

## Desen (send-custom-email ile birebir)
Her fonksiyonda auth doğrulaması SONRASI, AI çağrısından ÖNCE:
```ts
const now = new Date();
const minWin  = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString();
const hourWin = new Date(Math.floor(now.getTime() / 3600000) * 3600000).toISOString();

const [{ data: perMin }, { data: perHour }] = await Promise.all([
  adminClient.rpc("bump_edge_rate_limit", { _user_id: callerId, _bucket: "<fn>:minute", _window: minWin }),
  adminClient.rpc("bump_edge_rate_limit", { _user_id: callerId, _bucket: "<fn>:hour",   _window: hourWin }),
]);
const minCount  = typeof perMin  === "number" ? perMin  : 0;
const hourCount = typeof perHour === "number" ? perHour : 0;
if (minCount > MIN_LIMIT || hourCount > HOUR_LIMIT) {
  const retryAfter = minCount > MIN_LIMIT ? 60 : 3600;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down.",
                     limit: minCount > MIN_LIMIT ? MIN_LIMIT : HOUR_LIMIT,
                     window: minCount > MIN_LIMIT ? "minute" : "hour" }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } }
  );
}
```
- Sayaç her istekte (reject dahil) artar → yetkilendirme hatası döndürerek limitten kaçış engellenir.
- Anonim erişim eklenmez; mevcut auth kontrolleri korunur.
- Admin bypass yok (generate-ai-program'daki mevcut bypass da kaldırılıp tek desene uyulacak — istersen koruyabiliriz, aşağıda soru).

## Fonksiyon-başına limitler
| Fonksiyon | Dakika | Saat | Bucket adları |
|---|---|---|---|
| `ai-doctor` | 5 | 30 | `ai-doctor:minute`, `ai-doctor:hour` |
| `generate-ai-program` | 5 | 30 | `generate-ai-program:minute`, `generate-ai-program:hour` (eski `ai_program_hour/day` kaldırılır) |
| `timeline-forecast` *(opsiyonel)* | 10 | 60 | `timeline-forecast:minute`, `timeline-forecast:hour` |

Callable-only-by-coach olan `ai-doctor` ve `generate-ai-program` için `callerId` üzerinden sayılır; `timeline-forecast` mobil app'ten sporcunun kendisi de çağırabildiği için (istenirse) aynı `callerId` üzerinden sayılır.

## Yapılmayacaklar
- Yeni tablo/DB şeması, frontend, config.toml değişikliği yok.
- `radar-worker`, `handle-automation`, `global-system-automation` gibi background/cron fonksiyonlarına eklenmez.
- Var olmayan `analyze-bloodwork` / `search-food` için dosya oluşturulmaz.

## Onay bekleyen 2 soru
1. **generate-ai-program admin bypass**: kaldıralım mı (tek desene uy) yoksa koruyalım mı?
2. **timeline-forecast**: rate-limit ekleyelim mi? (Sen istenenler listesinde saymadın ama AI kredisi tüketiyor.)

Yanıt gelince edge fonksiyonlarını deploy ederim.
