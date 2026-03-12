import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatMessage } from "@/hooks/useCoachChat";
import { format, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

interface ChatWidgetProps {
  athleteName: string;
  athleteInitials: string;
  athleteId?: string;
}

export function ChatWidget({ athleteName, athleteInitials, athleteId }: ChatWidgetProps) {
  const { user } = useAuth();
  const coachId = user?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const MSG_LIMIT = 50;

  // Fetch messages
  useEffect(() => {
    if (!coachId || !athleteId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      setHasMore(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${coachId},receiver_id.eq.${athleteId}),and(sender_id.eq.${athleteId},receiver_id.eq.${coachId})`
        )
        .order("created_at", { ascending: false })
        .limit(MSG_LIMIT);

      const fetched = ((data as ChatMessage[]) || []).reverse();
      setMessages(fetched);
      setHasMore(fetched.length >= MSG_LIMIT);
      setIsLoading(false);
    };

    fetchMessages();

    // Mark unread as read
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", athleteId)
      .eq("receiver_id", coachId)
      .eq("is_read", false)
      .then();
  }, [coachId, athleteId]);

  // Realtime subscription for this conversation
  useEffect(() => {
    if (!coachId || !athleteId) return;

    const channel = supabase
      .channel(`chat-widget-${athleteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (
            (msg.sender_id === athleteId && msg.receiver_id === coachId) ||
            (msg.sender_id === coachId && msg.receiver_id === athleteId)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            // Auto-mark as read if from athlete
            if (msg.sender_id === athleteId) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", msg.id)
                .then();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, athleteId]);

  // Auto-scroll only when near bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom || prevScrollHeightRef.current === 0) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  // Preserve scroll after loading older
  useEffect(() => {
    if (scrollRef.current && prevScrollHeightRef.current > 0) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [isLoadingOlder]);

  const loadOlder = async () => {
    if (!coachId || !athleteId || isLoadingOlder || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;
    prevScrollHeightRef.current = scrollRef.current?.scrollHeight || 0;
    setIsLoadingOlder(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${coachId},receiver_id.eq.${athleteId}),and(sender_id.eq.${athleteId},receiver_id.eq.${coachId})`
      )
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(MSG_LIMIT);

    const older = ((data as ChatMessage[]) || []).reverse();
    if (older.length > 0) {
      setMessages(prev => [...older, ...prev]);
    }
    setHasMore(older.length >= MSG_LIMIT);
    setIsLoadingOlder(false);
  };

  const handleScroll = () => {
    if (!scrollRef.current || isLoadingOlder || !hasMore) return;
    if (scrollRef.current.scrollTop < 60) {
      loadOlder();
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !coachId || !athleteId || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: coachId,
      receiver_id: athleteId,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      media_url: null,
      media_type: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("messages").insert({
      sender_id: coachId,
      receiver_id: athleteId,
      content,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Dün " + format(date, "HH:mm");
    return format(date, "dd MMM HH:mm", { locale: tr });
  };

  if (!athleteId || !coachId) {
    return (
      <div className="glass rounded-xl border border-border p-5 flex items-center justify-center h-[400px]">
        <p className="text-sm text-muted-foreground">Sohbet yüklenemiyor.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-border flex flex-col h-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Avatar className="w-8 h-8 border border-border">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {athleteInitials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground text-sm">{athleteName}</p>
          <p className="text-xs text-muted-foreground">Hızlı sohbet</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={cn("h-10 rounded-xl", i % 2 === 0 ? "w-3/4 ml-auto" : "w-3/4")} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Henüz mesaj yok. İlk mesajı gönderin!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCoach = msg.sender_id === coachId;
            return (
              <div key={msg.id} className={cn("flex", isCoach ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2",
                    isCoach
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.media_type === "image" && msg.media_url && (
                    <img src={msg.media_url} alt="" className="rounded-lg mb-1 max-h-32 object-cover" />
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      isCoach ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Mesaj yazın..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1 bg-secondary border-border focus:border-primary h-9"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-8 h-8 bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
