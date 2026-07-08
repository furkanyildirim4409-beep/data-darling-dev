## Amaç
`coach_contracts` tablosunu oluştur, Faz 3'te `profiles.contract_template` üzerinde tutulan sözleşme verisini bu tabloya taşı ve `useCoachContract` hook'unu yeni kaynağa yönlendir. `athlete_intake_forms` ve `coach_athletes` tabloları için ek migration yok.

## Neden bu kapsam
- `athlete_intake_forms` zaten spec ile uyumlu (`kvkk_accepted`+`agreement_accepted` kolonları, athlete self-insert & coach read RLS'i mevcut). Ek DDL gereksiz.
- `coach_athletes` mimaride yok; koç-sporcu bağı `profiles.coach_id` + `profiles.active_package_level` ile yürüyor ve Faz 4 UI bu alanları kullanıyor. Yeni bir mapping tablosu paralel gerçek kaynak yaratır — kapsam dışı.

## 1. Migration — `coach_contracts` tablosu

```sql
CREATE TABLE public.coach_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_contracts TO authenticated;
GRANT ALL ON public.coach_contracts TO service_role;

ALTER TABLE public.coach_contracts ENABLE ROW LEVEL SECURITY;

-- Coach + head-coach team üyeleri: kendi/patron kayıtlarını yönet
CREATE POLICY "coach_manage_own_contract"
  ON public.coach_contracts FOR ALL
  TO authenticated
  USING (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id))
  WITH CHECK (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));

-- Sporcu: KENDİ koçunun sözleşmesini okuyabilir (paket satın alma / görüntüleme akışı için)
CREATE POLICY "athlete_read_own_coach_contract"
  ON public.coach_contracts FOR SELECT
  TO authenticated
  USING (
    coach_id IN (
      SELECT p.coach_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.coach_id IS NOT NULL
    )
  );

-- updated_at trigger
CREATE TRIGGER coach_contracts_touch_updated_at
  BEFORE UPDATE ON public.coach_contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Faz 3 verisini taşı
INSERT INTO public.coach_contracts (coach_id, content, created_at, updated_at)
SELECT id, contract_template,
       COALESCE(contract_updated_at, now()),
       COALESCE(contract_updated_at, now())
FROM public.profiles
WHERE role = 'coach'
  AND contract_template IS NOT NULL
  AND btrim(contract_template) <> ''
ON CONFLICT (coach_id) DO NOTHING;
```

Not: `profiles.contract_template` ve `contract_updated_at` kolonlarına şimdilik dokunulmuyor (deprecated). İleride ayrı bir temizlik migration'ı ile drop edilebilir.

## 2. Kod güncellemesi — `src/hooks/useCoachContract.ts`
- `profiles` yerine `coach_contracts` sorgulanır.
- `activeCoachId` üzerinden `.eq('coach_id', activeCoachId)` + `.maybeSingle()`.
- Save akışı `upsert({ coach_id: activeCoachId, content }, { onConflict: 'coach_id' })` olur.
- `updated_at` alanı DB tarafından set edilir (trigger). Hook UI için `contract_updated_at` yerine `updated_at` alanını döner; kullanan bileşen (`CoachingContractSettings.tsx`) buna göre isim güncellenir.

## 3. Tip senkronu — `src/integrations/supabase/types.ts`
- Migration çalıştıktan sonra Supabase tarafından otomatik üretilir. Elle düzenlenmez.
- Migration onaylanıp uygulandıktan sonra kodu regeneration ile paralel tutmak yeterli; ek dosya yazımı gerekmez.

## Dokunulan dosyalar
- `supabase/migrations/<timestamp>_create_coach_contracts.sql` (yeni)
- `src/hooks/useCoachContract.ts` (kaynak tablo değişikliği)
- `src/components/settings/CoachingContractSettings.tsx` (alan adı: `updated_at`)

## Kapsam dışı
- `coach_athletes` tablosu (kullanıcı onayıyla atlandı)
- `athlete_intake_forms` DDL (mevcut ve uyumlu)
- `profiles.contract_template` sütununu drop etmek (ayrı bir cleanup için)
- Athlete-side sözleşme onay akışı (Faz 4/5)
