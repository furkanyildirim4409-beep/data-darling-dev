
-- Step 1: ALTER orders table with headless commerce columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'digital';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_reference_id text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 2: RLS policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Coaches can view athlete orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.is_coach_of(user_id));

CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Step 3: Seed "Kargon Yola Çıktı" shipping template
INSERT INTO public.email_templates (name, category, is_system, owner_id, subject, required_variables, body_html)
VALUES (
  'Kargon Yola Çıktı',
  'shipping',
  true,
  null,
  'Müjde {{isim}}, Dynabolic Paketin Yola Çıktı! 🚚',
  '["isim", "kargo_firmasi", "takip_no", "takip_linki"]'::jsonb,
  '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;margin:0;padding:0;">
  <tr><td align="center" style="padding:40px 0;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="padding:32px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#10b981;font-family:sans-serif;font-size:24px;margin:0;letter-spacing:4px;">DYNABOLIC</h1>
        <p style="color:#64748b;font-family:sans-serif;font-size:11px;margin:4px 0 0;letter-spacing:2px;">LOGISTICS</p>
      </td></tr>
      <!-- Hero -->
      <tr><td style="padding:48px 32px 24px;text-align:center;">
        <div style="font-size:56px;line-height:1;">🚚</div>
        <h2 style="color:#ffffff;font-family:sans-serif;font-size:24px;margin:16px 0 8px;">Paketin Yola Çıktı, {{isim}}!</h2>
        <p style="color:#94a3b8;font-family:sans-serif;font-size:14px;margin:0;">Siparişin hazırlandı ve kargo firmasına teslim edildi.</p>
      </td></tr>
      <!-- Tracking Card -->
      <tr><td style="padding:0 32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid #334155;">
          <tr>
            <td style="padding:20px 24px;color:#94a3b8;font-family:sans-serif;font-size:13px;border-bottom:1px solid #1e293b;">Kargo Firması</td>
            <td align="right" style="padding:20px 24px;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;border-bottom:1px solid #1e293b;">{{kargo_firmasi}}</td>
          </tr>
          <tr>
            <td style="padding:20px 24px;color:#94a3b8;font-family:sans-serif;font-size:13px;">Takip Numarası</td>
            <td align="right" style="padding:20px 24px;color:#10b981;font-family:''Courier New'',monospace;font-size:16px;font-weight:bold;letter-spacing:1px;">{{takip_no}}</td>
          </tr>
        </table>
      </td></tr>
      <!-- CTA -->
      <tr><td style="padding:0 32px 16px;text-align:center;">
        <a href="{{takip_linki}}" style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;border-radius:8px;font-family:sans-serif;font-weight:bold;font-size:15px;">Kargomu Takip Et</a>
      </td></tr>
      <!-- Info -->
      <tr><td style="padding:16px 32px 40px;text-align:center;">
        <p style="color:#64748b;font-family:sans-serif;font-size:12px;margin:0;">Kargo durumunu yukarıdaki butondan takip edebilirsin.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #334155;">
        <p style="color:#475569;font-family:sans-serif;font-size:11px;margin:0;">© Dynabolic — Next-Gen Coaching Platform</p>
      </td></tr>
    </table>
  </td></tr>
</table>'
) ON CONFLICT DO NOTHING;
