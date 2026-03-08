import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Mic, Paperclip, MoreVertical } from "lucide-react";

interface Message {
  id: number;
  sender: "coach" | "athlete";
  text: string;
  time: string;
}

interface ChatWidgetProps {
  athleteName: string;
  athleteInitials: string;
}

const mockMessages: Message[] = [
  { id: 1, sender: "athlete", text: "Koçum, dünkü antrenmandan sonra bel bölgemde hafif bir sertlik hissediyorum", time: "Dün 16:32" },
  { id: 2, sender: "coach", text: "Bildirdiğin için teşekkürler. Bu hafta deadlift hacmini azaltalım. Antrenman öncesi mobilite çalışmalarına odaklan.", time: "Dün 17:15" },
  { id: 3, sender: "athlete", text: "Anladım! Özel esneme hareketleri eklemeli miyim?", time: "Dün 17:18" },
  { id: 4, sender: "coach", text: "Evet, antrenman öncesi 5 dakika kalça fleksör germeleri ve kedi-inek hareketi ekle. Ayrıca torasik omurganı foam roller ile çalış.", time: "Dün 17:22" },
  { id: 5, sender: "athlete", text: "Tamam, yapacağım! Bir de beslenme hakkında sormak istedim - yoğun günlerde karbonhidratı artırsam olur mu?", time: "Bugün 09:45" },
  { id: 6, sender: "coach", text: "Kesinlikle. Ağır antrenman günlerinde antrenman etrafında 50g ekstra karbonhidrat al. Pirinç veya yulafa odaklan.", time: "Bugün 10:02" },
];

export function ChatWidget({ athleteName, athleteInitials }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now(),
      sender: "coach",
      text: newMessage,
      time: "Şimdi",
    };
    
    setMessages([...messages, message]);
    setNewMessage("");
  };

  return (
    <div className="glass rounded-xl border border-border flex flex-col h-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {athleteInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground text-sm">{athleteName}</p>
            <p className="text-xs text-success">Çevrimiçi</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.sender === "coach" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-xl px-3 py-2",
                message.sender === "coach"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              )}
            >
              <p className="text-sm">{message.text}</p>
              <p
                className={cn(
                  "text-[10px] mt-1",
                  message.sender === "coach" ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {message.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground flex-shrink-0">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder="Mesaj yazın..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-secondary border-border focus:border-primary h-9"
          />
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground flex-shrink-0">
            <Mic className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-8 h-8 bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
