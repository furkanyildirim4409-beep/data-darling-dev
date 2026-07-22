## Kaldırılacak dosyalar
Grep ile hiçbir yerden import edilmediği doğrulandı (yalnızca dosyaların kendileri eşleşiyor):

- `src/components/business/NewInvoiceDialog.tsx`
- `src/components/business/InvoiceDetailDialog.tsx`
- `src/components/business/AthletePaymentStatus.tsx`
- `src/components/store-manager/ProductDetailDialog.tsx`

## İşlem
`rm` ile 4 dosyayı sil. Başka değişiklik yok — hiçbir route, barrel export veya bileşen bunları referanslamıyor, dolayısıyla temizlik güvenli.
