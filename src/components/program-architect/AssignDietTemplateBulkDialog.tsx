import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

export function AssignDietTemplateBulkDialog({ open, onOpenChange, templateId, templateName }: AssignDietTemplateBulkDialogProps) {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setSelectedIds(new Set());
    setLoading(true);

    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("role", "athlete")
      .eq("coach_id", user.id)
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
    if (!user || selectedIds.size === 0) return;
    setSubmitting(true);

    const rows = Array.from(selectedIds).map((id) => ({
      athlete_id: id,
      coach_id: user.id,
      active_diet_template_id: templateId,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("nutrition_targets")
      .upsert(rows, { onConflict: "athlete_id" });

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
