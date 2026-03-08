import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const clients = [
  { id: "1", name: "Ahmet Yılmaz" },
  { id: "2", name: "Zeynep Kaya" },
  { id: "3", name: "Mehmet Demir" },
  { id: "4", name: "Elif Öztürk" },
  { id: "5", name: "Can Arslan" },
  { id: "6", name: "Grup Antrenmanı" },
];

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
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
];

interface ScheduledSession {
  id: string;
  dayIndex: number;
  time: string;
  client: string;
  type: string;
  duration: string;
}

interface SessionSchedulerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: (session: { 
    athlete: string; 
    type: string; 
    time: string; 
    duration: string;
  }) => void;
}

export function SessionSchedulerDialog({ 
  open, 
  onOpenChange, 
  onSessionCreated 
}: SessionSchedulerDialogProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ScheduledSession[]>([
    { id: "s1", dayIndex: 0, time: "09:00", client: "Ahmet Yılmaz", type: "PT", duration: "60 dk" },
    { id: "s2", dayIndex: 0, time: "14:00", client: "Zeynep Kaya", type: "Check-in", duration: "30 dk" },
    { id: "s3", dayIndex: 2, time: "10:00", client: "Grup Antrenmanı", type: "Grup", duration: "90 dk" },
    { id: "s4", dayIndex: 4, time: "16:00", client: "Elif Öztürk", type: "PT", duration: "60 dk" },
  ]);

  // New session form state
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ dayIndex: number; time: string } | null>(null);
  const [newClientId, setNewClientId] = useState("");
  const [newSessionType, setNewSessionType] = useState("");
  const [newDuration, setNewDuration] = useState("60");

  const getSessionForSlot = (dayIndex: number, time: string) => {
    return sessions.find((s) => s.dayIndex === dayIndex && s.time === time);
  };

  const handleSlotClick = (dayIndex: number, time: string) => {
    const existingSession = getSessionForSlot(dayIndex, time);
    if (existingSession) return; // Don't allow clicking occupied slots

    setSelectedSlot({ dayIndex, time });
    setShowNewSessionForm(true);
  };

  const handleCreateSession = () => {
    if (!selectedSlot || !newClientId || !newSessionType) return;

    const client = clients.find((c) => c.id === newClientId);
    const sessionType = sessionTypes.find((t) => t.value === newSessionType);

    const newSession: ScheduledSession = {
      id: `s-${Date.now()}`,
      dayIndex: selectedSlot.dayIndex,
      time: selectedSlot.time,
      client: client?.name || "",
      type: sessionType?.label || "",
      duration: `${newDuration} dk`,
    };

    setSessions((prev) => [...prev, newSession]);

    // If it's today (Monday = index 0 for demo), add to today's program
    if (selectedSlot.dayIndex === 0) {
      onSessionCreated({
        athlete: client?.name || "",
        type: sessionType?.label || "",
        time: selectedSlot.time,
        duration: `${newDuration} dk`,
      });
    }

    toast({
      title: "Seans Planlandı",
      description: `${turkishDays[selectedSlot.dayIndex].full} ${selectedSlot.time} - ${client?.name}`,
    });

    // Reset form
    setShowNewSessionForm(false);
    setSelectedSlot(null);
    setNewClientId("");
    setNewSessionType("");
    setNewDuration("60");
  };

  const handleRemoveSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <div className="flex gap-4 overflow-hidden">
          {/* Weekly Grid */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-[600px]">
              {/* Day Headers */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 text-xs text-muted-foreground">Saat</div>
                {turkishDays.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 text-center rounded-lg",
                      i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <p className="text-xs font-medium">{day.short}</p>
                  </div>
                ))}
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                {timeSlots.map((time) => (
                  <div key={time} className="grid grid-cols-8 gap-1">
                    {/* Time Label */}
                    <div className="p-2 text-xs text-muted-foreground font-mono flex items-center">
                      {time}
                    </div>

                    {/* Day Cells */}
                    {turkishDays.map((_, dayIndex) => {
                      const session = getSessionForSlot(dayIndex, time);
                      const isSelected = selectedSlot?.dayIndex === dayIndex && selectedSlot?.time === time;

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
                                {session.client}
                              </p>
                              <p className="text-[9px] text-muted-foreground truncate">
                                {session.type}
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
                ))}
              </div>
            </div>
          </div>

          {/* New Session Form (Side Panel) */}
          {showNewSessionForm && selectedSlot && (
            <div className="w-64 border-l border-border pl-4 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Yeni Seans</h3>
                <p className="text-xs text-muted-foreground">
                  {turkishDays[selectedSlot.dayIndex].full} - {selectedSlot.time}
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
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-xs">
                          {client.name}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowNewSessionForm(false);
                    setSelectedSlot(null);
                  }}
                >
                  İptal
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={handleCreateSession}
                  disabled={!newClientId || !newSessionType}
                >
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
