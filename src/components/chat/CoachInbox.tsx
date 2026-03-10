import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import type { ChatAthlete } from "@/hooks/useCoachChat";

interface CoachInboxProps {
  athletes: ChatAthlete[];
  selectedAthleteId: string | null;
  onSelectAthlete: (id: string) => void;
  isLoading: boolean;
}

export function CoachInbox({ athletes, selectedAthleteId, onSelectAthlete, isLoading }: CoachInboxProps) {
  const [search, setSearch] = useState("");

  const filtered = athletes.filter(a =>
    (a.full_name || "").toLowerCase().includes(search.toLowerCase())
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
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {search ? "Sonuç bulunamadı" : "Henüz atanmış sporcu yok"}
          </div>
        ) : (
          <div className="p-2">
            {filtered.map(athlete => (
              <button
                key={athlete.id}
                onClick={() => onSelectAthlete(athlete.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selectedAthleteId === athlete.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
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
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm truncate",
                      athlete.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
                    )}>
                      {athlete.full_name || "İsimsiz"}
                    </span>
                    {athlete.latestMessage && (
                      <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                        {formatDistanceToNow(new Date(athlete.latestMessage.created_at), { addSuffix: false, locale: tr })}
                      </span>
                    )}
                  </div>
                  {athlete.latestMessage ? (
                    <p className={cn(
                      "text-xs truncate mt-0.5",
                      athlete.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {athlete.latestMessage.sender_id !== athlete.id ? "Sen: " : ""}
                      {athlete.latestMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">Henüz mesaj yok</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
