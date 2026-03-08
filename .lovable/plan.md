
# Settings Sayfasını Supabase'e Bağlama Planı

## Mevcut Durum
- `Settings.tsx` tamamen hardcoded mock verilerle çalışıyor
- `AuthContext` profile'ı çekiyor ama sınırlı alanlar var (gym_name, specialty, bio, subscription_tier, notification_preferences eksik)
- Avatar yüklemesi için storage bucket yok
- `refreshProfile` fonksiyonu mevcut değil

## Yapılacak Değişiklikler

### 1. Database: Avatar Storage Bucket Oluştur
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- RLS: Authenticated users can upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 2. AuthContext Güncellemeleri
- Profile interface'e `gym_name`, `specialty`, `bio`, `subscription_tier`, `notification_preferences` ekle
- `refreshProfile()` fonksiyonu ekle ve export et

### 3. Settings.tsx Tam Yeniden Yazım

**Yeni Bölümler:**
| Bölüm | İçerik |
|-------|--------|
| Profil | Ad, Avatar (upload), Bio, E-posta (readonly) |
| Marka Kimliği | gym_name, specialty |
| Abonelik | subscription_tier gösterimi, plan karşılaştırma kartları |
| Bildirimler | email/push/alerts toggle'ları (notification_preferences JSONB) |
| Güvenlik | Şifre değiştirme (Supabase Auth API) |
| Görünüm | Tema seçimi (localStorage) |
| Veri | Gerçek veri export |

**Temel Akış:**
```
useAuth() → profile, user, refreshProfile
↓
Form state'leri (fullName, bio, gymName, specialty, notificationPrefs)
↓
handleSaveProfile() → supabase.from('profiles').update() → refreshProfile()
↓
toast.success("Profil güncellendi")
```

**Avatar Upload:**
```
<input type="file" onChange={handleAvatarUpload} />
↓
supabase.storage.from('avatars').upload(`${userId}/avatar.jpg`, file)
↓
getPublicUrl → update profiles.avatar_url
```

### 4. Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `src/contexts/AuthContext.tsx` | Profile interface genişlet, refreshProfile ekle |
| `src/pages/Settings.tsx` | Tamamen yeniden yaz, Supabase'e bağla |

### Teknik Detaylar

**Notification Preferences JSONB yapısı:**
```json
{ "email": true, "push": true, "alerts": true }
```

**Subscription Tiers:**
- Free (mevcut)
- Pro (₺499/ay - mock upgrade)
- Elite (₺999/ay - mock upgrade)

**Password Update:**
```typescript
await supabase.auth.updateUser({ password: newPassword })
```
