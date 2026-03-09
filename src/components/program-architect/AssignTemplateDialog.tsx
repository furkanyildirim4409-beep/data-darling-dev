import { useState } from "react";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/hooks/useAthletes";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkoutTemplate } from "./TemplateDashboard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WorkoutTemplate | null;
}

export default function AssignTemplateDialog({ open, onOpenChange, template }: Props) {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [assigning, setAssigning] = useState(false);

  const toggleAthlete = (id: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!user || !template || !startDate || selectedAthletes.length === 0) return;

    setAssigning(true);
    try {
      const rows: any[] = [];

      for (const athleteId of selectedAthletes) {
        for (const day of template.routine_days) {
          if (day.exercises.length === 0) continue;
          rows.push({
            coach_id: user.id,
            athlete_id: athleteId,
            scheduled_date: format(addDays(startDate, day.day - 1), "yyyy-MM-dd"),
            workout_name: day.label || `Gün ${day.day}`,
            exercises: day.exercises,
            status: "pending",
          });
        }
      }

      if (rows.length === 0) {
        toast.error("Atanacak egzersiz bulunamadı.");
        return;
      }

      const { error } = await supabase.from("assigned_workouts").insert(rows);
      if (error) throw error;

      toast.success(
        `"${template.name}" ${selectedAthletes.length} sporcu(ya) atandı! 🏋️‍♂️`
      );
      setSelectedAthletes([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Atama başarısız: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programı Sporcuya Ata</DialogTitle>
          <DialogDescription>
            {template?.name ? `"${template.name}" şablonunu seçtiğin sporculara ata.` : "Şablon seç."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Athlete list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sporcular</Label>
            {athletes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz sporcu yok.</p>
            ) : (
              <ScrollArea className="max-h-40 border border-border rounded-md p-2">
                {athletes.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2.5 py-1.5 px-1 hover:bg-secondary/40 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedAthletes.includes(a.id)}
                      onCheckedChange={() => toggleAthlete(a.id)}
                    />
                    <span className="text-sm text-foreground">{a.name}</span>
                  </label>
                ))}
              </ScrollArea>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Başlangıç Tarihi</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {startDate ? format(startDate, "PPP", { locale: tr }) : "Tarih seç"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assigning || selectedAthletes.length === 0 || !startDate}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {assigning ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Ata ({selectedAthletes.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
