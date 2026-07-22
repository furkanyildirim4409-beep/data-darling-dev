## Sorun

`send-custom-email` şu an sadece rol kontrolü yapıyor: herhangi bir koç, `@dynabolic.co` aliası ile **rastgele** bir adrese HTML e-posta gönderebiliyor. Ayrıca hız sınırı yok — tek bir koç dakikada yüzlerce çağrı yapabilir. Bu, phishing/spam ve alan itibarı riski.

## Çözüm

Fonksiyona iki savunma katmanı ekle:

### 1. Alıcı doğrulaması (allowlist)

`toEmail`, `sendAsUserId` (delegasyon sonrası efektif koç) için aşağıdakilerden birine ait olmalı:

1. **Sporcu** — `profiles` satırı, `coach_id = sendAsUserId` ve `email = toEmail` (case-insensitive).
2. **Lead** — `waitlist.email = toEmail` (waitlist'te `coach_id` yok, ancak proje boyunca tek global lead kanalı; bu tabloyu "lead" kaynağı olarak kabul ediyoruz — [bkz. teknik notlar]).
3. **Kendi adresi** — `auth.users.email = toEmail` (koçun kendi adresine test maili atabilmesi için).

Hiçbiri değilse `403 Forbidden` + `{ error: "Recipient not in your roster" }` ve `emails` tablosuna satır yazma.

Karşılaştırmalar `lower(email) = lower(toEmail)` ile yapılır. Sorgular admin (service role) client ile atılır ki RLS engel olmasın.

### 2. Rate limiting (`edge_rate_limits`)

Var olan `public.bump_edge_rate_limit(_user_id, _bucket, _window)` RPC'si kullanılır.

- **Bucket**: `"send-custom-email"` — pencere: dakikalık ve saatlik iki katmanlı.
  - **Per-minute**: `window_start = date_trunc('minute', now())`, limit **10**.
  - **Per-hour**: `window_start = date_trunc('hour', now())`, limit **100**.
- Sayaç `sendAsUserId` üzerinden takip edilir (sub-coach delegasyonu sonrası; head coach'un kotası ortak).
- Limit aşılırsa `429 Too Many Requests` + `Retry-After` başlığı + JSON `{ error, limit, window }`.
- Rate limit kontrolü **alıcı doğrulamasından ÖNCE** yapılır (aksi hâlde başarısız çağrılar limiti sayamaz — istismarı önlemek için sayım her istekte artar).

### 3. Kapsam dışı

- Public UI/hook (`useEmails`, `ComposeMailDialog`) değişmiyor; sunucu tarafı zaten hatayı yayıyor.
- Yeni tablo/migration yok — mevcut `edge_rate_limits` altyapısı kullanılıyor.
- Şablon içeriği, from-alias, delegasyon mantığı ve `emails` tablo yazımı aynen korunur.

## Teknik notlar

- **"Lead" kaynağı belirsizliği**: kodbaz `profiles`'ta `email` var, `waitlist`'te `email` var (koç bağlantısız), `coach_invites`'te ise `email` yok. Bu projede koç-bağlı bir "lead" tablosu bulunmuyor. Waitlist'i lead kaynağı kabul etmek pratik ama global — eğer istenen davranış farklıysa (ör. sadece koçun kendi sporcuları + self), bu adım daralttırılabilir. Varsayılan planım: **profiles-of-coach + waitlist + self**.
- Rate limit RPC'si atomik `INSERT ... ON CONFLICT ... DO UPDATE RETURNING count` yapıyor; race condition yok.
- Loglama: reddedilen alıcı ve rate-limit aşımı için `console.warn` — Edge Function logs üzerinden izleme için.
- Fonksiyon deploy edilecek; migration/secret gerekmiyor.
