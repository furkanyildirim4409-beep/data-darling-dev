## Sorun
`Register.tsx` sayfasında koç kayıt olurken `signUp` metadata'ya `role: 'coach'` gönderiyor, ancak veritabanındaki `public.handle_new_user()` trigger fonksiyonu (son güvenlik/pentest migrasyonlarından sonra) metadata'yı yok sayıp **her yeni kullanıcıyı sabit olarak `athlete`** kaydediyor:

```sql
INSERT INTO public.profiles (..., role, ...) VALUES (..., 'athlete', ...);
INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'athlete') ...
```

Bu yüzden koç panelinden `Kayıt Ol` diyen kullanıcı `profiles.role = 'athlete'` oluyor, `ProtectedRoute` `allowedRoles=['coach']` kontrolüne takılıp **"Yetkisiz Erişim"** hatası alıyor.

## Çözüm
Tek bir migration ile `handle_new_user()` fonksiyonunu düzeltmek:

1. `raw_user_meta_data->>'role'` değerini oku, sadece `'coach'` veya `'athlete'` olarak whitelist et; yoksa `'athlete'` fallback.
2. Eğer `raw_user_meta_data->>'invite_token'` varsa (sporcu daveti akışı) → zorla `athlete`.
3. `profiles.role` ve `user_roles.role` bu doğru değerle yazılsın.
4. Koç ise `handle_coach_signup` benzeri mevcut mantık bozulmasın — sadece rol atanışını düzeltiyoruz, başka alanlara dokunmuyoruz.

## Etkilenmeyen alanlar
- `Register.tsx`, `AuthContext.tsx`, edge functions — değişiklik yok, halihazırda doğru metadata gönderiyorlar.
- RLS policy'leri — dokunulmayacak; sadece trigger düzeltilecek.
- Zaten yanlış kaydolmuş kullanıcılar için: onaylarsan ayrı bir data-fix (`UPDATE profiles SET role='coach' WHERE id IN (...)`) çalıştırılabilir; hangi kullanıcıları düzelteceğimizi söylersen listeyi ID/email üzerinden güncelleriz.

## Teknik detay (migration özeti)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_username text;
  v_role text;
BEGIN
  v_username := lower(trim(new.raw_user_meta_data->>'username'));
  IF v_username IS NULL OR v_username !~ '^[a-z0-9_]{3,20}$' THEN v_username := NULL; END IF;

  v_role := lower(coalesce(new.raw_user_meta_data->>'role',''));
  IF NULLIF(new.raw_user_meta_data->>'invite_token','') IS NOT NULL THEN
    v_role := 'athlete';
  ELSIF v_role NOT IN ('coach','athlete') THEN
    v_role := 'athlete';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role, email, username)
  VALUES (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url',
          v_role, new.email, v_username)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = CASE WHEN public.profiles.username IS NULL THEN EXCLUDED.username ELSE public.profiles.username END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, v_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END; $$;
```

Onay verirsen migration'ı gönderirim; ayrıca yanlış kaydolmuş mevcut koçları düzeltmemi istiyorsan email/ID listesini paylaş.