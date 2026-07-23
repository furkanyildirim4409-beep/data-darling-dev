## PayoutDesk — coach_payouts entegrasyonu

Yalnızca `src/components/business/PayoutDesk.tsx` değişecek. Diğer dosyalara dokunulmayacak.

### Değişiklikler

1. **Veri kaynağı**
   - `payments` prop'una dayalı client-side escrow hesabı (`CLEARANCE_DAYS`, `nextDisbursementDate`, filter/reduce) tamamen kaldırılacak.
   - Bileşen içinde `useEffect` + `supabase.from('coach_payouts').select(...).eq('coach_id', auth.uid())` ile giriş yapmış koçun kendi kayıtları çekilecek. RLS zaten koçu kendi satırlarına kısıtlıyor; yeni policy yok.
   - `useState` ile `payouts`, `loading` tutulacak. `order('period_end', { ascending: false })`.

2. **Props**
   - `payments: Payment[]` prop'u kaldırılacak (artık kullanılmıyor).
   - `payoutIban?: string | null` prop'u ve maskeli IBAN kartı (mevcut lime/siyah tema ile) aynen korunacak.

3. **Üst 3 özet kartı**
   - **Bekleyen**: `status='pending'` satırlarının `net_lira` toplamı (amber tonlar).
   - **Onaylı**: `status='approved'` toplamı (primary/lime).
   - **Ödenen**: `status='paid'` toplamı (emerald).
   - Her kart ikon + başlık + `fmtTRY(toplam)` + kısa açıklama.

4. **Liste (Transfer Geçmişi)**
   - Kolonlar: Dönem (`period_start – period_end`), Net tutar (`net_lira`), Durum rozeti (`pending/approved/paid/rejected` için renkli badge), Ödeme bilgisi (paid ise `payment_reference` + `paid_at`, değilse "—").
   - Sıralama: en yeni dönem üstte.

5. **Boş durum (kritik)**
   - Hiç kayıt yoksa özet kartlarında ₺0 gösterme; kartlar yerine tek dürüst boş durum bloğu:
     > "Henüz hakediş kaydın oluşturulmadı. Tahsilatların birikiyor; her dönem sonunda hakedişin hesaplanıp burada listelenecek."
   - IBAN kartı yine gösterilecek (bilgi kartı olarak korunur).

6. **Tema**
   - Mevcut `glass`, `border-border`, lime/emerald/amber vurgu tonları, mono numaralandırma, `Landmark`/`ArrowDownToLine` ikonografisi korunacak.

### Teknik notlar
- `supabase` import: `@/integrations/supabase/client`.
- `auth.uid()` client-side: `supabase.auth.getUser()` veya mevcut `useAuth` hook — bileşende `supabase.auth.getUser()` ile alınacak (yeni hook oluşturulmayacak, başka dosya etkilenmesin).
- `nextDisbursementDate`, `CLEARANCE_DAYS` sabitleri ve ilgili kart kaldırılacak (artık uydurma).
- `Payment` tipi import'u kaldırılacak.

### Bileşeni çağıran yer
`payments` prop'unun kaldırılması bu dosya dışında bir dosyayı etkileyebilir; kullanıcı "başka dosyaya dokunma" dedi. Bu yüzden prop kaldırmak yerine `payments` prop'unu **opsiyonel + kullanılmayan** olarak (`payments?: Payment[]`) bırakacağım ki çağıran taraf kırılmasın. İçeride hiç referans edilmeyecek.