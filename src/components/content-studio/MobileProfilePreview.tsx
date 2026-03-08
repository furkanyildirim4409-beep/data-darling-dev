import { useProfile } from "@/contexts/ProfileContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Play, Bookmark, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileProfilePreview() {
  const { profile } = useProfile();

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="glass rounded-xl border border-border p-5">
      <h3 className="text-lg font-semibold text-foreground mb-4">Mobil Önizleme</h3>
      
      {/* Phone Frame */}
      <div className="flex justify-center">
        <div className="w-[240px] bg-background rounded-[24px] p-2 border-2 border-muted shadow-lg">
          <div className="bg-card rounded-[18px] overflow-hidden">
            {/* Status Bar */}
            <div className="h-6 bg-muted/50 flex items-center justify-center">
              <div className="w-16 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Profile Header */}
            <div className="p-4 space-y-3">
              {/* Avatar & Stats Row */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage src={profile.avatarUrl} />
                  <AvatarFallback className="text-lg bg-primary/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="font-bold text-sm text-foreground">{profile.posts}</p>
                    <p className="text-[10px] text-muted-foreground">Gönderi</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {profile.followers >= 1000 
                        ? `${(profile.followers / 1000).toFixed(1)}K` 
                        : profile.followers}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Takipçi</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{profile.following}</p>
                    <p className="text-[10px] text-muted-foreground">Takip</p>
                  </div>
                </div>
              </div>

              {/* Name & Title */}
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-foreground">{profile.name}</p>
                  <Badge className="h-4 px-1 text-[8px] bg-primary text-primary-foreground">
                    PRO
                  </Badge>
                </div>
                <p className="text-xs text-primary mt-0.5">{profile.title}</p>
              </div>

              {/* Bio */}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {profile.bio}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                  Takip Et
                </button>
                <button className="flex-1 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium border border-border">
                  Mesaj
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-t border-border">
              <button className="flex-1 py-2 flex items-center justify-center border-b-2 border-primary text-primary">
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button className="flex-1 py-2 flex items-center justify-center text-muted-foreground">
                <Play className="w-4 h-4" />
              </button>
              <button className="flex-1 py-2 flex items-center justify-center text-muted-foreground">
                <Bookmark className="w-4 h-4" />
              </button>
              <button className="flex-1 py-2 flex items-center justify-center text-muted-foreground">
                <Users className="w-4 h-4" />
              </button>
            </div>

            {/* Mock Grid */}
            <div className="grid grid-cols-3 gap-px bg-border">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i} 
                  className="aspect-square bg-muted/50"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-${1530000000000 + i * 1000000}?w=100&h=100&fit=crop')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Update Indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        Değişiklikler anlık olarak yansıyor
      </div>
    </div>
  );
}
