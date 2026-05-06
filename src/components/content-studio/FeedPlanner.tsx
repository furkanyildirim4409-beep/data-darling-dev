import { useState, useRef, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Image, Calendar, Heart, MessageCircle, MoreHorizontal, GripVertical, Edit2, Trash2, Save, Upload, X, Loader2, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreatePost, useCoachPosts, useDeletePost } from "@/hooks/useSocialMutations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Post {
  id: string;
  image: string;
  caption: string;
  scheduledDate?: string;
  likes: number;
  comments: number;
  status: "draft" | "scheduled" | "published";
}

interface SortablePostProps {
  post: Post;
  onEdit: (post: Post) => void;
  onDelete: (postId: string) => void;
  canManage?: boolean;
}

function SortablePost({ post, onEdit, onDelete, canManage = true }: SortablePostProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    disabled: !canManage,
    id: post.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden border border-border transition-all",
        isDragging && "opacity-50 scale-105 ring-2 ring-primary z-50"
      )}
    >
      <div 
        className={cn("absolute inset-0", canManage ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
        {...attributes}
        {...listeners}
      >
        <img src={post.image} alt={post.caption} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-2 left-2 right-10 flex items-center gap-3 text-white text-xs">
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{post.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              <span>{post.comments}</span>
            </div>
          </div>
          <GripVertical className="absolute bottom-2 right-2 w-4 h-4 text-white/60" />
        </div>
      </div>

      <Badge
        variant="outline"
        className={cn(
          "absolute top-2 left-2 text-[10px] border pointer-events-none",
          post.status === "published" && "bg-success/20 text-success border-success/30",
          post.status === "scheduled" && "bg-warning/20 text-warning border-warning/30",
          post.status === "draft" && "bg-muted text-muted-foreground border-border"
        )}
      >
        {post.status === "published" ? "Yayında" : post.status === "scheduled" ? "Planlandı" : "Taslak"}
      </Badge>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(post)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(post.id)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface FeedPlannerProps {
  canManage?: boolean;
}

export function FeedPlanner({ canManage = true }: FeedPlannerProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [newCaption, setNewCaption] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState(0);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed: scale to "cover" the 1:1 frame
  const coverScale = (() => {
    if (!imgNatural || !frameSize) return 1;
    return Math.max(frameSize / imgNatural.w, frameSize / imgNatural.h);
  })();
  const displayedW = imgNatural ? imgNatural.w * coverScale : 0;
  const displayedH = imgNatural ? imgNatural.h * coverScale : 0;
  const maxOffsetX = Math.max(0, (displayedW - frameSize) / 2);
  const maxOffsetY = Math.max(0, (displayedH - frameSize) / 2);
  const isSquare = imgNatural ? Math.abs(imgNatural.w - imgNatural.h) < 2 : true;

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const onPointerDown = (e: React.PointerEvent) => {
    if (isSquare) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: cropOffset.x, baseY: cropOffset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setCropOffset({
      x: clamp(dragState.current.baseX + dx, -maxOffsetX, maxOffsetX),
      y: clamp(dragState.current.baseY + dy, -maxOffsetY, maxOffsetY),
    });
  };
  const onPointerUp = () => { dragState.current = null; };

  useEffect(() => {
    if (!frameRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setFrameSize(entry.contentRect.width);
    });
    ro.observe(frameRef.current);
    return () => ro.disconnect();
  }, [filePreview]);

  const { user } = useAuth();
  const { data: livePosts, isLoading: isLoadingPosts } = useCoachPosts();
  const { mutateAsync: createPost, isPending: isCreatingPost } = useCreatePost();
  const { mutateAsync: deletePostMutation, isPending: isDeletingPost } = useDeletePost();

  const isBusy = isUploading || isCreatingPost;

  // Sync live posts into local state for DnD reordering
  useEffect(() => {
    if (livePosts) {
      const mapped: Post[] = livePosts.map((p) => ({
        id: p.id,
        image: p.before_image_url || p.video_thumbnail_url || "/placeholder.svg",
        caption: p.content || "",
        likes: 0,
        comments: 0,
        status: "published" as const,
      }));
      setPosts(mapped);
    }
  }, [livePosts]);

  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setCropOffset({ x: 0, y: 0 });
      setImgNatural(null);
    } else if (file) {
      toast.error("Lütfen geçerli bir görsel dosyası seçin.");
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setImgNatural(null);
    setCropOffset({ x: 0, y: 0 });
  };

  // Produce a 1:1 cropped Blob using current offsets
  const cropTo1x1 = async (file: File): Promise<Blob> => {
    if (!imgNatural || isSquare || !frameSize) return file;
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const outSize = Math.min(imgNatural.w, imgNatural.h);
    // Map pixel offset (in displayed/frame px) to source image px
    const srcOffsetX = (cropOffset.x / coverScale);
    const srcOffsetY = (cropOffset.y / coverScale);
    const srcCenterX = imgNatural.w / 2 - srcOffsetX;
    const srcCenterY = imgNatural.h / 2 - srcOffsetY;
    const sx = Math.max(0, Math.min(imgNatural.w - outSize, srcCenterX - outSize / 2));
    const sy = Math.max(0, Math.min(imgNatural.h - outSize, srcCenterY - outSize / 2));
    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, outSize, outSize, 0, 0, outSize, outSize);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setPosts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCreatePost = async () => {
    if (!user) return;

    try {
      setIsUploading(true);
      let imageUrl = "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=300&h=300&fit=crop";

      if (selectedFile) {
        const cropped = await cropTo1x1(selectedFile);
        const ext = "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("social-media")
          .upload(path, cropped, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("social-media")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      await createPost({
        type: "text",
        content: newCaption || "Yeni gönderi",
        before_image_url: imageUrl,
      });

      // Query invalidation in useCreatePost will refresh the grid

      setNewCaption("");
      clearFile();
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      toast.error(`Gönderi oluşturulamadı: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditCaption(post.caption);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingPost) return;
    setPosts((prev) =>
      prev.map((p) => (p.id === editingPost.id ? { ...p, caption: editCaption } : p))
    );
    setIsEditDialogOpen(false);
    setEditingPost(null);
    setEditCaption("");
    toast.success("Açıklama başarıyla değiştirildi.");
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;
    try {
      await deletePostMutation(deletePostId);
      setDeletePostId(null);
    } catch {
      // toast handled in mutation
    }
  };

  const activePost = posts.find((p) => p.id === activeId);

  return (
    <div className="glass rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Akış Planlayıcı</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gönderileri sürükleyerek yeniden sıralayın</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={(o) => { setIsCreateDialogOpen(o); if (!o) clearFile(); }}>
          {canManage && (
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1.5" />
                Yeni Gönderi
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="glass border-border">
            <DialogHeader>
              <DialogTitle>Yeni Gönderi Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Photo Upload */}
              <div>
                <Label className="text-xs text-muted-foreground">Fotoğraf</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
                {!filePreview ? (
                  <div
                    className="mt-2 border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Image className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Fotoğraf yüklemek için tıklayın</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG max 10MB</p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <div
                      ref={frameRef}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerUp}
                      className={cn(
                        "relative rounded-xl overflow-hidden border border-border bg-black aspect-square mx-auto max-w-xs select-none touch-none",
                        !isSquare && "cursor-grab active:cursor-grabbing"
                      )}
                    >
                      {imgNatural && frameSize > 0 && (
                        <img
                          src={filePreview}
                          alt="Preview"
                          draggable={false}
                          style={{
                            position: "absolute",
                            width: displayedW,
                            height: displayedH,
                            left: (frameSize - displayedW) / 2 + cropOffset.x,
                            top: (frameSize - displayedH) / 2 + cropOffset.y,
                            maxWidth: "none",
                          }}
                        />
                      )}
                      {/* Hidden img for natural size detection */}
                      <img
                        src={filePreview}
                        alt=""
                        className="hidden"
                        onLoad={(e) => {
                          const t = e.currentTarget;
                          setImgNatural({ w: t.naturalWidth, h: t.naturalHeight });
                          setCropOffset({ x: 0, y: 0 });
                        }}
                      />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={clearFile} disabled={isBusy}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {isSquare
                        ? "Uygulamadaki gerçek 1:1 görünüm"
                        : "Görseli sürükleyerek 1:1 çerçevedeki konumunu ayarlayın"}
                    </p>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <Label htmlFor="caption" className="text-xs text-muted-foreground">Açıklama</Label>
                <Textarea
                  id="caption"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Gönderi açıklaması yazın..."
                  className="mt-2 bg-background/50 resize-none"
                  rows={3}
                />
              </div>

              {/* Schedule */}
              <div>
                <Label className="text-xs text-muted-foreground">Zamanlama (Opsiyonel)</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input type="date" className="bg-background/50" />
                  <Input type="time" className="bg-background/50 w-28" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setIsCreateDialogOpen(false); clearFile(); }} disabled={isBusy}>
                  İptal
                </Button>
                <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleCreatePost} disabled={isBusy}>
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-1.5" />
                      Oluştur
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid */}
      {isLoadingPosts ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ImageOff className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">Henüz gönderi yok</p>
          <p className="text-xs mt-1">Yeni bir gönderi oluşturarak başlayın</p>
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={posts.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <SortablePost key={post.id} post={post} onEdit={handleEditPost} onDelete={(id) => setDeletePostId(id)} canManage={canManage} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activePost && (
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-primary shadow-lg shadow-primary/20">
                <img src={activePost.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{posts.filter((p) => p.status === "published").length}</p>
          <p className="text-xs text-muted-foreground">Yayında</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-warning">{posts.filter((p) => p.status === "scheduled").length}</p>
          <p className="text-xs text-muted-foreground">Planlandı</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-muted-foreground">{posts.filter((p) => p.status === "draft").length}</p>
          <p className="text-xs text-muted-foreground">Taslak</p>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Gönderiyi Düzenle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingPost && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={editingPost.image} alt="Post preview" className="w-full h-40 object-cover" />
              </div>
            )}
            <div>
              <Label htmlFor="edit-caption" className="text-xs text-muted-foreground">Açıklama</Label>
              <Textarea
                id="edit-caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Gönderi açıklaması yazın..."
                className="mt-2 bg-background/50 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>İptal</Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-1.5" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>Bu gönderi kalıcı olarak silinecek. Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPost}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} disabled={isDeletingPost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingPost ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Siliniyor...</> : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
