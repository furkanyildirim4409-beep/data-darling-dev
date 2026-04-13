import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Save, RefreshCw, Users, Eye, Heart, TrendingUp, Instagram, Link2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileSettingsProps {
  canManage?: boolean;
}

export function ProfileSettings({ canManage = true }: ProfileSettingsProps) {
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { profile, updateProfile } = useProfile();
  const { user, refreshProfile } = useAuth();
  const [title, setTitle] = useState(profile.title);
  const [bio, setBio] = useState(profile.bio);
  const [fullName, setFullName] = useState(profile.name);
  const [syncStats, setSyncStats] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time sync to context for live preview
  useEffect(() => {
    updateProfile({ title });
  }, [title, updateProfile]);

  useEffect(() => {
    updateProfile({ bio });
  }, [bio, updateProfile]);

  useEffect(() => {
    updateProfile({ name: fullName });
  }, [fullName, updateProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      await supabase.rpc("update_own_profile", { _avatar_url: urlData.publicUrl });
      updateProfile({ avatarUrl: urlData.publicUrl });
      await refreshProfile();
      toast.success("Profil fotoğrafı güncellendi");
    } catch (err: any) {
      toast.error(err.message || "Fotoğraf yüklenemedi");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc("update_own_profile", {
        _full_name: fullName || null,
        _bio: bio || null,
        _specialty: title || null,
      });
      if (error) throw error;
      await refreshProfile();
      toast.success("Profil ayarları başarıyla güncellendi");
    } catch (err: any) {
      toast.error(err.message || "Kaydetme başarısız");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstagramConnect = async () => {
    setIsConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setInstagramConnected(true);
    setIsConnecting(false);
    toast.success("Instagram hesabınız başarıyla eşleştirildi");
  };

  const handleInstagramDisconnect = () => {
    setInstagramConnected(false);
    toast.info("Instagram hesabı kaldırıldı");
  };

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="glass rounded-xl border border-border p-5 space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Profil Ayarları</h3>

      {/* Profile Photo */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="w-20 h-20 border-2 border-primary">
            <AvatarImage src={profile.avatarUrl} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isUploadingAvatar ? (
              <RefreshCw className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{profile.name || "İsimsiz"}</p>
          <p className="text-sm text-muted-foreground">{profile.username}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}>
            <Camera className="w-3 h-3 mr-1.5" />
            Fotoğraf Değiştir
          </Button>
        </div>
      </div>

      {/* Full Name */}
      <div>
        <Label htmlFor="fullName" className="text-xs text-muted-foreground">Ad Soyad</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 bg-background/50" placeholder="Adınız Soyadınız" disabled={!canManage} />
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title" className="text-xs text-muted-foreground">Unvan</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 bg-background/50" placeholder="örn: Profesyonel Fitness Koçu" disabled={!canManage} />
      </div>

      {/* Bio */}
      <div>
        <Label htmlFor="bio" className="text-xs text-muted-foreground">Biyografi</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5 bg-background/50 resize-none" rows={3} placeholder="Kendinizi tanıtın..." disabled={!canManage} />
        <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/150</p>
      </div>

      {/* Stats Sync */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-3">
            <RefreshCw className={cn("w-4 h-4 text-primary", syncStats && "animate-spin")} style={{ animationDuration: "3s" }} />
            <div>
              <p className="text-sm font-medium text-foreground">İstatistikleri Eşitle</p>
              <p className="text-xs text-muted-foreground">Sosyal medya verilerini otomatik güncelle</p>
            </div>
          </div>
          <Switch checked={syncStats} onCheckedChange={setSyncStats} />
        </div>

        {syncStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-3 h-3" />
                <span className="text-xs">Takipçi</span>
              </div>
              <p className="text-xl font-bold text-foreground">{profile.followers.toLocaleString("tr-TR")}</p>
            </div>
            <div className="glass rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Eye className="w-3 h-3" />
                <span className="text-xs">Takip</span>
              </div>
              <p className="text-xl font-bold text-foreground">{profile.following}</p>
            </div>
            <div className="glass rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Heart className="w-3 h-3" />
                <span className="text-xs">Gönderi</span>
              </div>
              <p className="text-xl font-bold text-foreground">{profile.posts}</p>
            </div>
            <div className="glass rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs">Etkileşim</span>
              </div>
              <p className="text-xl font-bold text-primary">{profile.engagement}</p>
            </div>
          </div>
        )}
      </div>

      {/* Instagram Connect */}
      {canManage && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Sosyal Medya Bağlantısı</Label>
          {instagramConnected ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-pink-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{profile.username}</span>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <p className="text-xs text-muted-foreground">Bağlı</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleInstagramDisconnect} className="text-xs text-muted-foreground hover:text-destructive">
                Kaldır
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={handleInstagramConnect} disabled={isConnecting} className="w-full h-12 border-dashed border-2 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all">
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Bağlanıyor...
                </>
              ) : (
                <>
                  <Instagram className="w-5 h-5 mr-2 text-pink-500" />
                  <span>Instagram Bağla</span>
                  <Link2 className="w-4 h-4 ml-2 text-muted-foreground" />
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Verified Badge */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">PRO</Badge>
          <span className="text-sm text-foreground">Doğrulanmış Profil</span>
        </div>
        <span className="text-xs text-primary">Aktif</span>
      </div>

      {/* Save Button */}
      {canManage && (
        <Button onClick={handleSave} disabled={isSaving} className="w-full bg-primary text-primary-foreground">
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Değişiklikleri Kaydet
            </>
          )}
        </Button>
      )}
    </div>
  );
}
