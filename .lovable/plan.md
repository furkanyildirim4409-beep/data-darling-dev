## Kapsam (sadece Part 1 — koç paneli)

`exercise_library` gerçek şeması: `id, name, category, target_muscle, video_url`. `gif_url` / `target_muscle_group` yok — `video_url` zaten GIF/preview asset URL'i olarak kullanılıyor.

Mevcut akış (`Programs.tsx` + `useValidExercises` + edge function) pre-fetch + isim kilitleme + `video_url` geri-eşlemeyi zaten yapıyor. Eksik olan: prompt'un mutlak sözlük kısıtı yeterince sert değil, ve geri-eşlemede `exercise_library.id` saklanmıyor (ileride asset çözümleme için faydalı).

## Değişiklikler

### 1) `supabase/functions/generate-ai-program/index.ts`
- System prompt'u sertleştir: "MUTLAK KURAL" bloğu — listede olmayan hiçbir isim üretme; emin değilsen listeden en yakın eşleşmeyi seç; çeviri/varyant/uydurma yasak.
- Tool şemasına `name` alanı için açıklamayı güncelle: "MUST be an exact verbatim string from the provided dictionary."
- Listeyi `target_muscle` ile birlikte (opsiyonel etiket olarak) iletmek için payload'da `validExercises: Array<{ name: string; target_muscle?: string }>` kabul et; geriye dönük uyumluluk için string[] de kabul et.

### 2) `src/hooks/useValidExercises.ts`
- Halihazırda `id, name, category, target_muscle, video_url` çekiyor — değişiklik yok. (Sadece doğrulama.)

### 3) `src/pages/Programs.tsx` (`handleAIGenerate`)
- Edge function'a artık `{ name, target_muscle }` objeleri gönder.
- Geri-mapping loop'unda eşleşen `exercise_library` satırının `id`'sini `libraryExerciseId` olarak ProgramExercise'a yaz (gelecekteki asset rendering için kanca; UI davranışını bozmaz). Eşleşme yoksa exercise atla + tek toast uyarısı ("X egzersiz kütüphanede bulunamadığı için atlandı").
- `videoUrl` zaten `match.video_url`'den geliyor — GIF olarak kullanılan field bu, dokunma.

### 4) `src/components/program-architect/AIGeneratorModal.tsx`
- Değişiklik yok (modal sadece parametre topluyor).

## Kapsam Dışı
- Part 2 (athlete app `Antrenman.tsx` çoklu workout bug'ı) — ayrı repo, atlandı.
- DB şema değişikliği yok.
- `ProgramExercise` tipine yeni alan eklemek bileşik tip dokunuşu gerektirir; sadece runtime objeye eklenir, type opsiyonel olarak genişletilir.
