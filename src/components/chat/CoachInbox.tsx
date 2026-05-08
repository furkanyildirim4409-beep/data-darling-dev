import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle, Inbox, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatAthlete } from "@/hooks/useCoachChat";

interface CoachInboxProps {
  athletes: ChatAthlete[];
  selectedAthleteId: string | null;
  onSelectAthlete: (id: string) => void;
  isLoading: boolean;
}

type View = "active" | "direct";

export function CoachInbox({ athletes, selectedAthleteId, onSelectAthlete, isLoading }: CoachInboxProps) {
  const { isSubCoach, teamMemberPermissions } = useAuth();
  const isRestrictedSubCoach = isSubCoach && teamMemberPermissions !== "full";

  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("active");

  // Restricted sub-coaches can never see the Direct/prospect queue
  const effectiveView: View = isRestrictedSubCoach ? "active" : view;

  const filtered = useMemo(
    () =>
      athletes.filter(a =>
        (a.full_name || "").toLowerCase().includes(search.toLowerCase())
      ),
    [athletes, search]
  );

  const activeList = filtered.filter(a => a.room_type === "assigned");
  const directList = filtered.filter(a => a.room_type === "direct");
  const pendingList = directList.filter(a => a.room_status === "pending");
  const approvedList = directList.filter(a => a.room_status === "accepted" || a.room_status === "approved");

  // Badge count uses ALL athletes (not search-filtered) so the tab pill stays meaningful
  const pendingTotal = athletes.filter(
    a => a.room_type === "direct" && a.room_status === "pending"
  ).length;

  const renderRow = (athlete: ChatAthlete, opts: { dim?: boolean } = {}) => (
    <button
      key={athlete.id}
      onClick={() => onSelectAthlete(athlete.id)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
        selectedAthleteId === athlete.id
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent",
        opts.dim && "opacity-90"
      )}
    >
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={athlete.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
            {(athlete.full_name || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {athlete.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {athlete.unreadCount > 9 ? "9+" : athlete.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              athlete.unreadCount > 0
                ? "font-semibold text-foreground"
                : "font-medium text-foreground"
            )}
          >
            {athlete.full_name || "İsimsiz"}
          </span>
          {athlete.latestMessage && (
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(athlete.latestMessage.created_at), {
                addSuffix: false,
                locale: tr,
              })}
            </span>
          )}
        </div>
        {athlete.latestMessage ? (
          <p
            className={cn(
              "text-xs truncate mt-0.5",
              athlete.unreadCount > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {athlete.latestMessage.sender_id !== athlete.id ? "Sen: " : ""}
            {athlete.latestMessage.content}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5 italic">
            Henüz mesaj yok
          </p>
        )}
      </div>
    </button>
  );

  const sectionLabel = (label: string, count: number, accent?: "warning") => (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </span>
      {count > 0 && (
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
            accent === "warning"
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Mesajlar</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sporcu ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-border"
          />
        </div>

        {/* Sub-tabs (hidden for restricted sub-coaches) */}
        {!isRestrictedSubCoach && (
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-md">
            <button
              onClick={() => setView("active")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                effectiveView === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Aktif
              <Badge
                variant="secondary"
                className="ml-1 h-4 px-1.5 text-[10px] font-semibold"
              >
                {athletes.filter(a => a.room_type === "assigned").length}
              </Badge>
            </button>
            <button
              onClick={() => setView("direct")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors relative",
                effectiveView === "direct"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Inbox className="w-3.5 h-3.5" />
              Direct
              {pendingTotal > 0 && (
                <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {pendingTotal > 9 ? "9+" : pendingTotal}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : effectiveView === "active" ? (
          activeList.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search ? "Sonuç bulunamadı" : "Henüz aktif sporcu yok"}
            </div>
          ) : (
            <div className="p-2">{activeList.map(a => renderRow(a))}</div>
          )
        ) : (
          // Direct view
          <div>
            {/* İstekler */}
            {sectionLabel("İstekler", pendingList.length, "warning")}
            {pendingList.length === 0 ? (
              <div className="px-4 pb-2 text-center text-muted-foreground text-xs italic">
                Bekleyen istek yok
              </div>
            ) : (
              <div className="px-2 pb-2 space-y-1">
                {pendingList.map(a => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    {renderRow(a, { dim: true })}
                  </div>
                ))}
              </div>
            )}

            {/* Mesajlar */}
            {sectionLabel("Mesajlar", approvedList.length)}
            {approvedList.length === 0 ? (
              <div className="px-4 pb-4 text-center text-muted-foreground text-xs italic">
                Henüz direkt mesaj yok
              </div>
            ) : (
              <div className="px-2 pb-3">
                {approvedList.map(a => renderRow(a))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
