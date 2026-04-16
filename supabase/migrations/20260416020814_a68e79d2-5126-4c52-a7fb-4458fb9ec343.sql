-- Update Athlete Welcome Template with High-End HTML
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
<body style="margin: 0; padding: 0; background-color: #09090b;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
          <tr>
            <td style="padding: 48px 40px; text-align: center; border-bottom: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="https://app.dynabolic.co/logo.png" alt="DYNABOLIC" width="180" style="display: block; max-width: 180px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 48px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 8px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #D4FF00; text-transform: uppercase; letter-spacing: 2px;">Hesabın Aktif Edildi</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <h1 class="hero-title" style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 42px; font-weight: 800; color: #fafafa; line-height: 48px; letter-spacing: -1px;">Sınırlarını Zorlamaya <br>Hazır Mısın, {{isim}}?</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 32px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; color: #a1a1aa; line-height: 26px;">Aramıza hoş geldin. Antrenman deneyimini devrimleştirecek 4 süper gücün hazır. Bahaneleri geride bırak, dönüşüm bugün başlıyor.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="btn-primary" style="background-color: #D4FF00; border-radius: 8px; transition: all 0.2s ease;">
                          <a href="{{baslangic_linki}}" style="display: inline-block; padding: 16px 32px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #09090b; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Dönüşümüne Başla</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 40px; background-color: #09090b; border-top: 1px solid #27272a; border-bottom: 1px solid #27272a;">
              <p style="margin: 0 0 32px 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 2px; text-align: center;">Seni Neler Bekliyor?</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="mobile-stack" width="48%" valign="top" style="padding-right: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">📸</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">AI NutriScanner</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Kalori saymayı bırak. Tabağını çek, yapay zeka saniyeler içinde makrolarını hesaplasın.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="mobile-stack" width="48%" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">👁️</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Vision AI Form</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Sakatlanma riskini sıfırla. Kamera seni izlesin, hareket formunu anında düzeltsin.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16">&nbsp;</td></tr>
                <tr>
                  <td class="mobile-stack" width="48%" valign="top" style="padding-right: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">🪙</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">BioCoin Rewards</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Terledikçe kazan! Antrenmanlarını bitir, BioCoin topla ve gerçek ödüllere dönüştür.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="mobile-stack" width="48%" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">⌚</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Wearable Sync</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Akıllı saatini bağla, uyku ve aktivite verilerin yapay zeka analizleriyle harmanlansın.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #D4FF00; text-transform: uppercase; letter-spacing: 2px;">VE PERFORMANSINI ZİRVEYE TAŞIYACAK 20'DEN FAZLA YENİ NESİL ÖZELLİK...</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 48px 40px; background: linear-gradient(135deg, #18181b 0%, #09090b 100%); border-top: 1px solid #27272a; border-bottom: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://app.dynabolic.co/trophy-icon.png" alt="Trophy" width="64" style="display: block;">
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 12px;">
                    <h2 style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 24px; font-weight: 700; color: #fafafa;">Her Ter Damlası, Yeni Bir Zafer.</h2>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #a1a1aa; line-height: 22px;">Rakiplerin dinlenirken sen gelişiyorsun. Günlük hedeflerini tamamla, rozetleri topla ve kendi limitlerini yeniden yaz.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; color: #e4e4e7; line-height: 26px; font-style: italic;">"Dynabolic sadece bir takip uygulaması değil, cebimdeki acımasız bir baş antrenör. Sadece 12 haftada tüm kişisel rekorlarımı paramparça ettim."</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 12px;">
                                <img src="https://app.dynabolic.co/avatar-emirkan.png" alt="Emirkan T." width="48" height="48" style="border-radius: 50%; display: block;">
                              </td>
                              <td>
                                <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 700; color: #fafafa;">Emirkan T.</p>
                                <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #71717a;">Pro Atlet & Dynabolic Üyesi</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 48px 40px; background-color: #D4FF00; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <h2 style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 24px; font-weight: 800; color: #09090b;">Hala Bekliyor Musun?</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #09090b;">İlk antrenmanın seni bekliyor. Uygulamayı aç ve bugün eyleme geç.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td class="btn-secondary" style="background-color: transparent; border-radius: 8px; border: 2px solid #09090b; transition: all 0.2s ease;">
                          <a href="{{baslangic_linki}}" style="display: inline-block; padding: 14px 28px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 700; color: #09090b; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Gelişimini Takip Et</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 32px 40px; text-align: center; border-top: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <img src="https://app.dynabolic.co/logo-dark.png" alt="Dynabolic" width="120" style="display: block; margin: 0 auto;">
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 700; color: #fafafa;">Dynabolic Coaching Platform</p>
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #71717a;">Next-Gen Fitness & Nutrition Tracking</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #52525b; line-height: 18px;">Bu e-posta sana Dynabolic platformuna kayıt olduğun için gönderilmiştir. Eğer bu maili yanlışlıkla aldığını düşünüyorsan, destek ekibimizle iletişime geçebilirsin.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px;">
                    <a href="https://app.dynabolic.co/unsubscribe" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #71717a; text-decoration: underline;">Abonelikten Çık</a> | 
                    <a href="https://app.dynabolic.co/privacy" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #71717a; text-decoration: underline;">Gizlilik Politikası</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$
WHERE name = 'Premium Hoş Geldin' AND is_system = true;

-- Update Coach Welcome Template with High-End HTML
UPDATE public.email_templates
SET body_html = $$<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Dynabolic - Koç Hesabın Aktif Edildi</title>
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
<body style="margin: 0; padding: 0; background-color: #09090b;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
          <tr>
            <td style="padding: 48px 40px; text-align: center; border-bottom: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="https://app.dynabolic.co/logo.png" alt="DYNABOLIC" width="180" style="display: block; max-width: 180px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 48px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 8px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #D4FF00; text-transform: uppercase; letter-spacing: 2px;">Koç Hesabın Aktif Edildi</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <h1 class="hero-title" style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 42px; font-weight: 800; color: #fafafa; line-height: 48px; letter-spacing: -1px;">Komuta Merkezine <br>Hoş Geldin Kaptan, {{isim}}!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 32px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; color: #a1a1aa; line-height: 26px;">İşini büyütmek, öğrencilerini profesyonelce yönetmek ve Excel kaosundan kurtulmak için ihtiyacın olan her şey burada. Sana özel panelin ve sistem e-postan hazır.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="btn-primary" style="background-color: #D4FF00; border-radius: 8px; transition: all 0.2s ease;">
                          <a href="{{baslangic_linki}}" style="display: inline-block; padding: 16px 32px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #09090b; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Koç Paneline Giriş Yap</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 40px; background-color: #09090b; border-top: 1px solid #27272a; border-bottom: 1px solid #27272a;">
              <p style="margin: 0 0 32px 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 2px; text-align: center;">Seni Neler Bekliyor?</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="mobile-stack" width="48%" valign="top" style="padding-right: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">🛡️</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Özel Koç Paneli</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Kendi e-postan ve alan adınla entegre sistem. Otonom mailler ve profesyonel komuta merkezi.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="mobile-stack" width="48%" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">⚡</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">AI Program Mimarı</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Öğrencinin değerlerini gir, yapay zeka saniyeler içinde taslak antrenman ve beslenme programı üretsin.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16">&nbsp;</td></tr>
                <tr>
                  <td class="mobile-stack" width="48%" valign="top" style="padding-right: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">🚨</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Churn Risk Radarı</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Sisteme girmeyen veya diyeti bozan sporcuları sistem 'Kırmızı Alarm' ile önden sana bildirsin.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="mobile-stack" width="48%" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">💬</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Merkezi İletişim Üssü</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">WhatsApp kaosundan kurtul. Tüm form videolarını ve öğrenci mesajlarını tek bir inbox'ta yönet.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16">&nbsp;</td></tr>
                <tr>
                  <td class="mobile-stack" width="48%" valign="top" style="padding-right: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">🧠</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Anlık AI Revizyon</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Öğrencinin gelişimi durduğunda AI anında 'Kaloriyi %10 düşür' gibi stratejik tavsiyeler sunsun.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="mobile-stack" width="48%" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">🛍️</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Entegre E-Mağaza</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Kendi ürünlerini, kür planlarını ve e-kitaplarını platform içinde doğrudan kendi mağazanda sat.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16">&nbsp;</td></tr>
                <tr>
                  <td class="mobile-stack" width="48%" valign="top" style="padding-right: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">📊</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">Makro-Saykıl Planı</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">RPE, RIR, Tempo ve Toplam Tonaj. Elit sporcuları yönetmen için gereken tüm profesyonel araçlar.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="mobile-stack" width="48%" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                            <tr><td align="center" valign="middle" style="font-size: 24px;">🎨</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; color: #fafafa;">İçerik Stüdyosu</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #a1a1aa; line-height: 20px;">Öğrenci başarılarını (Before/After) tek tıkla şık görsellere dönüştür, sosyal medyada paylaş.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #D4FF00; text-transform: uppercase; letter-spacing: 2px;">+ VE İŞİNİ ÖLÇEKLEMENİ SAĞLAYACAK 20'DEN FAZLA KURUMSAL ÖZELLİK...</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 48px 40px; background: linear-gradient(135deg, #18181b 0%, #09090b 100%); border-top: 1px solid #27272a; border-bottom: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://app.dynabolic.co/coach-icon.png" alt="Coach" width="64" style="display: block;">
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 12px;">
                    <h2 style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 24px; font-weight: 700; color: #fafafa;">Excel'i Çöpe At, İmparatorluğunu Kur.</h2>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #a1a1aa; line-height: 22px;">Finansal takipler, otonom faturalar, alt koç yetkilendirmeleri ve hak edişler. Sen sadece koçluğa odaklan, geri kalan operasyonu sistem yönetsin.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; color: #e4e4e7; line-height: 26px; font-style: italic;">"Dynabolic'e geçmeden önce 20 öğrenciden sonra tıkanıyordum. Şimdi otonom sistemler sayesinde kalitemden ödün vermeden 80 aktif sporcuyu tek ekranda yönetiyorum."</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 12px;">
                                <img src="https://app.dynabolic.co/avatar-burak.png" alt="Burak K." width="48" height="48" style="border-radius: 50%; display: block;">
                              </td>
                              <td>
                                <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 700; color: #fafafa;">Burak K.</p>
                                <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #71717a;">Master Coach & Dynabolic Partner</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 48px 40px; background-color: #D4FF00; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <h2 style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 24px; font-weight: 800; color: #09090b;">İlk Öğrencini Davet Et</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #09090b;">Hemen koç paneline giriş yap, ilk davetiyeni gönder ve ekibini kurmaya başla.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td class="btn-secondary" style="background-color: transparent; border-radius: 8px; border: 2px solid #09090b; transition: all 0.2s ease;">
                          <a href="{{baslangic_linki}}" style="display: inline-block; padding: 14px 28px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 700; color: #09090b; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Komuta Merkezine Git</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding: 32px 40px; text-align: center; border-top: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <img src="https://app.dynabolic.co/logo-dark.png" alt="Dynabolic" width="120" style="display: block; margin: 0 auto;">
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 700; color: #fafafa;">Dynabolic Coaching Platform</p>
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #71717a;">Next-Gen Fitness & Business OS</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #52525b; line-height: 18px;">Bu e-posta sana Dynabolic platformunda koç hesabı oluşturduğun için gönderilmiştir. Eğer bu maili yanlışlıkla aldığını düşünüyorsan, destek ekibimizle iletişime geçebilirsin.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px;">
                    <a href="https://app.dynabolic.co/unsubscribe" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #71717a; text-decoration: underline;">Abonelikten Çık</a> | 
                    <a href="https://app.dynabolic.co/privacy" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #71717a; text-decoration: underline;">Gizlilik Politikası</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$
WHERE name = 'Kaptan Hoş Geldin' AND is_system = true;