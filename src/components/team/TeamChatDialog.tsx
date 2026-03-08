import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Mic, Paperclip, MoreVertical, X } from "lucide-react";

interface Message {
  id: number;
  sender: "me" | "other";
  text: string;
  time: string;
}

interface TeamChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberInitials: string;
  memberRole: string;
}

const mockTeamMessages: Message[] = [
  { id: 1, sender: "other", text: "Merhaba, bugünkü antrenman programında bir değişiklik yapmam gerekiyor", time: "10:32" },
  { id: 2, sender: "me", text: "Tabii, ne tür bir değişiklik planlıyorsun?", time: "10:35" },
  { id: 3, sender: "other", text: "Ahmet'in bel ağrısı var, deadlift yerine hip hinge alternatifi ekleyebilir miyiz?", time: "10:38" },
  { id: 4, sender: "me", text: "Evet, Romanian deadlift veya hip thrust iyi alternatifler olabilir. Hangisini tercih edersin?", time: "10:42" },
  { id: 5, sender: "other", text: "Hip thrust daha güvenli olur sanırım, 3x12 olarak ekleyeyim mi?", time: "10:45" },
];

export function TeamChatDialog({ 
  open, 
  onOpenChange, 
  memberName, 
  memberInitials,
  memberRole 
}: TeamChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>(mockTeamMessages);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now(),
      sender: "me",
      text: newMessage,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };
    
    setMessages([...messages, message]);
    setNewMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px] p-0 overflow-hidden">
        {/* Header - Blue accent for team chat */}
        <div className="p-4 border-b border-border bg-info/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-info/30">
              <AvatarImage src="" />
              <AvatarFallback className="bg-info/20 text-info font-semibold">
                {memberInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-semibold">{memberName}</DialogTitle>
              <p className="text-xs text-info">{memberRole} • Çevrimiçi</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[350px] overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.sender === "me" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-3 py-2",
                  message.sender === "me"
                    ? "bg-info text-info-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                )}
              >
                <p className="text-sm">{message.text}</p>
                <p
                  className={cn(
                    "text-[10px] mt-1",
                    message.sender === "me" ? "text-info-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {message.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input - Blue accent */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground flex-shrink-0">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Mesaj yazın..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-secondary border-border focus:border-info h-9"
            />
            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground flex-shrink-0">
              <Mic className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="w-8 h-8 bg-info text-info-foreground hover:bg-info/90 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
