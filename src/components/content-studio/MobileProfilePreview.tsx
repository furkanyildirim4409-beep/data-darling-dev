import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Grid3X3, Play, User, Bookmark, PauseCircle, ImageOff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCoachAudienceStats,
  useMyPublishedPosts,
  useMyPublishedPostsCount,
  useCoachHighlights,
} from "@/hooks/useSocialMutations";

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);

export function MobileProfilePreview() {
  const { profile } = useProfile();
  const { profile: authProfile } = useAuth();
  const syncActive = authProfile?.instagram_sync_active !== false;

  const { data: stats } = useCoachAudienceStats();
  const { data: postsCount = 0 } = useMyPublishedPostsCount();
  const { data: posts = [] } = useMyPublishedPosts(9);
  const { data: highlights = [] } = useCoachHighlights();

  const visibleHighlights = highlights
    .filter((h) => h.count > 0 || h.customCoverUrl)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .slice(0, 6);

  const handle = authProfile?.username
    ? authProfile.username
    : profile.username?.replace(/^@/, "") || "username";

  const initials =
    (profile.name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="glass rounded-xl border border-border p-5">
      <h3 className="text-lg font-semibold text-foreground mb-4">Mobil Önizleme</h3>

      <div className="flex justify-center">
        <div className="w-[260px] bg-background rounded-[28px] p-2 border-2 border-muted shadow-lg">
          <div className="bg-card rounded-[22px] overflow-hidden">
            {/* Status / notch */}
            <div className="h-5 bg-muted/40 flex items-center justify-center">
              <div className="w-14 h-1 bg-muted rounded-full" />
            </div>

            {/* Top bar with username */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
              <p className="text-sm font-semibold text-foreground truncate">
                @{handle}
              </p>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Profile header */}
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage src={profile.avatarUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary text-base">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="font-bold text-sm text-foreground">{fmt(postsCount)}</p>
                    <p className="text-[10px] text-muted-foreground">gönderi</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {fmt(stats?.totalFollowers ?? 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">takipçi</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {fmt(stats?.activeStudents ?? 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">öğrenci</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-sm text-foreground leading-tight">
                  {profile.name || "İsimsiz"}
                </p>
                {profile.title && (
                  <p className="text-[11px] text-primary mt-0.5">{profile.title}</p>
                )}
              </div>

              {profile.bio && (
                <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3">
                  {profile.bio}
                </p>
              )}

              <div className="flex gap-1.5">
                <button className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold">
                  Takip Et
                </button>
                <button className="flex-1 py-1.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                  Mesaj
                </button>
              </div>

              {/* Highlights row */}
              {visibleHighlights.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pt-1 -mx-1 px-1">
                  {visibleHighlights.map((h) => {
                    const cover = h.customCoverUrl || h.stories?.[0]?.media_url || null;
                    return (
                      <div key={h.category} className="flex flex-col items-center gap-1 shrink-0 w-12">
                        <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-primary/70 via-primary to-primary/40">
                          <div className="w-full h-full rounded-full bg-card p-[1px] overflow-hidden">
                            {cover ? (
                              <img
                                src={cover}
                                alt={h.category}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-muted" />
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] text-foreground/80 truncate w-full text-center">
                          {h.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tab bar */}
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
                <User className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            {!syncActive ? (
              <div className="aspect-square flex flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground">
                <PauseCircle className="w-8 h-8 text-primary/70" />
                <p className="text-[11px] font-medium">Otomatik eşitleme kapalı</p>
                <p className="text-[9px] opacity-70">Gönderiler duraklatıldı</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="aspect-square flex flex-col items-center justify-center gap-2 bg-muted/20 text-muted-foreground">
                <ImageOff className="w-7 h-7 opacity-50" />
                <p className="text-[11px]">Henüz gönderi yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-px bg-border">
                {Array.from({ length: 9 }).map((_, i) => {
                  const p = posts[i];
                  return (
                    <div
                      key={p?.id ?? `empty-${i}`}
                      className={cn(
                        "aspect-square relative overflow-hidden",
                        p?.thumb ? "bg-muted" : "bg-muted/30"
                      )}
                    >
                      {p?.thumb ? (
                        <img
                          src={p.thumb}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      {p?.isVideo && (
                        <Play className="absolute top-1 right-1 w-3 h-3 text-white drop-shadow" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className={cn("w-2 h-2 rounded-full", syncActive ? "bg-success animate-pulse" : "bg-muted-foreground/50")} />
        {syncActive ? "Canlı veri akışı" : "Eşitleme duraklatıldı"}
      </div>
    </div>
  );
}
