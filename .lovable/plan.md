

# Mevcut Yapıyı Koruyarak Template Sistemini Entegre Etme

## Sorun
Önceki değişiklik `Programs.tsx` sayfasını tamamen yeniden yazdı ve eski bileşenleri (ProgramDashboard, WorkoutBuilder, ProgramLibrary, WeeklySchedule, NutritionBuilder) devre dışı bıraktı. Schedule sayfası da etkilendi.

## Çözüm
`Programs.tsx` sayfasını **tab yapısıyla** yeniden düzenleyerek hem eski bileşenleri hem de yeni template sistemini bir arada sunmak.

### `src/pages/Programs.tsx` Yeniden Yapılandırma

Sayfa iki ana tab içerecek:

1. **"Program Mimarı"** tab — Mevcut `ProgramDashboard`, `ProgramLibrary`, `WorkoutBuilder`, `WeeklySchedule`, `NutritionBuilder` bileşenlerini aynen kullanır (eski yapı korunur)
2. **"Şablon Kütüphanesi"** tab — Yeni `TemplateDashboard`, `RoutineBuilder`, `AssignTemplateDialog` bileşenlerini kullanır

```text
┌──────────────────────────────────────────┐
│  [Program Mimarı]  [Şablon Kütüphanesi]  │
├──────────────────────────────────────────┤
│                                          │
│   Tab'a göre ilgili bileşenler render    │
│                                          │
└──────────────────────────────────────────┘
```

### Değişiklikler

| Dosya | Değişiklik |
|-------|-----------|
| `src/pages/Programs.tsx` | Tabs bileşeni ekle. İlk tab: eski ProgramDashboard akışı (create/edit/library/builder). İkinci tab: TemplateDashboard/RoutineBuilder akışı. |

### Eski Program Mimarı Tab İçeriği
- Mevcut `ProgramDashboard` bileşenini default olarak gösterir
- "Program Oluştur" tıklanınca 3 panelli layout açılır: `ProgramLibrary` (sol) + `WorkoutBuilder` (orta) + `WeeklySchedule` (sağ)
- Beslenme modunda: `ProgramLibrary` (sol) + `NutritionBuilder` (orta) + `WeeklySchedule` (sağ)
- Tüm eski import'lar ve state yönetimi geri getirilir

### Şablon Kütüphanesi Tab İçeriği  
- Mevcut `TemplateDashboard` → `RoutineBuilder` → `AssignTemplateDialog` akışı aynen kalır

### Schedule Sayfası
Schedule sayfası zaten çalışır durumda — `WorkoutBuilderModal` ve `WorkoutDetailModal` bileşenleriyle birlikte `/schedule` rotasında aktif. Herhangi bir değişiklik gerekmez.

### UI İyileştirmeleri
- Tabs bileşeni için Radix `Tabs` kullanılacak
- Her tab geçişinde state sıfırlanmayacak (bileşen unmount olmayacak)
- Tutarlı spacing ve tipografi

**Özet:** Tek dosya değişikliği — `src/pages/Programs.tsx`. Diğer bileşenlere dokunulmaz.

