import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface ProgramData {
  id: string;
  name: string;
  type: "exercise" | "nutrition";
  description: string;
  duration: string;
  assignedCount: number;
  createdAt: Date;
  blockType?: "hypertrophy" | "strength" | "endurance";
}

const mockExercisePrograms: ProgramData[] = [
  {
    id: "prog-1",
    name: "Hipertrofi Bloğu A",
    type: "exercise",
    description: "Kas hacmi artırma odaklı 4 haftalık program",
    duration: "4 Hafta",
    assignedCount: 8,
    createdAt: new Date("2025-12-01"),
    blockType: "hypertrophy",
  },
  {
    id: "prog-2",
    name: "Güç Bloğu Pro",
    type: "exercise",
    description: "Maksimum güç gelişimi için periodizasyon",
    duration: "6 Hafta",
    assignedCount: 5,
    createdAt: new Date("2025-11-15"),
    blockType: "strength",
  },
  {
    id: "prog-3",
    name: "PPL Split Program",
    type: "exercise",
    description: "İt/Çek/Bacak bölünmesi ile tam vücut",
    duration: "8 Hafta",
    assignedCount: 12,
    createdAt: new Date("2026-01-10"),
    blockType: "hypertrophy",
  },
];

const mockNutritionPrograms: ProgramData[] = [
  {
    id: "nut-prog-1",
    name: "Bulk Diyeti 3500 kcal",
    type: "nutrition",
    description: "Kas kütlesi artışı için yüksek kalori planı",
    duration: "12 Hafta",
    assignedCount: 6,
    createdAt: new Date("2025-12-20"),
  },
  {
    id: "nut-prog-2",
    name: "Cut Diyeti 2200 kcal",
    type: "nutrition",
    description: "Yağ yakımı için kalori açığı planı",
    duration: "8 Hafta",
    assignedCount: 4,
    createdAt: new Date("2026-01-05"),
  },
  {
    id: "nut-prog-3",
    name: "Keto Planı",
    type: "nutrition",
    description: "Düşük karbonhidrat, yüksek yağ beslenme",
    duration: "6 Hafta",
    assignedCount: 3,
    createdAt: new Date("2026-01-15"),
  },
];

interface ProgramDashboardProps {
  onCreateProgram: (type: "exercise" | "nutrition") => void;
  onEditProgram: (program: ProgramData) => void;
}

export function ProgramDashboard({ onCreateProgram, onEditProgram }: ProgramDashboardProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"exercise" | "nutrition">("exercise");
  const [programs, setPrograms] = useState({
    exercise: mockExercisePrograms,
    nutrition: mockNutritionPrograms,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; program: ProgramData | null }>({
    open: false,
    program: null,
  });

  const currentPrograms = viewMode === "exercise" ? programs.exercise : programs.nutrition;

  const handleDelete = (program: ProgramData) => {
    setDeleteDialog({ open: true, program });
  };

  const confirmDelete = () => {
    if (deleteDialog.program) {
      if (viewMode === "exercise") {
        setPrograms((prev) => ({
          ...prev,
          exercise: prev.exercise.filter((p) => p.id !== deleteDialog.program!.id),
        }));
      } else {
        setPrograms((prev) => ({
          ...prev,
          nutrition: prev.nutrition.filter((p) => p.id !== deleteDialog.program!.id),
        }));
      }
      toast({
        title: "Program Silindi",
        description: `"${deleteDialog.program.name}" başarıyla silindi.`,
      });
    }
    setDeleteDialog({ open: false, program: null });
  };

  const handleDuplicate = (program: ProgramData) => {
    const newProgram: ProgramData = {
      ...program,
      id: `${program.id}-copy-${Date.now()}`,
      name: `${program.name} (Kopya)`,
      assignedCount: 0,
      createdAt: new Date(),
    };

    if (viewMode === "exercise") {
      setPrograms((prev) => ({
        ...prev,
        exercise: [...prev.exercise, newProgram],
      }));
    } else {
      setPrograms((prev) => ({
        ...prev,
        nutrition: [...prev.nutrition, newProgram],
      }));
    }

    toast({
      title: "Program Kopyalandı",
      description: `"${program.name}" başarıyla kopyalandı.`,
    });
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
          {/* Mode Toggle */}
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

          {/* Create Button */}
          <Button
            onClick={() => onCreateProgram(viewMode)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Program Oluştur
          </Button>
        </div>
      </div>

      {/* Programs Grid */}
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

                {/* Actions Menu */}
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
                    <DropdownMenuItem onClick={() => handleDuplicate(program)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Kopyala
                    </DropdownMenuItem>
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
                  {program.duration}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {program.assignedCount} Sporcu
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
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
    </div>
  );
}
