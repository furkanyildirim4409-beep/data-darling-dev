import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/hooks/useAthletes";

interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
}

export function AssignProgramDialog({
  open,
  onOpenChange,
  programId,
  programName,
}: AssignProgramDialogProps) {
  const { user } = useAuth();
  const { athletes, isLoading: athletesLoading } = useAthletes();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [saving, setSaving] = useState(false);

  const toggleAthlete = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === athletes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(athletes.map((a) => a.id));
    }
  };

  const handleAssign = async () => {
    if (!user || selectedIds.length === 0) return;
    setSaving(true);

    const rows = selectedIds.map((athleteId) => ({
      athlete_id: athleteId,
      coach_id: user.id,
      program_id: programId,
      scheduled_date: scheduledDate,
      status: "pending",
    }));

    const { error } = await supabase.from("assigned_workouts").insert(rows);

    if (error) {
      toast.error("Atama başarısız: " + error.message);
    } else {
      toast.success(
        `"${programName}" ${selectedIds.length} sporcuya atandı!`
      );
      setSelectedIds([]);
      onOpenChange(false);
    }
    setSaving(false);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Programı Ata
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">"{programName}"</span>{" "}
            programını sporculara atayın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Başlangıç Tarihi
            </Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="bg-background/50"
            />
          </div>

          {/* Athlete list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sporcular</Label>
              {athletes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={toggleAll}
                >
                  {selectedIds.length === athletes.length
                    ? "Hiçbirini Seçme"
                    : "Tümünü Seç"}
                </Button>
              )}
            </div>

            {athletesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : athletes.length === 0 ? (
              <div className="glass rounded-lg border border-border p-6 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Henüz bağlı sporcu yok
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[240px] rounded-lg border border-border">
                <div className="p-2 space-y-1">
                  {athletes.map((athlete) => {
                    const checked = selectedIds.includes(athlete.id);
                    return (
                      <label
                        key={athlete.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                          checked
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleAthlete(athlete.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={athlete.avatar} />
                          <AvatarFallback className="text-xs bg-muted">
                            {getInitials(athlete.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {athlete.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {athlete.email}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            İptal
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedIds.length === 0 || saving}
            className="bg-primary text-primary-foreground"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Users className="w-4 h-4 mr-1.5" />
            )}
            {selectedIds.length > 0
              ? `${selectedIds.length} Sporcuya Ata`
              : "Sporcu Seçin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
