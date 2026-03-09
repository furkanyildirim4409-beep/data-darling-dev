import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Dumbbell,
  Apple,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Users,
  Calendar,
  Loader2,
  Save,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AssignProgramDialog } from "./AssignProgramDialog";
import { BulkAssignDialog } from "./BulkAssignDialog";

export interface ProgramData {
  id: string;
  name: string;
  type: "exercise" | "nutrition";
  description: string;
  duration: string;
  assignedCount: number;
  createdAt: Date;
  blockType?: "hypertrophy" | "strength" | "endurance";
  difficulty?: string;
  targetGoal?: string;
}

interface ProgramDashboardProps {
  onCreateProgram: (type: "exercise" | "nutrition") => void;
  onEditProgram: (program: ProgramData) => void;
  onSaveAsTemplate?: (program: ProgramData) => void;
}

export function ProgramDashboard({ onCreateProgram, onEditProgram, onSaveAsTemplate }: ProgramDashboardProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"exercise" | "nutrition">("exercise");
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; program: ProgramData | null }>({
    open: false,
    program: null,
  });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; program: ProgramData | null }>({
    open: false,
    program: null,
  });
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  const fetchPrograms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Programlar yüklenemedi");
      setLoading(false);
      return;
    }

    const mapped: ProgramData[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.title,
      type: "exercise" as const,
      description: p.description ?? "",
      duration: "",
      assignedCount: 0,
      createdAt: new Date(p.created_at ?? Date.now()),
      difficulty: p.difficulty ?? undefined,
      targetGoal: p.target_goal ?? undefined,
      blockType: p.target_goal === "hypertrophy"
        ? "hypertrophy"
        : p.target_goal === "strength"
          ? "strength"
          : p.target_goal === "endurance"
            ? "endurance"
            : undefined,
    }));
    setPrograms(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const currentPrograms = programs.filter((p) => p.type === viewMode || viewMode === "exercise");

  const handleDelete = (program: ProgramData) => {
    setDeleteDialog({ open: true, program });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.program) return;
    const id = deleteDialog.program.id;
    // Delete exercises first, then program
    await supabase.from("exercises").delete().eq("program_id", id);
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) {
      toast.error("Program silinemedi");
    } else {
      toast.success(`"${deleteDialog.program.name}" silindi`);
      setPrograms((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleteDialog({ open: false, program: null });
  };

  const handleDuplicate = async (program: ProgramData, openInEditor = false) => {
    if (!user) return;

    // Fetch full program data + exercises in parallel
    const [{ data: progData }, { data: exercises }] = await Promise.all([
      supabase.from("programs").select("week_config, automation_rules").eq("id", program.id).single(),
      supabase.from("exercises").select("*").eq("program_id", program.id),
    ]);

    // Insert cloned program with all metadata
    const { data: newProg, error: progErr } = await supabase
      .from("programs")
      .insert({
        title: `${program.name} (Kopya)`,
        description: program.description,
        difficulty: program.difficulty,
        target_goal: program.targetGoal,
        coach_id: user.id,
        week_config: progData?.week_config ?? ([] as any),
        automation_rules: progData?.automation_rules ?? ([] as any),
      })
      .select()
      .single();

    if (progErr || !newProg) {
      toast.error("Program kopyalanamadı");
      return;
    }

    // Copy exercises with all fields (rir, failure_set included)
    if (exercises && exercises.length > 0) {
      const { error: exErr } = await supabase.from("exercises").insert(
        exercises.map((ex) => ({
          program_id: newProg.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest_time: ex.rest_time,
          notes: ex.notes,
          order_index: ex.order_index,
          video_url: ex.video_url,
          rir: (ex as any).rir ?? 2,
          failure_set: (ex as any).failure_set ?? false,
        }))
      );
      if (exErr) {
        toast.error("Egzersizler kopyalanamadı");
        await supabase.from("programs").delete().eq("id", newProg.id);
        return;
      }
    }

    toast.success(`"${program.name}" kopyalandı`);

    if (openInEditor) {
      // Open clone in builder for customization
      const clonedProgram: ProgramData = {
        ...program,
        id: newProg.id,
        name: newProg.title,
        createdAt: new Date(newProg.created_at ?? Date.now()),
      };
      onEditProgram(clonedProgram);
    } else {
      fetchPrograms();
    }
  };
  };

  const getBlockColor = (type?: string) => {
    switch (type) {
      case "hypertrophy":
        return "bg-primary/20 text-primary border-primary/30";
      case "strength":
        return "bg-warning/20 text-warning border-warning/30";
      case "endurance":
        return "bg-info/20 text-info border-info/30";
      default:
        return "bg-success/20 text-success border-success/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Program Mimarı</h1>
          <p className="text-muted-foreground mt-1">
            Antrenman ve beslenme programlarını görüntüle, düzenle ve yönet
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass rounded-lg px-4 py-2 border border-border flex items-center gap-3">
            <div
              className={`flex items-center gap-2 cursor-pointer ${viewMode === "exercise" ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setViewMode("exercise")}
            >
              <Dumbbell className="w-4 h-4" />
              <Label className="text-sm font-medium cursor-pointer">Antrenman</Label>
            </div>
            <Switch
              checked={viewMode === "nutrition"}
              onCheckedChange={(checked) => setViewMode(checked ? "nutrition" : "exercise")}
            />
            <div
              className={`flex items-center gap-2 cursor-pointer ${viewMode === "nutrition" ? "text-success" : "text-muted-foreground"}`}
              onClick={() => setViewMode("nutrition")}
            >
              <Apple className="w-4 h-4" />
              <Label className="text-sm font-medium cursor-pointer">Beslenme</Label>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setBulkAssignOpen(true)}
            className="border-border"
          >
            <Layers className="w-4 h-4 mr-1.5" />
            Toplu Ata
          </Button>

          <Button
            onClick={() => onCreateProgram(viewMode)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Program Oluştur
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Programs Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentPrograms.map((program) => (
            <Card
              key={program.id}
              className="glass border-border group hover:border-primary/50 transition-all cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        program.type === "exercise" ? "bg-primary/20" : "bg-success/20"
                      )}
                    >
                      {program.type === "exercise" ? (
                        <Dumbbell className="w-5 h-5 text-primary" />
                      ) : (
                        <Apple className="w-5 h-5 text-success" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{program.name}</CardTitle>
                      {program.blockType && (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] mt-1", getBlockColor(program.blockType))}
                        >
                          {program.blockType === "hypertrophy"
                            ? "Hipertrofi"
                            : program.blockType === "strength"
                              ? "Güç"
                              : "Dayanıklılık"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem onClick={() => onEditProgram(program)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAssignDialog({ open: true, program })}>
                        <Users className="w-4 h-4 mr-2" />
                        Sporculara Ata
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(program)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Kopyala
                      </DropdownMenuItem>
                      {onSaveAsTemplate && (
                        <DropdownMenuItem onClick={() => onSaveAsTemplate(program)}>
                          <Save className="w-4 h-4 mr-2" />
                          Şablon Olarak Kaydet
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(program)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {program.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {program.createdAt.toLocaleDateString("tr-TR")}
                  </div>
                  {program.difficulty && (
                    <Badge variant="outline" className="text-[10px]">
                      {program.difficulty === "beginner" ? "Başlangıç" : program.difficulty === "intermediate" ? "Orta" : "İleri"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {currentPrograms.length === 0 && (
            <div className="col-span-full glass rounded-xl border border-border p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                {viewMode === "exercise" ? (
                  <Dumbbell className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Apple className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Henüz {viewMode === "exercise" ? "antrenman" : "beslenme"} programı yok
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                İlk programınızı oluşturmak için aşağıdaki butona tıklayın
              </p>
              <Button onClick={() => onCreateProgram(viewMode)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Program Oluştur
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, program: null })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Programı Sil</DialogTitle>
            <DialogDescription>
              "{deleteDialog.program?.name}" programını silmek istediğinizden emin misiniz? Bu işlem
              geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, program: null })}>
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Program Dialog */}
      {assignDialog.program && (
        <AssignProgramDialog
          open={assignDialog.open}
          onOpenChange={(open) => setAssignDialog({ open, program: open ? assignDialog.program : null })}
          programId={assignDialog.program.id}
          programName={assignDialog.program.name}
        />
      )}

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen} />
    </div>
  );
}
