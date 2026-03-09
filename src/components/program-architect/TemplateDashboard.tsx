import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Send,
  Dumbbell,
  CalendarDays,
  Loader2,
} from "lucide-react";

export interface RoutineDay {
  day: number;
  label: string;
  exercises: { name: string; sets: number; reps: string; rest: number }[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  routine_days: RoutineDay[];
  created_at: string | null;
  coach_id: string | null;
}

interface Props {
  onCreateNew: () => void;
  onEdit: (template: WorkoutTemplate) => void;
  onAssign: (template: WorkoutTemplate) => void;
}

export default function TemplateDashboard({ onCreateNew, onEdit, onAssign }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Şablonlar yüklenemedi: " + error.message);
    } else {
      setTemplates(
        (data || []).map((t) => ({
          ...t,
          routine_days: (Array.isArray(t.routine_days) ? t.routine_days : []) as RoutineDay[],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const handleDuplicate = async (t: WorkoutTemplate) => {
    if (!user) return;
    const { error } = await supabase.from("workout_templates").insert({
      name: t.name + " (Kopya)",
      description: t.description,
      routine_days: t.routine_days as any,
      coach_id: user.id,
    });
    if (error) {
      toast.error("Kopyalanamadı: " + error.message);
    } else {
      toast.success("Şablon kopyalandı!");
      fetchTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      toast.success("Şablon silindi.");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const totalExercises = (days: RoutineDay[]) =>
    days.reduce((sum, d) => sum + d.exercises.length, 0);

  const activeDays = (days: RoutineDay[]) =>
    days.filter((d) => d.exercises.length > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Program Kütüphanesi</h1>
          <p className="text-muted-foreground mt-1">Antrenman şablonlarını oluştur, düzenle ve sporcularına ata.</p>
        </div>
        <Button onClick={onCreateNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" />
          Yeni Program Oluştur
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed border-2 border-border p-12 flex flex-col items-center gap-4">
          <Dumbbell className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">Henüz hiç program şablonu yok.</p>
          <Button onClick={onCreateNew} variant="outline">
            <Plus className="w-4 h-4 mr-1.5" />
            İlk Programını Oluştur
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card
              key={t.id}
              className="bg-card border-border hover:border-primary/40 transition-all duration-200 p-5 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-foreground truncate pr-2">{t.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(t)}>
                        <Pencil className="w-4 h-4 mr-2" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssign(t)}>
                        <Send className="w-4 h-4 mr-2" /> Sporcuya Ata
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)}>
                        <Copy className="w-4 h-4 mr-2" /> Kopyala
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {t.routine_days
                    .filter((d) => d.exercises.length > 0)
                    .slice(0, 4)
                    .map((d) => (
                      <Badge key={d.day} variant="secondary" className="text-xs font-normal">
                        Gün {d.day}: {d.label || "—"}
                      </Badge>
                    ))}
                  {activeDays(t.routine_days) > 4 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      +{activeDays(t.routine_days) - 4}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {activeDays(t.routine_days)} gün
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-3.5 h-3.5" />
                  {totalExercises(t.routine_days)} egzersiz
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
