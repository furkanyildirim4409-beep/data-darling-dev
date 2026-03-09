import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Plus, Trash2, Pencil, Check, X, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LibraryItem } from "./ProgramLibrary";

const CATEGORIES = ["Göğüs", "Sırt", "Bacak", "Omuz", "Kol", "Core", "Kardiyo", "Diğer"];
const MUSCLE_GROUPS = [
  "Pectoralis Major", "Upper Pectoralis", "Latissimus Dorsi", "Erector Spinae", "Trapezius",
  "Quadriceps", "Hamstrings", "Gluteus Maximus", "Gastrocnemius", "Hip Flexors",
  "Deltoids", "Lateral Deltoid", "Rear Deltoid", "Biceps", "Triceps", "Forearms",
  "Rectus Abdominis", "Obliques", "Diğer"
];

interface ExerciseLibraryEditorProps {
  exercises: LibraryItem[];
  onExercisesChange: (exercises: LibraryItem[]) => void;
}

export function ExerciseLibraryEditor({ exercises, onExercisesChange }: ExerciseLibraryEditorProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMuscle, setEditMuscle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Göğüs");
  const [newMuscle, setNewMuscle] = useState("Pectoralis Major");
  const [search, setSearch] = useState("");

  const startEdit = (item: LibraryItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditMuscle(item.muscleGroup || "");
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onExercisesChange(exercises.map(ex =>
      ex.id === editingId
        ? { ...ex, name: editName.trim(), category: editCategory, muscleGroup: editMuscle }
        : ex
    ));
    setEditingId(null);
    toast.success("Egzersiz güncellendi");
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newId = `ex-custom-${Date.now()}`;
    const newExercise: LibraryItem = {
      id: newId,
      name: newName.trim(),
      category: newCategory,
      type: "exercise",
      muscleGroup: newMuscle,
    };
    onExercisesChange([...exercises, newExercise]);
    setNewName("");
    setShowAddForm(false);
    toast.success("Egzersiz eklendi");
  };

  const handleDelete = (id: string) => {
    onExercisesChange(exercises.filter(ex => ex.id !== id));
    toast.success("Egzersiz silindi");
  };

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Egzersiz Kütüphanesi Düzenleyici
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Egzersiz ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-9 text-sm bg-background/50"
          />
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            Yeni
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <Input
              placeholder="Egzersiz adı"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-9 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="flex gap-2">
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-9 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newMuscle} onValueChange={setNewMuscle}>
                <SelectTrigger className="h-9 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>İptal</Button>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>Ekle</Button>
            </div>
          </div>
        )}

        {/* Exercise List */}
        <ScrollArea className="flex-1 -mx-1 px-1" style={{ maxHeight: "50vh" }}>
          <div className="space-y-1.5">
            {filtered.map((ex) => (
              <div
                key={ex.id}
                className={cn(
                  "rounded-lg border border-border p-2.5 transition-all group",
                  editingId === ex.id ? "border-primary/50 bg-primary/5" : "hover:border-muted-foreground/30"
                )}
              >
                {editingId === ex.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    />
                    <div className="flex gap-2">
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editMuscle} onValueChange={setEditMuscle}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSCLE_GROUPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" className="h-7 w-7" onClick={saveEdit}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{ex.category}</span>
                        {ex.muscleGroup && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/70">
                            {ex.muscleGroup}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(ex)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(ex.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Egzersiz bulunamadı</p>
            )}
          </div>
        </ScrollArea>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Toplam: {exercises.length} egzersiz
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
