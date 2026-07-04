// Dynabolic Elite theme — Order Delivered
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

export function renderOrderDeliveredHtml(data: OrderDeliveredData): string {
  const orderId = escapeHtml(data.orderId)
  const deliveryDate = escapeHtml(data.deliveryDate)
  const orderUrl = data.orderUrl ? escapeHtml(data.orderUrl) : ''
  const ctaHtml = orderUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="background-color: #D4FF00; border-radius: 8px; text-align: center; box-shadow: 0 0 20px rgba(212, 255, 0, 0.15);">
            <a href="${orderUrl}" style="display: inline-block; padding: 16px 32px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; color: #09090b; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Siparişi Görüntüle</a>
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Dynabolic - Siparişiniz Teslim Edildi</title>
<style>body{margin:0;padding:0;background-color:#09090b;} @media screen and (max-width:600px){.container{width:100%!important;max-width:100%!important;}.mobile-pad{padding:32px 20px!important;}}</style>
</head><body style="margin:0;padding:0;background-color:#09090b;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#09090b;padding:40px 20px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color:#18181b;border-radius:16px;border:1px solid #27272a;">
<tr><td style="padding:40px;text-align:center;border-bottom:1px solid #27272a;">
<img src="https://app.dynabolic.co/dynabolic-logo.png" alt="DYNABOLIC" width="180" style="display:block;margin:0 auto;max-width:180px;">
</td></tr>
<tr><td class="mobile-pad" style="padding:48px 40px;text-align:center;">
<p style="margin:0 0 12px 0;font-family:'Inter',sans-serif;font-size:13px;color:#D4FF00;text-transform:uppercase;letter-spacing:2px;">Teslimat Onayı</p>
<h1 style="margin:0 0 20px 0;font-family:'Inter',sans-serif;font-size:32px;font-weight:800;color:#fafafa;line-height:38px;letter-spacing:-1px;">Siparişiniz Teslim Edildi</h1>
<p style="margin:0 0 32px 0;font-family:'Inter',sans-serif;font-size:15px;color:#a1a1aa;line-height:24px;">
<strong>${orderId}</strong> numaralı siparişiniz <strong>${deliveryDate}</strong> tarihinde başarıyla teslim edilmiştir. Dynabolic ailesinin bir parçası olduğun için teşekkür ederiz.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111113;border-radius:12px;border:1px solid #27272a;margin-bottom:32px;text-align:center;">
<tr><td style="padding:24px;">
<p style="margin:0 0 8px 0;font-family:'Inter',sans-serif;font-size:13px;color:#71717a;text-transform:uppercase;">Teslim Tarihi</p>
<p style="margin:0;font-family:'Inter',sans-serif;font-size:22px;font-weight:800;color:#fafafa;letter-spacing:1px;">${deliveryDate}</p>
</td></tr></table>
${ctaHtml}
</td></tr>
<tr><td class="mobile-pad" style="padding:40px;border-top:1px solid #27272a;background-color:#09090b;border-bottom-left-radius:16px;border-bottom-right-radius:16px;text-align:center;">
<p style="margin:0 0 6px 0;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:#fafafa;">Dynabolic Performance OS</p>
<p style="margin:0 0 20px 0;font-family:'Inter',sans-serif;font-size:11px;color:#52525b;line-height:18px;">YILDIRIM GROUP LTD, 71 - 75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom</p>
<p style="margin:0;font-family:'Inter',sans-serif;font-size:10px;color:#3f3f46;">© 2026 Dynabolic. Tüm Hakları Saklıdır.</p>
</td></tr></table></td></tr></table></body></html>`
}

export function renderOrderDeliveredText(data: OrderDeliveredData): string {
  return [
    `Siparişiniz teslim edildi`,
    `Sipariş No: ${data.orderId}`,
    `Teslim Tarihi: ${data.deliveryDate}`,
    data.orderUrl ? `\nSipariş Detayı: ${data.orderUrl}` : '',
  ].filter(Boolean).join('\n')
}
