// Dynabolic Elite theme — order-delivered
export interface OrderDeliveredData {
  recipientName?: string
  orderId: string
  deliveryDate: string
  orderUrl?: string
}

function escapeHtml(v: string): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const HTML = `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Dynabolic - Siparişiniz Teslim Edildi</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #09090b; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .mobile-pad { padding: 32px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
          
          <tr>
            <td style="padding: 40px; text-align: center; border-bottom: 1px solid #27272a;">
              <img src="https://app.dynabolic.co/dynabolic-logo.png" alt="DYNABOLIC" width="180" style="display: block; margin: 0 auto; max-width: 180px;">
            </td>
          </tr>
          
          <tr>
            <td class="mobile-pad" style="padding: 48px 40px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #D4FF00; text-transform: uppercase; letter-spacing: 2px;">Teslimat Onayı</p>
              <h1 style="margin: 0 0 20px 0; font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 800; color: #fafafa; line-height: 38px; letter-spacing: -1px;">Görev Tamamlandı</h1>
              <p style="margin: 0 0 32px 0; font-family: 'Inter', sans-serif; font-size: 15px; color: #a1a1aa; line-height: 24px;">
                Performansınızı zirveye taşıyacak araçlar hedefe ulaştı. <strong>{{ orderId }}</strong> numaralı siparişinize ait paket başarıyla teslim edilmiştir. Sınırlarınızı zorlamaya hazır mısınız?
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111113; border-radius: 12px; border: 1px solid #27272a; margin-bottom: 32px; text-align: center;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #71717a; text-transform: uppercase;">Teslimat Tarihi</p>
                    <p style="margin: 0; font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; color: #fafafa;">{{ deliveryDate }}</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="background-color: transparent; border: 2px solid #D4FF00; border-radius: 8px; text-align: center;">
                    <a href="https://dynabolic.co/shop" style="display: inline-block; padding: 14px 28px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #D4FF00; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Siparişi Değerlendir</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" style="padding: 40px; border-top: 1px solid #27272a; background-color: #111113; text-align: center;">
              <p style="margin: 0 0 24px 0; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 1.5px;">Dynabolic Mobil App</p>
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 12px; vertical-align: middle;">
                    <a href="https://apps.apple.com" style="display: block; text-decoration: none;"><img src="https://app.dynabolic.co/icons8-apple-inc-96.png" width="40" style="opacity: 0.9;"></a>
                  </td>
                  <td style="padding: 0 12px; vertical-align: middle;">
                    <a href="https://play.google.com" style="display: block; text-decoration: none;"><img src="https://app.dynabolic.co/icons8-google-play-96.png" width="40" style="opacity: 0.9;"></a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
                <tr>
                  <td style="text-align: center; font-family: 'Inter', sans-serif; font-size: 13px; color: #a1a1aa;">
                    Paketinizde eksik veya hasar mı var? <a href="https://dynabolic.co/support" style="color: #D4FF00; text-decoration: none; font-weight: 600;">Destek Merkezine Danışın</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" style="padding: 40px; border-top: 1px solid #27272a; background-color: #09090b; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="padding: 0 12px;"><a href="https://www.instagram.com/dynabolic.co" style="display: block;"><img src="https://app.dynabolic.co/icons8-instagram-96.png" width="28" style="opacity: 0.6;"></a></td>
                  <td style="padding: 0 12px;"><a href="https://x.com/dynabolicco" style="display: block;"><img src="https://app.dynabolic.co/icons8-x-96.png" width="28" style="opacity: 0.6;"></a></td>
                  <td style="padding: 0 12px;"><a href="https://www.facebook.com/dynabolic.co/" style="display: block;"><img src="https://app.dynabolic.co/icons8-facebook-96.png" width="28" style="opacity: 0.6;"></a></td>
                  <td style="padding: 0 12px;"><a href="https://wa.me/905323605194" style="display: block;"><img src="https://app.dynabolic.co/icons8-whatsapp-96.png" width="28" style="opacity: 0.6;"></a></td>
                </tr>
              </table>
              <p style="margin: 0 0 6px 0; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; color: #fafafa;">Dynabolic Performance OS</p>
              <p style="margin: 0 0 20px 0; font-family: 'Inter', sans-serif; font-size: 11px; color: #52525b; line-height: 18px;">YILDIRIM GROUP LTD, 71 - 75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom</p>
              <p style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; color: #3f3f46; line-height: 16px;">© 2026 Dynabolic. Tüm Hakları Saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

export function renderOrderDeliveredHtml(data: OrderDeliveredData): string {
  const map: Record<string, string> = {
    orderId: escapeHtml(data.orderId),
    deliveryDate: escapeHtml(data.deliveryDate),
  }
  return HTML.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (k in map ? map[k] : ''))
}

export function renderOrderDeliveredText(data: OrderDeliveredData): string {
  return [`Siparişiniz teslim edildi`, `Sipariş No: ${data.orderId}`, `Teslim Tarihi: ${data.deliveryDate}`].join('\n')
}
