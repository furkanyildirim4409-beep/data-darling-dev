

# DYNABOLIC Coach OS — Projeyi Kopyalama Planı

## Genel Bakış
[DYNABOLIC OS Interface](/projects/c985c3e1-3b6d-485d-a42b-df780a6afec8) projesindeki tüm dosyaları bu projeye birebir kopyalayacağız. Mevcut proje localStorage tabanlı auth kullanıyor — ilk aşamada olduğu gibi kopyalanacak, ardından Supabase Auth entegrasyonu yapılacak.

## Kopyalanacak Dosyalar (~70+ dosya)

### Yapılandırma
- `tailwind.config.ts` — Cyberpunk tema, custom renkler, fontlar, animasyonlar
- `src/index.css` — Neon lime tema, glow efektleri, grid pattern, scrollbar stilleri
- `package.json` — Yeni bağımlılıklar: `framer-motion`, `@dnd-kit/*`, `@react-three/fiber`, `@react-three/drei`, `three`, `@tailwindcss/typography`

### Contexts (3 dosya)
- `AuthContext.tsx` — Kimlik doğrulama (başlangıçta localStorage, sonra Supabase)
- `SearchContext.tsx` — Global arama
- `ProfileContext.tsx` — Profil verileri

### Types & Data (3 dosya)
- `types/shared-models.ts` — Athlete, Invoice, Program vb. tipler
- `data/athletes.ts` — 15 mock sporcu
- `data/alerts.ts` — 22 mock uyarı

### Layout (5 dosya)
- `MainLayout.tsx`, `AppSidebar.tsx`, `TopBar.tsx`, `MobileNav.tsx`, `GlobalSearch.tsx`

### Auth (1 dosya)
- `ProtectedRoute.tsx`

### Pages (14 dosya)
- `CommandCenter.tsx`, `Athletes.tsx`, `AthleteDetail.tsx`, `Programs.tsx`, `Alerts.tsx`, `Business.tsx`, `StoreManager.tsx`, `ContentStudio.tsx`, `Team.tsx`, `Settings.tsx`, `Performance.tsx`, `Login.tsx`, `Register.tsx`, `NotFound.tsx`

### Dashboard Components (8 dosya)
- `StatCard`, `RiskRadar`, `CompliancePulse`, `BusinessPulse`, `ActionStream`, `AlertBadge`, `AthleteCard`, `SessionsDialog`

### Athlete Detail Components (14 dosya)
- `EnergyBank`, `SmartContract`, `BodyModel3D`, `BodyModel3DViewer`, `WellnessRadar`, `BloodworkPanel`, `BloodworkDialog`, `BodyScanDialog`, `MetabolicFlux`, `TimelineAI`, `ActiveBlocks`, `ChatWidget`, `ProgramTab`, `NutritionTab`

### Athletes Components (4 dosya)
- `AthleteRoster`, `AthleteTableRow`, `QuickChatPopover`, `RapidResponse`

### Program Architect Components (7 dosya)
- `ProgramDashboard`, `ProgramLibrary`, `WorkoutBuilder`, `NutritionBuilder`, `WeeklySchedule`, `ProgramCalendar`, `SaveTemplateDialog`

### Alert Components (3 dosya)
- `AlertActionCard`, `ProgramSelectModal`, `QuickFiltersPanel`

### Business Components (3 dosya)
- `NewInvoiceDialog`, `SessionSchedulerDialog`, `InvoiceDetailDialog`

### Store Manager Components (5 dosya)
- `ProductEditor`, `ProductList`, `ProductDetailDialog`, `MobilePreview`, `SalesChart`

### Content Studio Components (6 dosya)
- `FeedPlanner`, `HighlightsSection`, `MobileProfilePreview`, `ProfileSettings`, `StoryTemplateBuilder`, `StoryUploadModal`

### Team Components (5 dosya)
- `AddMemberDialog`, `MemberProfileDrawer`, `TeamChatDialog`, `PresenceIndicator`, `NotificationBadge`

### Hooks (2 dosya)
- `useAthletes.ts`, `useTeamPresence.ts`

### Routing
- `App.tsx` — Tüm route'lar ve provider'lar

## Uygulama Sırası

1. **Bağımlılıkları ekle** — framer-motion, dnd-kit, three.js, typography plugin
2. **Tema dosyalarını kopyala** — tailwind.config.ts, index.css
3. **Temel dosyaları kopyala** — types, data, contexts, hooks
4. **Layout bileşenlerini kopyala** — MainLayout, AppSidebar, TopBar, MobileNav, GlobalSearch
5. **Auth bileşenlerini kopyala** — ProtectedRoute
6. **Tüm sayfa ve alt bileşenlerini kopyala** — 50+ component dosyası
7. **App.tsx ve routing'i güncelle**

## Veritabanı (Sonraki Aşama)
İlk kopyalama tamamlandıktan sonra, localStorage tabanlı auth ve veri yönetimini bağlı olan Supabase veritabanına taşıyacağız. Bu aşamada:
- `profiles` tablosu
- `user_roles` tablosu (güvenlik için ayrı tablo)
- `athletes` tablosu
- RLS politikaları
- Supabase Auth entegrasyonu

