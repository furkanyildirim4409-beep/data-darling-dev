import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Users, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AssignDietTemplateBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
}

interface AthleteOption {
  id: string;
  name: string;
  avatar?: string;
}

const DURATION_OPTIONS = [
  { value: "1", label: "1 Hafta" },
  { value: "4", label: "4 Hafta" },
  { value: "8", label: "8 Hafta" },
  { value: "12", label: "12 Hafta" },
];

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function AssignDietTemplateBulkDialog({ open, onOpenChange, templateId, templateName }: AssignDietTemplateBulkDialogProps) {
  const { user, activeCoachId } = useAuth();
  const { canAssignPrograms } = usePermissions();
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date>(getNextMonday());
  const [durationWeeks, setDurationWeeks] = useState("4");

  useEffect(() => {
    if (!open || !user || !activeCoachId) return;
    setSelectedIds(new Set());
    setStartDate(getNextMonday());
    setDurationWeeks("4");
    setLoading(true);

    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("role", "athlete")
      .eq("coach_id", activeCoachId)
      .then(({ data }) => {
        setAthletes((data || []).map((a) => ({ id: a.id, name: a.full_name || "İsimsiz", avatar: a.avatar_url || undefined })));
        setLoading(false);
      });
  }, [open, user]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === athletes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(athletes.map((a) => a.id)));
    }
  };

  const handleAssign = async () => {
    if (!user || !activeCoachId || selectedIds.size === 0) return;
    setSubmitting(true);

    const rows = Array.from(selectedIds).map((id) => ({
      athlete_id: id,
      coach_id: activeCoachId,
      active_diet_template_id: templateId,
      diet_start_date: format(startDate, "yyyy-MM-dd"),
      diet_duration_weeks: Number(durationWeeks),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("nutrition_targets")
      .upsert(rows as any, { onConflict: "athlete_id" });

    setSubmitting(false);

    if (error) {
      toast.error("Atama başarısız oldu");
      return;
    }

    toast.success(`"${templateName}" ${selectedIds.size} sporcuya atandı!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Sporculara Ata
          </DialogTitle>
          <DialogDescription>
            "{templateName}" şablonunu atamak istediğiniz sporcuları seçin.
          </DialogDescription>
        </DialogHeader>

        {/* Date & Duration */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-2")}>
                <CalendarIcon className="w-3.5 h-3.5" />
                {format(startDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Select value={durationWeeks} onValueChange={setDurationWeeks}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : athletes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Henüz sporcu bulunmuyor.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer border-b border-border mb-1">
              <Checkbox
                checked={selectedIds.size === athletes.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">Tümünü Seç</span>
            </label>
            {athletes.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox checked={selectedIds.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                <Avatar className="h-7 w-7">
                  <AvatarImage src={a.avatar} />
                  <AvatarFallback className="text-xs">{a.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{a.name}</span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleAssign} disabled={selectedIds.size === 0 || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Ata ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
