import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, MessageCircle, Bell, BellOff } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { ChatAthlete, ChatMessage } from "@/hooks/useCoachChat";
import { useMutedChats } from "@/hooks/useMutedChats";

interface ActiveChatProps {
  athlete: ChatAthlete | null;
  messages: ChatMessage[];
  coachId: string;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ActiveChat({ athlete, messages, coachId, isLoading, onSendMessage, onBack, showBackButton }: ActiveChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMuted, toggleMute } = useMutedChats();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
    inputRef.current?.focus();
  };

  if (!athlete) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Sohbet başlatmak için bir sporcu seçin</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const dateStr = format(new Date(msg.created_at), "d MMMM yyyy", { locale: tr });
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date: dateStr, msgs: [msg] });
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border bg-card">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Avatar className="w-9 h-9">
          <AvatarImage src={athlete.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
            {(athlete.full_name || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm text-foreground">{athlete.full_name || "İsimsiz"}</p>
          <p className="text-xs text-muted-foreground">Sporcu</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm italic">Henüz mesaj yok. İlk mesajı gönder!</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="flex items-center justify-center mb-4">
                <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              <div className="space-y-2">
                {group.msgs.map(msg => {
                  const isCoach = msg.sender_id === coachId;
                  return (
                    <div key={msg.id} className={cn("flex", isCoach ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm",
                          isCoach
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          isCoach ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-right"
                        )}>
                          {format(new Date(msg.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Mesaj yaz..."
            className="flex-1 bg-muted/50 border-border"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} className="flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
