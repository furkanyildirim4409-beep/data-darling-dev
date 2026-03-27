import { useState, useMemo } from "react";
import { GraduationCap, Plus, Video, FileText, Search, MoreVertical, Pencil, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Category = "Antrenman" | "Beslenme" | "Mental";
type ContentType = "Video" | "Makale";
type SortOption = "newest" | "oldest" | "az";

interface AcademyItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  type: ContentType;
  url: string;
  thumbnail: string;
  tags: string[];
  createdAt: number;
}

const categoryColors: Record<Category, string> = {
  Antrenman: "bg-primary/20 text-primary border-primary/30",
  Beslenme: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Mental: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const initialData: AcademyItem[] = [
  { id: "1", title: "Doğru Squat Tekniği", description: "Squat yaparken dikkat edilmesi gereken temel noktalar ve sık yapılan hatalar. Doğru form ile sakatlanma riskini minimuma indirin.", category: "Antrenman", type: "Video", url: "https://example.com/squat", thumbnail: "", tags: ["squat", "teknik"], createdAt: Date.now() - 100000 },
  { id: "2", title: "Makro Hesaplama Rehberi", description: "Protein, karbonhidrat ve yağ ihtiyacınızı nasıl hesaplarsınız? Hedeflerinize göre makro dağılımını öğrenin.", category: "Beslenme", type: "Makale", url: "https://example.com/macros", thumbnail: "", tags: ["makro", "beslenme"], createdAt: Date.now() - 200000 },
  { id: "3", title: "Antrenman Öncesi Zihinsel Hazırlık", description: "Performansınızı artırmak için zihinsel odaklanma teknikleri ve meditasyon pratikleri.", category: "Mental", type: "Video", url: "https://example.com/mental", thumbnail: "", tags: ["mental", "odaklanma"], createdAt: Date.now() - 300000 },
  { id: "4", title: "Progressive Overload Stratejileri", description: "Kas gelişimi için progresif yüklenme prensiplerini nasıl uygularsınız? Haftalık artış planlaması.", category: "Antrenman", type: "Makale", url: "https://example.com/overload", thumbnail: "", tags: ["overload", "gelişim"], createdAt: Date.now() - 400000 },
  { id: "5", title: "Uyku ve Kas Gelişimi", description: "Uyku kalitesinin kas onarımı ve hormon dengesine etkisi. Optimal uyku rutini oluşturma rehberi.", category: "Mental", type: "Makale", url: "https://example.com/sleep", thumbnail: "", tags: ["uyku", "recovery"], createdAt: Date.now() - 500000 },
  { id: "6", title: "Deadlift Formu ve Yaygın Hatalar", description: "Deadlift hareketinde sırt sağlığını koruyarak maksimum performans elde etme teknikleri.", category: "Antrenman", type: "Video", url: "https://example.com/deadlift", thumbnail: "", tags: ["deadlift", "teknik"], createdAt: Date.now() - 600000 },
  { id: "7", title: "Antrenman Sonrası Beslenme Penceresi", description: "Post-workout beslenme stratejileri, protein zamanlaması ve karbonhidrat yüklemesi.", category: "Beslenme", type: "Video", url: "https://example.com/postworkout", thumbnail: "", tags: ["post-workout", "protein"], createdAt: Date.now() - 700000 },
  { id: "8", title: "Stres Yönetimi ve Kortizol", description: "Yüksek kortizol seviyelerinin antrenman performansına etkisi ve stres azaltma yöntemleri.", category: "Mental", type: "Makale", url: "https://example.com/stress", thumbnail: "", tags: ["stres", "kortizol"], createdAt: Date.now() - 800000 },
];

export default function Akademi() {
  const [items, setItems] = useState<AcademyItem[]>(initialData);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("Tümü");
  const [filterType, setFilterType] = useState("Tümü");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [form, setForm] = useState({
    title: "", description: "", category: "" as Category | "", type: "" as ContentType | "", url: "", thumbnail: "", tags: "",
  });

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === "Tümü" || item.category === filterCategory;
        const matchesType = filterType === "Tümü" || item.type === filterType;
        return matchesSearch && matchesCategory && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return b.createdAt - a.createdAt;
        if (sortBy === "oldest") return a.createdAt - b.createdAt;
        return a.title.localeCompare(b.title, "tr");
      });
  }, [items, searchQuery, filterCategory, filterType, sortBy]);

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
        thumbnail: form.thumbnail,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setForm({ title: "", description: "", category: "", type: "", url: "", thumbnail: "", tags: "" });
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

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İçeriklerde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tümü">Tüm Kategoriler</SelectItem>
            <SelectItem value="Antrenman">Antrenman</SelectItem>
            <SelectItem value="Beslenme">Beslenme</SelectItem>
            <SelectItem value="Mental">Mental</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tümü">Tüm Tipler</SelectItem>
            <SelectItem value="Video">Video</SelectItem>
            <SelectItem value="Makale">Makale</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">En Yeni</SelectItem>
            <SelectItem value="oldest">En Eski</SelectItem>
            <SelectItem value="az">A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">{filteredItems.length} içerik bulundu</p>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className="group bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
          >
            <CardContent className="p-0 flex h-[140px]">
              {/* Thumbnail */}
              <div className="w-[120px] shrink-0 flex items-center justify-center bg-muted/30 border-r border-border/30">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${item.type === "Video" ? "bg-gradient-to-br from-primary/10 to-primary/5" : "bg-gradient-to-br from-accent/20 to-accent/5"}`}>
                    {item.type === "Video" ? <Video className="w-8 h-8 text-primary/60" /> : <FileText className="w-8 h-8 text-muted-foreground/60" />}
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground truncate">{item.title}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info("Düzenleme yakında aktif olacak")}>
                          <Pencil className="w-4 h-4 mr-2" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Arşivleme yakında aktif olacak")}>
                          <Archive className="w-4 h-4 mr-2" /> Arşivle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={categoryColors[item.category]}>{item.category}</Badge>
                  <Badge variant="outline" className="gap-1 text-muted-foreground border-border">
                    {item.type === "Video" ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {item.type}
                  </Badge>
                  {item.tags.length > 0 && (
                    <span className="text-xs text-muted-foreground/70 truncate">
                      {item.tags.map((t) => `#${t}`).join(" ")}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Sonuç bulunamadı</p>
        </div>
      )}

      {/* Add Content Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Yeni İçerik Ekle</DialogTitle>
            <DialogDescription>Akademi için yeni eğitim içeriği oluşturun.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input placeholder="İçerik başlığı" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea placeholder="Makale içeriği veya video açıklaması." className="min-h-[150px]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Antrenman">Antrenman</SelectItem>
                    <SelectItem value="Beslenme">Beslenme</SelectItem>
                    <SelectItem value="Mental">Mental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>İçerik Tipi *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as ContentType }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Makale">Makale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input placeholder="https://..." value={form.thumbnail} onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Medya Linki</Label>
              <Input placeholder="https://..." value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Etiketler</Label>
              <Input placeholder="squat, teknik, bacak (virgülle ayırın)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
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
