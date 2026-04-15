CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read system or own templates"
ON public.email_templates FOR SELECT TO authenticated
USING (is_system = true OR owner_id = auth.uid());

CREATE POLICY "Users can insert own templates"
ON public.email_templates FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own templates"
ON public.email_templates FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own templates"
ON public.email_templates FOR DELETE TO authenticated
USING (owner_id = auth.uid());

INSERT INTO public.email_templates (owner_id, name, subject, body_html, is_system) VALUES
(NULL, 'Hoş Geldin (Kurumsal)', 'Hoş Geldiniz, {{isim}}!',
 '<p>Merhaba {{isim}},</p><p>Ailemize hoş geldiniz! Size en iyi hizmeti sunmak için buradayız. Herhangi bir sorunuz olursa lütfen çekinmeden bize ulaşın.</p><p>Saygılarımızla,<br/>Koçunuz</p>',
 true),
(NULL, 'Antrenman Programı Hatırlatması', 'Yeni Antrenman Programınız Hazır, {{isim}}!',
 '<p>Merhaba {{isim}},</p><p>Yeni antrenman programınız sisteme yüklenmiştir. Lütfen uygulamadan programınızı inceleyiniz ve sorularınız için bizimle iletişime geçiniz.</p><p>Başarılar dileriz!</p>',
 true);