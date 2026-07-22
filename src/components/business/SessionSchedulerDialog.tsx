import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useCoachSessionsWeek,
  useCreateCoachSession,
  useDeleteCoachSession,
  type CoachSession,
} from "@/hooks/useCoachSessions";
import { addDays, format, startOfWeek } from "date-fns";

const GROUP_OPTION_ID = "__group__";

const sessionTypes = [
  { value: "pt", label: "Personal Training" },
  { value: "consultation", label: "Danışmanlık" },
  { value: "group", label: "Grup Antrenmanı" },
  { value: "checkin", label: "Check-in" },
];

const turkishDays = [
  { short: "Pzt", full: "Pazartesi" },
  { short: "Sal", full: "Salı" },
  { short: "Çar", full: "Çarşamba" },
  { short: "Per", full: "Perşembe" },
  { short: "Cum", full: "Cuma" },
  { short: "Cmt", full: "Cumartesi" },
  { short: "Paz", full: "Pazar" },
];

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];

interface SessionSchedulerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toTimeCell(t: string) {
  // DB returns HH:mm:ss — normalize to HH:mm
  return t?.slice(0, 5);
}

export function SessionSchedulerDialog({ open, onOpenChange }: SessionSchedulerDialogProps) {
  const { toast } = useToast();
  const { activeCoachId } = useAuth();

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const today = new Date();
  const todayIdx = (() => {
    const d = today.getDay(); // 0=Sun..6=Sat
    return d === 0 ? 6 : d - 1;
  })();
  const isCurrentWeek =
    format(weekStart, "yyyy-MM-dd") === format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: sessions = [], isLoading } = useCoachSessionsWeek(activeCoachId, weekStart);
  const createSession = useCreateCoachSession();
  const deleteSession = useDeleteCoachSession();

  const { data: athletes = [] } = useQuery({
    queryKey: ["scheduler-athletes", activeCoachId],
    enabled: !!activeCoachId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "athlete")
        .eq("coach_id", activeCoachId as string)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null }[];
    },
  });

  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ dayIndex: number; time: string } | null>(null);
  const [newClientId, setNewClientId] = useState("");
  const [newSessionType, setNewSessionType] = useState("");
  const [newDuration, setNewDuration] = useState("60");

  const sessionsByCell = useMemo(() => {
    const map = new Map<string, CoachSession>();
    sessions.forEach((s) => {
      const dayIndex = (() => {
        const d = new Date(s.scheduled_date + "T00:00:00").getDay();
        return d === 0 ? 6 : d - 1;
      })();
      map.set(`${dayIndex}|${toTimeCell(s.scheduled_time)}`, s);
    });
    return map;
  }, [sessions]);

  const resetForm = () => {
    setShowNewSessionForm(false);
    setSelectedSlot(null);
    setNewClientId("");
    setNewSessionType("");
    setNewDuration("60");
  };

  const handleSlotClick = (dayIndex: number, time: string) => {
    if (sessionsByCell.has(`${dayIndex}|${time}`)) return;
    setSelectedSlot({ dayIndex, time });
    setShowNewSessionForm(true);
  };

  const handleCreateSession = async () => {
    if (!selectedSlot || !newClientId || !newSessionType || !activeCoachId) return;

    const isGroup = newClientId === GROUP_OPTION_ID;
    const athlete = athletes.find((a) => a.id === newClientId);
    const sessionType = sessionTypes.find((t) => t.value === newSessionType);
    const targetDate = addDays(weekStart, selectedSlot.dayIndex);

    try {
      await createSession.mutateAsync({
        coach_id: activeCoachId,
        athlete_id: isGroup ? null : newClientId,
        athlete_label: isGroup ? "Grup Antrenmanı" : athlete?.full_name || "İsimsiz",
        session_type: newSessionType,
        scheduled_date: format(targetDate, "yyyy-MM-dd"),
        scheduled_time: `${selectedSlot.time}:00`,
        duration_minutes: Number(newDuration),
      });

      toast({
        title: "Seans Planlandı",
        description: `${turkishDays[selectedSlot.dayIndex].full} ${selectedSlot.time} - ${
          isGroup ? "Grup Antrenmanı" : athlete?.full_name
        } (${sessionType?.label})`,
      });
      resetForm();
    } catch (err: any) {
      toast({
        title: "Seans oluşturulamadı",
        description: err?.message ?? "Bilinmeyen hata",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSession = async (id: string) => {
    try {
      await deleteSession.mutateAsync(id);
    } catch (err: any) {
      toast({
        title: "Seans silinemedi",
        description: err?.message ?? "Bilinmeyen hata",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="bg-card border-border sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Haftalık Seans Planlayıcı
          </DialogTitle>
          <DialogDescription>
            Boş bir zaman dilimine tıklayarak yeni seans ekleyin
          </DialogDescription>
        </DialogHeader>

        {/* Week nav */}
        <div className="flex items-center justify-between px-1">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-xs text-muted-foreground font-mono">
            {format(weekStart, "dd MMM")} – {format(addDays(weekStart, 6), "dd MMM yyyy")}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-4 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 text-xs text-muted-foreground">Saat</div>
                {turkishDays.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 text-center rounded-lg",
                      isCurrentWeek && i === todayIdx
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <p className="text-xs font-medium">{day.short}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 gap-1">
                      <div className="p-2 text-xs text-muted-foreground font-mono flex items-center">
                        {time}
                      </div>
                      {turkishDays.map((_, dayIndex) => {
                        const session = sessionsByCell.get(`${dayIndex}|${time}`);
                        const isSelected =
                          selectedSlot?.dayIndex === dayIndex && selectedSlot?.time === time;

                        return (
                          <button
                            key={dayIndex}
                            onClick={() => handleSlotClick(dayIndex, time)}
                            disabled={!!session}
                            className={cn(
                              "min-h-[40px] rounded-lg border transition-all text-left p-1.5",
                              session
                                ? "bg-primary/20 border-primary/30 cursor-default"
                                : isSelected
                                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                            )}
                          >
                            {session ? (
                              <div className="relative group">
                                <p className="text-[10px] font-medium text-primary truncate">
                                  {session.athlete_label}
                                </p>
                                <p className="text-[9px] text-muted-foreground truncate">
                                  {sessionTypes.find((t) => t.value === session.session_type)?.label ??
                                    session.session_type}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSession(session.id);
                                  }}
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {showNewSessionForm && selectedSlot && (
            <div className="w-64 border-l border-border pl-4 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Yeni Seans</h3>
                <p className="text-xs text-muted-foreground">
                  {format(addDays(weekStart, selectedSlot.dayIndex), "dd MMM")} - {selectedSlot.time}
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Müşteri</Label>
                  <Select value={newClientId} onValueChange={setNewClientId}>
                    <SelectTrigger className="h-9 text-xs bg-background/50">
                      <SelectValue placeholder="Seçin..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value={GROUP_OPTION_ID} className="text-xs">
                        Grup Antrenmanı
                      </SelectItem>
                      {athletes.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.full_name || "İsimsiz"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Seans Tipi</Label>
                  <Select value={newSessionType} onValueChange={setNewSessionType}>
                    <SelectTrigger className="h-9 text-xs bg-background/50">
                      <SelectValue placeholder="Seçin..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {sessionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-xs">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Süre (dk)</Label>
                  <Select value={newDuration} onValueChange={setNewDuration}>
                    <SelectTrigger className="h-9 text-xs bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="30" className="text-xs">30 dakika</SelectItem>
                      <SelectItem value="45" className="text-xs">45 dakika</SelectItem>
                      <SelectItem value="60" className="text-xs">60 dakika</SelectItem>
                      <SelectItem value="90" className="text-xs">90 dakika</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={resetForm}>
                  İptal
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={handleCreateSession}
                  disabled={!newClientId || !newSessionType || createSession.isPending}
                >
                  {createSession.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Kaydet
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
