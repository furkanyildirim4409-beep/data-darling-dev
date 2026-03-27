import { useState } from "react";
import { GraduationCap, Plus, Video, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Category = "Antrenman" | "Beslenme" | "Mental";
type ContentType = "Video" | "Makale";

interface AcademyItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  type: ContentType;
  url: string;
}

const categoryColors: Record<Category, string> = {
  Antrenman: "bg-primary/20 text-primary border-primary/30",
  Beslenme: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Mental: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const initialData: AcademyItem[] = [
  {
    id: "1",
    title: "Doğru Squat Tekniği",
    description: "Squat yaparken dikkat edilmesi gereken temel noktalar ve sık yapılan hatalar.",
    category: "Antrenman",
    type: "Video",
    url: "https://example.com/squat",
  },
  {
    id: "2",
    title: "Makro Hesaplama Rehberi",
    description: "Protein, karbonhidrat ve yağ ihtiyacınızı nasıl hesaplarsınız?",
    category: "Beslenme",
    type: "Makale",
    url: "https://example.com/macros",
  },
  {
    id: "3",
    title: "Antrenman Öncesi Zihinsel Hazırlık",
    description: "Performansınızı artırmak için zihinsel odaklanma teknikleri.",
    category: "Mental",
    type: "Video",
    url: "https://example.com/mental",
  },
  {
    id: "4",
    title: "Progressive Overload Stratejileri",
    description: "Kas gelişimi için progresif yüklenme prensiplerini nasıl uygularsınız?",
    category: "Antrenman",
    type: "Makale",
    url: "https://example.com/overload",
  },
];

export default function Akademi() {
  const [items, setItems] = useState<AcademyItem[]>(initialData);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "" as Category | "",
    type: "" as ContentType | "",
    url: "",
  });

  const handleSubmit = () => {
    if (!form.title || !form.category || !form.type) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        title: form.title,
        description: form.description,
        category: form.category as Category,
        type: form.type as ContentType,
        url: form.url,
      },
      ...prev,
    ]);
    setForm({ title: "", description: "", category: "", type: "", url: "" });
    setOpen(false);
    toast.success("İçerik eklendi");
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("İçerik silindi");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Akademi Yönetimi</h1>
            <p className="text-sm text-muted-foreground">Eğitim içeriklerini yönetin</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Yeni İçerik Ekle
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card
            key={item.id}
            className="group bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={categoryColors[item.category]}>
                    {item.category}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-muted-foreground border-border">
                    {item.type === "Video" ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {item.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Content Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Yeni İçerik Ekle</DialogTitle>
            <DialogDescription>Akademi için yeni eğitim içeriği oluşturun.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input
                placeholder="İçerik başlığı"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                placeholder="Kısa açıklama"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Antrenman">Antrenman</SelectItem>
                    <SelectItem value="Beslenme">Beslenme</SelectItem>
                    <SelectItem value="Mental">Mental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>İçerik Tipi *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as ContentType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Makale">Makale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Medya Linki</Label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
