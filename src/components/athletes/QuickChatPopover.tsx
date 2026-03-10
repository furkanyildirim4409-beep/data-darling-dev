import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Send, Paperclip, Smile, Loader2, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useAuth } from "@/contexts/AuthContext";
import { useMutedChats } from "@/hooks/useMutedChats";

interface QuickChatPopoverProps {
  athlete: { id: string; name: string; avatar?: string; sport?: string };
  onClose: () => void;
}

export function QuickChatPopover({ athlete, onClose }: QuickChatPopoverProps) {
  const [input, setInput] = useState("");
  const { messages, selectAthlete, sendMessage, isLoadingMessages } = useCoachChat();
  const { user } = useAuth();
  const { isMuted, toggleMute } = useMutedChats();
  const bottomRef = useRef<HTMLDivElement>(null);
  const initializedAthleteId = useRef<string | null>(null);

  useEffect(() => {
    if (athlete.id && initializedAthleteId.current !== athlete.id) {
      initializedAthleteId.current = athlete.id;
      selectAthlete(athlete.id);
    }
  }, [athlete.id, selectAthlete]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initials = athlete.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[450px] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={athlete.avatar} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground text-sm">{athlete.name}</p>
            <p className="text-xs text-muted-foreground">{athlete.sport}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleMute(athlete.id)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title={isMuted(athlete.id) ? "Bildirimleri aç" : "Bildirimleri kapat"}
          >
            {isMuted(athlete.id) ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground mt-8">Henüz mesaj yok</p>
        ) : (
          messages.map((msg) => {
            const isCoach = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%]",
                  isCoach ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm",
                    isCoach
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder="Mesaj yazın..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-9 bg-secondary border-border text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Smile className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
