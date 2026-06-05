## Goal
Upgrade `/alerts` so coaches can (A) jump straight to an athlete's program tab from program alerts, (B) send a one-tap check-in reminder (inbox row + push), and (C) fire those reminders in bulk when the "Check-in Yapmayanlar" filter is active.

## Schema note (important deviation from spec)
The existing `public.athlete_notifications` table uses columns: `athlete_id`, `coach_id`, `title`, `message`, `type`, `is_read`, `source_insight_id`, `metadata`, `action_url` — NOT `profile_id`/`body`/`category` as in the spec. The implementation will use the real column names. No migration needed.

## Files touched
- `src/components/alerts/AlertActionCard.tsx`
- `src/pages/Alerts.tsx`

## A. Deep-link "Programı Yenile" (AlertActionCard.tsx)
- `useNavigate` is already imported.
- Replace `handleRefreshProgram` (currently opens `ProgramSelectModal`) with:
  ```ts
  if (alert.athleteId) navigate(`/athletes/${alert.athleteId}?tab=program`);
  else navigate('/athletes');
  ```
- Remove the now-unused `ProgramSelectModal` import, `isProgramModalOpen` state, and its JSX render. Drop the unused `athleteName` variable too.

## B. Single "Hatırlat" reminder (AlertActionCard.tsx)
- Add `useAuth` to grab `activeCoachId`.
- New handler `handleRemindSingle` invoked from the existing "Hatırlat" button (currently `handleRemind`, which only toasts). Used by both `payment` and `checkin` cases (the latter is the primary target; keep behavior identical so the payment "Hatırlat" also benefits).
  ```ts
  const handleRemindSingle = async () => {
    if (!alert.athleteId) { toast({ title: "Hata", description: "Sporcu bulunamadı.", variant: "destructive" }); return; }
    try {
      await supabase.from('athlete_notifications').insert({
        athlete_id: alert.athleteId,
        coach_id: activeCoachId ?? null,
        title: "Check-in Zamanı! ⚡",
        message: "Koçunuz form durumunuzu incelemek için check-in yapmanızı bekliyor.",
        type: 'checkin_reminder',
        is_read: false,
      });
      await supabase.functions.invoke('send-chat-push', {
        body: { userId: alert.athleteId, title: "Check-in Zamanı!", body: "Koçunuz form verilerinizi bekliyor." },
      }).catch(() => {}); // silent push failure tolerated
      toast({ title: "Hatırlatma gönderildi" });
    } catch {
      toast({ title: "Hata", description: "Bildirim gönderilemedi.", variant: "destructive" });
    }
  };
  ```
- Wire it to the `checkin` (and `payment`) "Hatırlat" buttons in `getActionButtons`.
- Export `handleRemindSingle`-equivalent logic from a shared helper module `src/utils/checkinReminder.ts` so the bulk marquee in `Alerts.tsx` can reuse it without duplicating SQL. The helper signature: `sendCheckinReminder(athleteId: string, coachId: string | null): Promise<void>`.

## C. Bulk "Tümü İçin Gönder" marquee (Alerts.tsx)
- Note: the spec mentions `aiInterventions` for the bulk action, but "Check-in Yapmayanlar" is a `quickFilter` mapped to `checkinAlerts` (not AI interventions). The marquee will iterate the currently filtered **check-in alerts** — that matches user intent ("send reminder to everyone missing a check-in").
- Condition to render the bar (above the alerts list inside the `lg:col-span-2` column, before the type-filter tabs):
  ```tsx
  {quickFilter === 'checkin' && filteredAlerts.length > 1 && (
    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold tracking-widest shadow-[0_0_15px_rgba(249,115,22,0.3)] mb-4" onClick={handleBulkRemind} disabled={bulkSending}>
      <Zap className="w-4 h-4 mr-2" />
      {bulkSending ? 'GÖNDERİLİYOR…' : `⚡ TÜMÜ İÇİN GÖNDER: HATIRLAT (${uniqueAthleteIds.length})`}
    </Button>
  )}
  ```
- `handleBulkRemind`:
  ```ts
  const ids = Array.from(new Set(filteredAlerts.map(a => a.athleteId).filter(Boolean))) as string[];
  setBulkSending(true);
  const results = await Promise.allSettled(ids.map(id => sendCheckinReminder(id, activeCoachId ?? null)));
  setBulkSending(false);
  const ok = results.filter(r => r.status === 'fulfilled').length;
  toast({ title: 'Toplu hatırlatma', description: `${ok}/${ids.length} sporcuya gönderildi.` });
  ```
- Add `bulkSending` state and reuse existing `Zap` import.

## Out of scope
- No DB migration (table already exists with required columns).
- AthleteDetail `?tab=program` already-handled assumption: navigation works; if the page doesn't read the query param yet, the route still lands on the athlete page — separate ticket if tab auto-select is needed.
- `ProgramSelectModal` file is left in place (other callers may exist); only this widget stops mounting it.
