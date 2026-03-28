import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { GraduationCap, Plus, Video, FileText, Search, MoreVertical, Pencil, Archive, Trash2, UploadCloud, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export default function Akademi() {
  const { activeCoachId } = useAuth();
  const [items, setItems] = useState<AcademyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("Tümü");
  const [filterType, setFilterType] = useState("Tümü");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [form, setForm] = useState({
    title: "", description: "", category: "" as Category | "", type: "" as ContentType | "", url: "", thumbnail: "", tags: "",
  });

  // Thumbnail upload state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetThumbnailState = useCallback(() => {
    setThumbnailFile(null);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview("");
  }, [thumbnailPreview]);

  const fetchContent = useCallback(async () => {
    if (!activeCoachId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("academy_content" as any)
      .select("*")
      .eq("coach_id", activeCoachId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("İçerikler yüklenirken hata oluştu");
      console.error(error);
    } else if (data) {
      setItems(
        (data as any[]).map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description ?? "",
          category: row.category as Category,
          type: row.type as ContentType,
          url: row.url ?? "",
          thumbnail: row.thumbnail ?? "",
          tags: row.tags ?? [],
          createdAt: new Date(row.created_at).getTime(),
        }))
      );
    }
    setIsLoading(false);
  }, [activeCoachId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosyası seçin");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalı");
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setForm((f) => ({ ...f, thumbnail: "" }));
  };

  const uploadThumbnail = async (): Promise<string> => {
    if (!thumbnailFile || !activeCoachId) return form.thumbnail;
    setIsUploadingThumbnail(true);
    try {
      const ext = thumbnailFile.name.split(".").pop() || "jpg";
      const fileName = `${activeCoachId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("academy-thumbnails")
        .upload(fileName, thumbnailFile, { contentType: thumbnailFile.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("academy-thumbnails")
        .getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error("Görsel yüklenemedi: " + (err.message || "Bilinmeyen hata"));
      return "";
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.type || !activeCoachId) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    const thumbnailUrl = thumbnailFile ? await uploadThumbnail() : form.thumbnail;
    const tagsArray = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase
      .from("academy_content" as any)
      .insert({
        coach_id: activeCoachId,
        title: form.title,
        description: form.description,
        category: form.category,
        type: form.type,
        url: form.url,
        thumbnail: thumbnailUrl,
        tags: tagsArray,
      } as any);

    if (error) {
      toast.error("İçerik eklenirken hata oluştu");
      console.error(error);
      return;
    }
    setForm({ title: "", description: "", category: "", type: "", url: "", thumbnail: "", tags: "" });
    resetThumbnailState();
    setOpen(false);
    toast.success("İçerik eklendi");
    fetchContent();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("academy_content" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Silme işlemi başarısız oldu");
      console.error(error);
      return;
    }
    toast.success("İçerik silindi");
    fetchContent();
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetThumbnailState();
      setForm({ title: "", description: "", category: "", type: "", url: "", thumbnail: "", tags: "" });
    }
  };

  const hasAnyItems = items.length > 0;

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
      {!isLoading && <p className="text-sm text-muted-foreground">{filteredItems.length} içerik bulundu</p>}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
          ))
        ) : (
          filteredItems.map((item) => (
            <Card
              key={item.id}
              className="group bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
            >
              <CardContent className="p-0 flex h-[140px]">
                {/* Thumbnail */}
                <div className="w-[120px] shrink-0 relative overflow-hidden bg-muted/30 border-r border-border/30">
                  {item.thumbnail ? (
                    <>
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {item.type === "Video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <PlayCircle className="w-10 h-10 text-white/80 drop-shadow-lg" />
                        </div>
                      )}
                    </>
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
          ))
        )}
      </div>

      {/* Empty States */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-20" />
          {hasAnyItems ? (
            <>
              <p className="text-lg font-medium">Sonuç bulunamadı</p>
              <p className="text-sm mt-1">Filtreleri değiştirmeyi veya yeni içerik eklemeyi deneyin</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">Henüz içerik eklenmemiş</p>
              <p className="text-sm mt-1 mb-4">Akademinize ilk eğitim içeriğinizi ekleyerek başlayın</p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                İlk İçeriği Ekle
              </Button>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Add Content Dialog */}
      <Dialog open={open} onOpenChange={handleDialogChange}>
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
            {/* Thumbnail Upload Zone */}
            <div className="space-y-2">
              <Label>Kapak Görseli</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-dashed border-2 border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[120px] relative"
              >
                {thumbnailPreview || form.thumbnail ? (
                  <div className="relative w-full h-[120px]">
                    <img
                      src={thumbnailPreview || form.thumbnail}
                      alt="Önizleme"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetThumbnailState();
                        setForm((f) => ({ ...f, thumbnail: "" }));
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Görsel yüklemek için tıklayın</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WebP — maks. 5MB</p>
                  </>
                )}
              </div>
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
            <Button variant="outline" onClick={() => handleDialogChange(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={isUploadingThumbnail}>
              {isUploadingThumbnail ? "Yükleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
