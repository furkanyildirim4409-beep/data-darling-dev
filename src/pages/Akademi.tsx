import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { GraduationCap, Plus, Video, FileText, Search, MoreVertical, Pencil, Archive, ArchiveRestore, Trash2, UploadCloud, PlayCircle, X, Film, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RichTextEditor from "@/components/mailbox/RichTextEditor";

type Category = "Antrenman" | "Beslenme" | "Mental";
type ContentType = "Video" | "Makale";
type SortOption = "newest" | "oldest" | "az";
type Visibility = "public" | "students_only";
type Status = "published" | "draft" | "archived";
type ModuleContentType = "video" | "article";

interface CourseModule {
  id: string;
  title: string;
  videoUrl: string;
  fileName: string;
  order: number;
  contentType: ModuleContentType;
  articleContent: string;
}

interface CourseModuleLocal extends CourseModule {
  videoFile: File | null;
}

interface AcademyItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  type: ContentType;
  url: string;
  thumbnail: string;
  tags: string[];
  modules: CourseModule[];
  visibility: Visibility;
  status: Status;
  createdAt: number;
}

const categoryColors: Record<Category, string> = {
  Antrenman: "bg-primary/20 text-primary border-primary/30",
  Beslenme: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Mental: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

function generateId() {
  return crypto.randomUUID();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    title: "", description: "", category: "" as Category | "", type: "" as ContentType | "", thumbnail: "", tags: "",
    visibility: "public" as Visibility,
    status: "published" as Status,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thumbnail upload state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modules state
  const [modules, setModules] = useState<CourseModuleLocal[]>([]);
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const resetFormState = useCallback(() => {
    setThumbnailFile(null);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview("");
    setForm({ title: "", description: "", category: "", type: "", thumbnail: "", tags: "", visibility: "public", status: "published" });
    setModules([]);
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
          modules: Array.isArray(row.modules)
            ? (row.modules as any[]).map((m) => ({
                id: m.id,
                title: m.title ?? "",
                videoUrl: m.videoUrl ?? "",
                fileName: m.fileName ?? "",
                order: m.order ?? 0,
                contentType: (m.contentType ?? "video") as ModuleContentType,
                articleContent: m.articleContent ?? "",
              }))
            : [],
          visibility: (row.visibility ?? "public") as Visibility,
          status: (row.status ?? "published") as Status,
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

  // Thumbnail handlers
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
    }
  };

  // Module handlers
  const addModule = () => {
    setModules((prev) => [
      ...prev,
      {
        id: generateId(),
        title: "",
        videoFile: null,
        videoUrl: "",
        fileName: "",
        order: prev.length + 1,
        contentType: "video",
        articleContent: "",
      },
    ]);
  };

  const updateModuleTitle = (id: string, title: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title } : m)));
  };

  const updateModuleContentType = (id: string, contentType: ModuleContentType) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, contentType } : m)));
  };

  const updateModuleArticle = (id: string, html: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, articleContent: html } : m)));
  };

  const handleModuleVideoSelect = (moduleId: string, file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Lütfen bir video dosyası seçin");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Video boyutu 500MB'dan küçük olmalı");
      return;
    }
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, videoFile: file, fileName: file.name } : m
      )
    );
  };

  const removeModule = (id: string) => {
    setModules((prev) =>
      prev.filter((m) => m.id !== id).map((m, i) => ({ ...m, order: i + 1 }))
    );
  };

  const uploadModuleVideos = async (): Promise<CourseModule[]> => {
    if (!activeCoachId) return [];
    const results: CourseModule[] = [];
    for (const mod of modules) {
      // Article modules: no video upload, persist article HTML only
      if (mod.contentType === "article") {
        results.push({
          id: mod.id,
          title: mod.title,
          videoUrl: "",
          fileName: "",
          order: mod.order,
          contentType: "article",
          articleContent: mod.articleContent ?? "",
        });
        continue;
      }

      let videoUrl = mod.videoUrl;
      let fileName = mod.fileName;
      if (mod.videoFile) {
        const ext = mod.videoFile.name.split(".").pop() || "mp4";
        const storageName = `${activeCoachId}/${Date.now()}_${mod.order}.${ext}`;
        const { error } = await supabase.storage
          .from("academy-videos")
          .upload(storageName, mod.videoFile, { contentType: mod.videoFile.type });
        if (error) {
          toast.error(`"${mod.title || `Bölüm ${mod.order}`}" videosu yüklenemedi`);
          console.error(error);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from("academy-videos")
          .getPublicUrl(storageName);
        videoUrl = urlData.publicUrl;
        fileName = mod.videoFile.name;
      }
      results.push({
        id: mod.id,
        title: mod.title,
        videoUrl,
        fileName,
        order: mod.order,
        contentType: "video",
        articleContent: "",
      });
    }
    return results;
  };

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.type || !activeCoachId) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    setIsSubmitting(true);
    try {
      const thumbnailUrl = thumbnailFile ? await uploadThumbnail() : form.thumbnail;
      const uploadedModules = await uploadModuleVideos();
      const tagsArray = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

      const { error } = await supabase
        .from("academy_content" as any)
        .insert({
          coach_id: activeCoachId,
          title: form.title,
          description: form.description,
          category: form.category,
          type: form.type,
          url: "",
          thumbnail: thumbnailUrl,
          tags: tagsArray,
          modules: uploadedModules,
          visibility: form.visibility,
          status: form.status,
        } as any);

      if (error) {
        toast.error("İçerik eklenirken hata oluştu");
        console.error(error);
        return;
      }
      resetFormState();
      setOpen(false);
      toast.success("İçerik eklendi");
      fetchContent();
    } finally {
      setIsSubmitting(false);
    }
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

  const handleSheetChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetFormState();
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
                    {item.modules.length > 0 && (
                      <Badge variant="outline" className="gap-1 text-muted-foreground border-border">
                        <Film className="w-3 h-3" />
                        {item.modules.length} Bölüm
                      </Badge>
                    )}
                    <Badge variant="outline" className={`gap-1 ${item.visibility === "students_only" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-muted-foreground border-border"}`}>
                      {item.visibility === "students_only" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {item.visibility === "students_only" ? "Öğrencilere Özel" : "Herkese Açık"}
                    </Badge>
                    {item.status === "draft" && (
                      <Badge variant="outline" className="gap-1 text-blue-400 border-blue-500/30 bg-blue-500/10">Taslak</Badge>
                    )}
                    {item.status === "archived" && (
                      <Badge variant="outline" className="gap-1 text-muted-foreground border-border bg-muted/40">Arşivli</Badge>
                    )}
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

      {/* Hidden file input for thumbnail */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Course Builder Dialog — full-screen workspace */}
      <Dialog open={open} onOpenChange={handleSheetChange}>
        <DialogContent className="max-w-[1200px] w-[95vw] h-[92vh] p-0 flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0">
            <DialogTitle className="text-2xl">Yeni Eğitim İçeriği</DialogTitle>
            <DialogDescription>Akademi için yeni bir kurs veya eğitim içeriği oluşturun.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
              {/* Hero — Main Title & Description */}
              <div className="rounded-2xl border border-border/60 bg-card/40 p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Ana Başlık *</Label>
                  <Input
                    placeholder="Örn. Squat Tekniğinin Temelleri"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Detaylı Açıklama</Label>
                  <Textarea
                    placeholder="Eğitiminizin konusunu, hedef kitlesini ve kapsamını detaylıca açıklayın."
                    className="min-h-[140px] text-base"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Category, Type, Visibility, Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="space-y-2">
                  <Label>Görünürlük</Label>
                  <Select value={form.visibility} onValueChange={(v) => setForm((f) => ({ ...f, visibility: v as Visibility }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <span className="inline-flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Herkese Açık</span>
                      </SelectItem>
                      <SelectItem value="students_only">
                        <span className="inline-flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Yalnızca Öğrencilerime</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Yayında</SelectItem>
                      <SelectItem value="draft">Taslak</SelectItem>
                      <SelectItem value="archived">Arşivli</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label>Kapak Görseli</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-dashed border-2 border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[140px] relative"
                >
                  {thumbnailPreview || form.thumbnail ? (
                    <div className="relative w-full h-[140px]">
                      <img
                        src={thumbnailPreview || form.thumbnail}
                        alt="Önizleme"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnailFile(null);
                          if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
                          setThumbnailPreview("");
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

              {/* Modules / Course Chapters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Bölümler</Label>
                    <p className="text-xs text-muted-foreground mt-1">Her bölüm bir video ya da rich-text makale olabilir.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addModule} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Yeni Bölüm Ekle
                  </Button>
                </div>

                {modules.length === 0 && (
                  <div className="border border-dashed border-border rounded-xl p-10 text-center">
                    <Film className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Henüz bölüm eklenmedi</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Video veya makale olarak bölümler ekleyin</p>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {modules.map((mod) => (
                    <div
                      key={mod.id}
                      className="border border-border/60 rounded-xl p-4 bg-muted/20 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {mod.order}
                        </span>
                        <Input
                          placeholder={`Bölüm ${mod.order} başlığı`}
                          value={mod.title}
                          onChange={(e) => updateModuleTitle(mod.id, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeModule(mod.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Content type toggle */}
                      <div className="inline-flex rounded-lg border border-border/60 bg-background/60 p-1">
                        <button
                          type="button"
                          onClick={() => updateModuleContentType(mod.id, "video")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${mod.contentType === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <Video className="w-3.5 h-3.5" /> Video
                        </button>
                        <button
                          type="button"
                          onClick={() => updateModuleContentType(mod.id, "article")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${mod.contentType === "article" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <FileText className="w-3.5 h-3.5" /> Makale
                        </button>
                      </div>

                      {mod.contentType === "video" ? (
                        <>
                          {/* Video upload zone per module */}
                          <input
                            type="file"
                            accept="video/mp4,video/quicktime"
                            className="hidden"
                            ref={(el) => { videoInputRefs.current[mod.id] = el; }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleModuleVideoSelect(mod.id, file);
                              e.target.value = "";
                            }}
                          />
                          <div
                            onClick={() => videoInputRefs.current[mod.id]?.click()}
                            className="border-dashed border-2 border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            {mod.videoFile || mod.videoUrl ? (
                              <>
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Video className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{mod.fileName || "Video"}</p>
                                  {mod.videoFile && (
                                    <p className="text-xs text-muted-foreground">{formatFileSize(mod.videoFile.size)}</p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModules((prev) =>
                                      prev.map((m) =>
                                        m.id === mod.id ? { ...m, videoFile: null, videoUrl: "", fileName: "" } : m
                                      )
                                    );
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-6 h-6 text-muted-foreground/40 shrink-0" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Video yükleyin</p>
                                  <p className="text-xs text-muted-foreground/60">MP4, MOV — maks. 500MB</p>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Makale İçeriği</Label>
                          <RichTextEditor
                            value={mod.articleContent}
                            onChange={(html) => updateModuleArticle(mod.id, html)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Etiketler</Label>
                <Input placeholder="squat, teknik, bacak (virgülle ayırın)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border/50 shrink-0 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => handleSheetChange(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Yükleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
