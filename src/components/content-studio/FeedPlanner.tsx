import { useState } from "react";
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
import { Plus, Image, Calendar, Heart, MessageCircle, MoreHorizontal, GripVertical, Edit2, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Post {
  id: string;
  image: string;
  caption: string;
  scheduledDate?: string;
  likes: number;
  comments: number;
  status: "draft" | "scheduled" | "published";
}

const mockPosts: Post[] = [
  { id: "p1", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop", caption: "Bugünkü antrenman 💪", likes: 234, comments: 18, status: "published" },
  { id: "p2", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=300&fit=crop", caption: "Yeni program başlıyor!", likes: 0, comments: 0, status: "scheduled" },
  { id: "p3", image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=300&h=300&fit=crop", caption: "Beslenme ipuçları", likes: 189, comments: 24, status: "published" },
  { id: "p4", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop", caption: "Motivasyon Pazartesi", likes: 0, comments: 0, status: "draft" },
  { id: "p5", image: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=300&h=300&fit=crop", caption: "Değişim hikayesi #1", likes: 456, comments: 67, status: "published" },
  { id: "p6", image: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=300&h=300&fit=crop", caption: "Haftalık özet", likes: 0, comments: 0, status: "scheduled" },
];

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
      {/* Drag Handle Area */}
      <div 
        className={cn("absolute inset-0", canManage ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
        {...attributes}
        {...listeners}
      >
        {/* Image */}
        <img src={post.image} alt={post.caption} className="w-full h-full object-cover" />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Stats */}
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

      {/* Status Badge */}
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

      {/* More Button - Dropdown Menu */}
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
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => onEdit(post)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => onDelete(post.id)}
            >
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
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [newCaption, setNewCaption] = useState("");
  const [editCaption, setEditCaption] = useState("");

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

  const handleCreatePost = () => {
    const newPost: Post = {
      id: `p${Date.now()}`,
      image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=300&h=300&fit=crop",
      caption: newCaption || "Yeni gönderi",
      likes: 0,
      comments: 0,
      status: "draft",
    };
    setPosts((prev) => [newPost, ...prev]);
    setNewCaption("");
    setIsCreateDialogOpen(false);
    toast({
      title: "Gönderi Oluşturuldu",
      description: "Yeni gönderi taslak olarak eklendi.",
    });
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditCaption(post.caption);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingPost) return;
    
    setPosts((prev) =>
      prev.map((p) =>
        p.id === editingPost.id ? { ...p, caption: editCaption } : p
      )
    );
    setIsEditDialogOpen(false);
    setEditingPost(null);
    setEditCaption("");
    toast({
      title: "Gönderi Güncellendi",
      description: "Açıklama başarıyla değiştirildi.",
    });
  };

  const handleDeletePost = () => {
    if (!deletePostId) return;
    
    setPosts((prev) => prev.filter((p) => p.id !== deletePostId));
    setDeletePostId(null);
    toast({
      title: "Gönderi Silindi",
      description: "Gönderi başarıyla kaldırıldı.",
    });
  };

  const activePost = posts.find((p) => p.id === activeId);

  return (
    <div className="glass rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Akış Planlayıcı</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gönderileri sürükleyerek yeniden sıralayın
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-1.5" />
              Yeni Gönderi
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-border">
            <DialogHeader>
              <DialogTitle>Yeni Gönderi Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Photo Upload */}
              <div>
                <Label className="text-xs text-muted-foreground">Fotoğraf</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Image className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Fotoğraf yüklemek için tıklayın</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG max 10MB</p>
                </div>
              </div>

              {/* Caption */}
              <div>
                <Label htmlFor="caption" className="text-xs text-muted-foreground">
                  Açıklama
                </Label>
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
                <Button variant="outline" className="flex-1" onClick={() => setIsCreateDialogOpen(false)}>
                  İptal
                </Button>
                <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleCreatePost}>
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Oluştur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid */}
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={posts.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2">
            {posts.map((post) => (
              <SortablePost 
                key={post.id} 
                post={post} 
                onEdit={handleEditPost}
                onDelete={(id) => setDeletePostId(id)}
              />
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
                <img 
                  src={editingPost.image} 
                  alt="Post preview" 
                  className="w-full h-40 object-cover"
                />
              </div>
            )}
            <div>
              <Label htmlFor="edit-caption" className="text-xs text-muted-foreground">
                Açıklama
              </Label>
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
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
            <AlertDialogDescription>
              Bu gönderi kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
