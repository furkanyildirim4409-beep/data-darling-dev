-- 1. UPDATE ATHLETE WELCOME TEMPLATE
UPDATE public.email_templates
SET body_html = $$<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Dynabolic - Üyeliğin Onaylandı</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #09090b; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .mobile-pad { padding: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; padding-bottom: 16px !important; }
      .mobile-center { text-align: center !important; }
      .hero-title { font-size: 32px !important; line-height: 38px !important; }
      .hide-mobile { display: none !important; }
    }
    .btn-primary:hover { background-color: #bfff00 !important; transform: translateY(-2px); }
    .btn-secondary:hover { border-color: #D4FF00 !important; color: #D4FF00 !important; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#09090b;">
      <tr>
        <td align="center" style="padding: 20px 0;">

          <!-- HEADER -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td align="center" style="padding: 30px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right: 12px;">
                      <img src="https://fsbhbfltathfcpvcjfzt.supabase.co/storage/v1/object/public/social-media/dynabolic-icon.png" alt="Dynabolic" width="40" height="40" style="display:block; border-radius: 10px;">
                    </td>
                    <td style="font-size: 22px; font-weight: 800; color: #D4FF00; letter-spacing: 3px; text-transform: uppercase;">
DYNABOLIC
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- HERO SECTION -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 20px; border: 1px solid rgba(212,255,0,0.15); overflow: hidden;">
                  <tr>
                    <td style="padding: 50px 40px; text-align: center;">
                      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #D4FF00; letter-spacing: 4px; text-transform: uppercase;">
                        Hesabın Aktif Edildi
                      </p>
                      <h1 class="hero-title" style="margin: 0 0 20px 0; font-size: 38px; line-height: 44px; font-weight: 800; color: #ffffff;">
                        Sınırlarını Zorlamaya <br>Hazır Mısın, {{isim}}?
                      </h1>
                      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 26px; color: #a1a1aa;">
                        Aramıza hoş geldin. Antrenman deneyimini devrimleştirecek 4 süper gücün hazır. Bahaneleri geride bırak, dönüşüm bugün başlıyor.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td style="border-radius: 12px; background: #D4FF00;">
                            <a href="{{baslangic_linki}}" class="btn-primary" style="display: inline-block; padding: 16px 40px; font-size: 15px; font-weight: 800; color: #09090b; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                              Dönüşümüne Başla
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FEATURES SECTION -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 40px 40px 0;">
                <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center;">Seni Neler Bekliyor?</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-right: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">📸</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">AI NutriScanner</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Kalori saymayı bırak. Tabağını çek, yapay zeka saniyeler içinde makrolarını hesaplasın.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-left: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">👁️</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Vision AI Form</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Sakatlanma riskini sıfırla. Kamera seni izlesin, hareket formunu anında düzeltsin.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td height="8" colspan="2"></td>
                  </tr>
                  <tr>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-right: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">🪙</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">BioCoin Rewards</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Terledikçe kazan! Antrenmanlarını bitir, BioCoin topla ve gerçek ödüllere dönüştür.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-left: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">⌚</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Wearable Sync</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Akıllı saatini bağla, uyku ve aktivite verilerin yapay zeka analizleriyle harmanlansın.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- MORE FEATURES BANNER -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 16px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(90deg, rgba(212,255,0,0.08) 0%, rgba(212,255,0,0.03) 100%); border: 1px solid rgba(212,255,0,0.15); border-radius: 12px;">
                  <tr>
                    <td style="padding: 16px 24px; text-align: center;">
                      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #D4FF00; letter-spacing: 2px; text-transform: uppercase;">VE PERFORMANSINI ZİRVEYE TAŞIYACAK 20'DEN FAZLA YENİ NESİL ÖZELLİK...</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- MOTIVATION SECTION -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                  <tr>
                    <td style="padding: 0;" width="45%">
                      <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop" alt="Motivation" width="100%" style="display: block; border-radius: 16px 0 0 16px; object-fit: cover; min-height: 200px;">
                    </td>
                    <td style="padding: 30px;" width="55%">
                      <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Her Ter Damlası, Yeni Bir Zafer.</h3>
                      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #a1a1aa;">Rakiplerin dinlenirken sen gelişiyorsun. Günlük hedeflerini tamamla, rozetleri topla ve kendi limitlerini yeniden yaz.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- TESTIMONIAL -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 24px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 26px; color: #d4d4d8; font-style: italic;">
                        "Dynabolic sadece bir takip uygulaması değil, cebimdeki acımasız bir baş antrenör. Sadece 12 haftada tüm kişisel rekorlarımı paramparça ettim."
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right: 12px;">
                            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&crop=face" alt="Emirkan" width="44" height="44" style="border-radius: 50%; display: block;">
                          </td>
                          <td>
                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff;">Emirkan T.</p>
                            <p style="margin: 0; font-size: 12px; color: #71717a;">Pro Atlet &amp; Dynabolic Üyesi</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FINAL CTA -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); border-radius: 16px; border: 1px solid rgba(212,255,0,0.2);">
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <h3 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">Hala Bekliyor Musun?</h3>
                      <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa;">İlk antrenmanın seni bekliyor. Uygulamayı aç ve bugün eyleme geç.</p>
                      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td style="border-radius: 12px; background: #D4FF00;">
                            <a href="{{baslangic_linki}}" class="btn-primary" style="display: inline-block; padding: 14px 36px; font-size: 14px; font-weight: 800; color: #09090b; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                              Gelişimini Takip Et
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FOOTER -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" align="center">
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <img src="https://fsbhbfltathfcpvcjfzt.supabase.co/storage/v1/object/public/social-media/dynabolic-icon.png" alt="Dynabolic" width="32" height="32" style="display:inline-block; border-radius: 8px; vertical-align: middle;">
                      &nbsp;
                      <span style="font-size: 16px; font-weight: 700; color: #D4FF00; letter-spacing: 2px; vertical-align: middle;">DYNABOLIC</span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #71717a;">Dynabolic Coaching Platform</p>
                      <p style="margin: 4px 0 0 0; font-size: 11px; color: #52525b;">Next-Gen Fitness &amp; Nutrition Tracking</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 11px; line-height: 18px; color: #52525b;">Bu e-posta sana Dynabolic platformuna kayıt olduğun için gönderilmiştir. Eğer bu maili yanlışlıkla aldığını düşünüyorsan, destek ekibimizle iletişime geçebilirsin.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p style="margin: 0; font-size: 11px; color: #52525b;">
                        <a href="#" style="color: #71717a; text-decoration: underline;">Abonelikten Çık</a> &nbsp;|&nbsp;
                        <a href="#" style="color: #71717a; text-decoration: underline;">Gizlilik Politikası</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </center>
</body>
</html>$$
WHERE name = 'Premium Hoş Geldin';

-- 2. UPDATE COACH WELCOME TEMPLATE
UPDATE public.email_templates
SET body_html = $$<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Dynabolic - Koç Hesabın Aktif</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #09090b; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .mobile-pad { padding: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; padding-bottom: 16px !important; }
      .mobile-center { text-align: center !important; }
      .hero-title { font-size: 32px !important; line-height: 38px !important; }
      .hide-mobile { display: none !important; }
    }
    .btn-primary:hover { background-color: #bfff00 !important; transform: translateY(-2px); }
    .btn-secondary:hover { border-color: #D4FF00 !important; color: #D4FF00 !important; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#09090b;">
      <tr>
        <td align="center" style="padding: 20px 0;">

          <!-- HEADER -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td align="center" style="padding: 30px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right: 12px;">
                      <img src="https://fsbhbfltathfcpvcjfzt.supabase.co/storage/v1/object/public/social-media/dynabolic-icon.png" alt="Dynabolic" width="40" height="40" style="display:block; border-radius: 10px;">
                    </td>
                    <td style="font-size: 22px; font-weight: 800; color: #D4FF00; letter-spacing: 3px; text-transform: uppercase;">
DYNABOLIC
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- HERO SECTION -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 20px; border: 1px solid rgba(212,255,0,0.15); overflow: hidden;">
                  <tr>
                    <td style="padding: 50px 40px; text-align: center;">
                      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #D4FF00; letter-spacing: 4px; text-transform: uppercase;">
                        Koç Hesabın Aktif Edildi
                      </p>
                      <h1 class="hero-title" style="margin: 0 0 20px 0; font-size: 38px; line-height: 44px; font-weight: 800; color: #ffffff;">
                        Komuta Merkezine <br>Hoş Geldin Kaptan, {{isim}}!
                      </h1>
                      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 26px; color: #a1a1aa;">
                        İşini büyütmek, öğrencilerini profesyonelce yönetmek ve Excel kaosundan kurtulmak için ihtiyacın olan her şey burada. Sana özel panelin ve sistem e-postan hazır.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td style="border-radius: 12px; background: #D4FF00;">
                            <a href="{{baslangic_linki}}" class="btn-primary" style="display: inline-block; padding: 16px 40px; font-size: 15px; font-weight: 800; color: #09090b; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                              Koç Paneline Giriş Yap
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FEATURES SECTION -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 40px 40px 0;">
                <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center;">Seni Neler Bekliyor?</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-right: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">🛡️</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Özel Koç Paneli</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Kendi e-postan ve alan adınla entegre sistem. Otonom mailler ve profesyonel komuta merkezi.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-left: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">⚡</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">AI Program Mimarı</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Öğrencinin değerlerini gir, yapay zeka saniyeler içinde taslak antrenman ve beslenme programı üretsin.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td height="8" colspan="2"></td></tr>
                  <tr>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-right: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">🚨</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Churn Risk Radarı</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Sisteme girmeyen veya diyeti bozan sporcuları sistem 'Kırmızı Alarm' ile önden sana bildirsin.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-left: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">💬</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Merkezi İletişim Üssü</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">WhatsApp kaosundan kurtul. Tüm form videolarını ve öğrenci mesajlarını tek bir inbox'ta yönet.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td height="8" colspan="2"></td></tr>
                  <tr>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-right: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">🧠</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Anlık AI Revizyon</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Öğrencinin gelişimi durduğunda AI anında 'Kaloriyi %10 düşür' gibi stratejik tavsiyeler sunsun.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-left: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">🛍️</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Entegre E-Mağaza</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Kendi ürünlerini, kür planlarını ve e-kitaplarını platform içinde doğrudan kendi mağazanda sat.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td height="8" colspan="2"></td></tr>
                  <tr>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-right: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">📊</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">Makro-Saykıl Planı</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">RPE, RIR, Tempo ve Toplam Tonaj. Elit sporcuları yönetmen için gereken tüm profesyonel araçlar.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mobile-stack" width="48%" valign="top" style="padding-left: 8px; padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 8px 0; font-size: 28px;">🎨</p>
                            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #D4FF00;">İçerik Stüdyosu</p>
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa;">Öğrenci başarılarını (Before/After) tek tıkla şık görsellere dönüştür, sosyal medyada paylaş.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- MORE FEATURES BANNER -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 16px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(90deg, rgba(212,255,0,0.08) 0%, rgba(212,255,0,0.03) 100%); border: 1px solid rgba(212,255,0,0.15); border-radius: 12px;">
                  <tr>
                    <td style="padding: 16px 24px; text-align: center;">
                      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #D4FF00; letter-spacing: 2px; text-transform: uppercase;">+ VE İŞİNİ ÖLÇEKLEMENİ SAĞLAYACAK 20'DEN FAZLA KURUMSAL ÖZELLİK...</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- MOTIVATION SECTION -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                  <tr>
                    <td style="padding: 0;" width="45%">
                      <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=300&fit=crop" alt="Coaching" width="100%" style="display: block; border-radius: 16px 0 0 16px; object-fit: cover; min-height: 200px;">
                    </td>
                    <td style="padding: 30px;" width="55%">
                      <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Excel'i Çöpe At, İmparatorluğunu Kur.</h3>
                      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #a1a1aa;">Finansal takipler, otonom faturalar, alt koç yetkilendirmeleri ve hak edişler. Sen sadece koçluğa odaklan, geri kalan operasyonu sistem yönetsin.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- TESTIMONIAL -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 24px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 26px; color: #d4d4d8; font-style: italic;">
                        "Dynabolic'e geçmeden önce 20 öğrenciden sonra tıkanıyordum. Şimdi otonom sistemler sayesinde kalitemden ödün vermeden 80 aktif sporcuyu tek ekranda yönetiyorum."
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right: 12px;">
                            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face" alt="Burak" width="44" height="44" style="border-radius: 50%; display: block;">
                          </td>
                          <td>
                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff;">Burak K.</p>
                            <p style="margin: 0; font-size: 12px; color: #71717a;">Master Coach &amp; Dynabolic Partner</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FINAL CTA -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); border-radius: 16px; border: 1px solid rgba(212,255,0,0.2);">
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <h3 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">İlk Öğrencini Davet Et</h3>
                      <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa;">Hemen koç paneline giriş yap, ilk davetiyeni gönder ve ekibini kurmaya başla.</p>
                      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td style="border-radius: 12px; background: #D4FF00;">
                            <a href="{{baslangic_linki}}" class="btn-primary" style="display: inline-block; padding: 14px 36px; font-size: 14px; font-weight: 800; color: #09090b; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                              Komuta Merkezine Git
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FOOTER -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
            <tr>
              <td class="mobile-pad" style="padding: 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" align="center">
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <img src="https://fsbhbfltathfcpvcjfzt.supabase.co/storage/v1/object/public/social-media/dynabolic-icon.png" alt="Dynabolic" width="32" height="32" style="display:inline-block; border-radius: 8px; vertical-align: middle;">
                      &nbsp;
                      <span style="font-size: 16px; font-weight: 700; color: #D4FF00; letter-spacing: 2px; vertical-align: middle;">DYNABOLIC</span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #71717a;">Dynabolic Coaching Platform</p>
                      <p style="margin: 4px 0 0 0; font-size: 11px; color: #52525b;">Next-Gen Fitness &amp; Business OS</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 11px; line-height: 18px; color: #52525b;">Bu e-posta sana Dynabolic platformunda koç hesabı oluşturduğun için gönderilmiştir. Eğer bu maili yanlışlıkla aldığını düşünüyorsan, destek ekibimizle iletişime geçebilirsin.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p style="margin: 0; font-size: 11px; color: #52525b;">
                        <a href="#" style="color: #71717a; text-decoration: underline;">Abonelikten Çık</a> &nbsp;|&nbsp;
                        <a href="#" style="color: #71717a; text-decoration: underline;">Gizlilik Politikası</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </center>
</body>
</html>$$
WHERE name = 'Kaptan Hoş Geldin';