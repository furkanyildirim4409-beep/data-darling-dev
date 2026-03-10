import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Plus, Trash2, Pencil, Check, X, Dumbbell, ImageIcon, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  onRefresh: () => void;
}

export function ExerciseLibraryEditor({ exercises, onRefresh }: ExerciseLibraryEditorProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMuscle, setEditMuscle] = useState("");
  const [editGifUrl, setEditGifUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Göğüs");
  const [newMuscle, setNewMuscle] = useState("Pectoralis Major");
  const [newGifUrl, setNewGifUrl] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // RapidAPI Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importLimit, setImportLimit] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const startEdit = (item: LibraryItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditMuscle(item.muscleGroup || "");
    setEditGifUrl(item.gifUrl || "");
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    setSaving(true);
    const { error } = await supabase
      .from("exercise_library")
      .update({
        name: editName.trim(),
        category: editCategory,
        target_muscle: editMuscle || null,
        video_url: editGifUrl.trim() || null,
      })
      .eq("id", editingId);

    if (error) {
      toast.error("Güncelleme başarısız");
    } else {
      toast.success("Egzersiz güncellendi");
      onRefresh();
    }
    setEditingId(null);
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("exercise_library")
      .insert({
        name: newName.trim(),
        category: newCategory,
        target_muscle: newMuscle || null,
        video_url: newGifUrl.trim() || null,
      });

    if (error) {
      toast.error("Egzersiz eklenemedi");
    } else {
      toast.success("Egzersiz eklendi");
      onRefresh();
    }
    setNewName("");
    setNewGifUrl("");
    setShowAddForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("exercise_library")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Silme başarısız");
    } else {
      toast.success("Egzersiz silindi");
      onRefresh();
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const response = await supabase.functions.invoke("fetch-exercises", {
        body: { limit: importLimit },
      });
      if (response.error) {
        throw new Error(response.error.message || "Edge function error");
      }
      const data = response.data;
      if (!Array.isArray(data)) throw new Error("Beklenmeyen API yanıtı");
      console.log(`[RapidAPI] Fetched ${data.length} exercises`);
      if (data.length > 0) {
        console.log("[RapidAPI] Sample exercise keys:", Object.keys(data[0]));
      }

      // Fetch ALL existing names directly from DB to avoid Supabase 1000-row cap
      const { data: existingRows } = await supabase
        .from("exercise_library")
        .select("name")
        .limit(10000);
      const existingNames = new Set((existingRows || []).map((e) => e.name.toLowerCase()));
      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

      const newRows = data
        .filter((ex: any) => !existingNames.has(ex.name?.toLowerCase()))
        .map((ex: any) => ({
          name: capitalize(ex.name || "Bilinmeyen"),
          category: capitalize(ex.bodyPart || "Diğer"),
          target_muscle: capitalize(ex.target || ""),
          video_url: ex.imageUrl || null,
        }));

      if (newRows.length > 0) {
        // Chunked insert — 500 per batch
        const CHUNK_SIZE = 500;
        let insertedCount = 0;
        for (let i = 0; i < newRows.length; i += CHUNK_SIZE) {
          const chunk = newRows.slice(i, i + CHUNK_SIZE);
          const { error } = await supabase.from("exercise_library").insert(chunk);
          if (error) {
            console.error("Chunk insert error:", error);
            toast.error(`Batch ${Math.floor(i / CHUNK_SIZE) + 1} başarısız`);
          } else {
            insertedCount += chunk.length;
          }
        }
        onRefresh();
        toast.success(`${insertedCount} yeni egzersiz eklendi`);
        setImportResult(`✅ ${insertedCount} egzersiz başarıyla eklendi (${data.length - newRows.length} mükerrer atlandı)`);
      } else {
        setImportResult("ℹ️ Tüm egzersizler zaten kütüphanede mevcut");
      }
    } catch (err: any) {
      toast.error("İçe aktarma başarısız");
      setImportResult(`❌ Hata: ${err.message}`);
    } finally {
      setImporting(false);
    }
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
            <Input
              placeholder="Örn: https://example.com/bench-press.gif"
              value={newGifUrl}
              onChange={(e) => setNewGifUrl(e.target.value)}
              className="h-9 text-xs"
            />
            {newGifUrl.trim() && (
              <div className="flex flex-col items-center p-2 rounded-lg border border-border bg-background/50">
                <span className="text-[10px] text-muted-foreground mb-1.5">GIF Önizleme</span>
                <img
                  src={newGifUrl}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border border-border"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewGifUrl(""); }}>İptal</Button>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Ekle
              </Button>
            </div>
          </div>
        )}

        {/* Exercise List */}
        <div className="flex-1 min-h-0 -mx-1 px-1 overflow-y-auto scrollbar-hide" style={{ maxHeight: "55vh" }}>
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
                    <Input
                      placeholder="Örn: https://example.com/bench-press.gif"
                      value={editGifUrl}
                      onChange={(e) => setEditGifUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                    {editGifUrl.trim() && (
                      <div className="flex flex-col items-center p-2 rounded-lg border border-border bg-background/50">
                        <span className="text-[10px] text-muted-foreground mb-1.5">GIF Önizleme</span>
                        <img
                          src={editGifUrl}
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded-lg border border-border"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" className="h-7 w-7" onClick={saveEdit} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {ex.gifUrl ? (
                      <ImageIcon className="w-4 h-4 text-primary/50 shrink-0" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
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
        </div>

        {/* RapidAPI Import */}
        <div className="pt-2 border-t border-border space-y-2">
          <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) setImportResult(null); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" />
                🚀 RapidAPI'den Egzersiz Çek
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-sm">ExerciseDB İçe Aktarıcı</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Limit (0 = tümü)</label>
                  <Input
                    type="number"
                    min={0}
                    max={1500}
                    value={importLimit}
                    onChange={(e) => setImportLimit(Number(e.target.value))}
                    className="h-9 text-sm"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Pro tier — 0 girilirse tüm egzersizler çekilir. API key sunucuda saklanıyor.</p>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full"
                  size="sm"
                >
                  {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  {importing ? "Çekiliyor..." : "Tüm Egzersizleri Çek (Pro)"}
                </Button>
                {importResult && (
                  <p className="text-xs text-muted-foreground text-center p-2 rounded-md bg-muted/50">{importResult}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <p className="text-xs text-muted-foreground text-center">
            Toplam: {exercises.length} egzersiz
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
