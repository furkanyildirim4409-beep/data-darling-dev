import { useState, useEffect, useRef } from "react";
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
import { Send, Paperclip, MoreVertical, Loader2 } from "lucide-react";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberInitials: string;
  memberRole: string;
  memberUserId?: string | null;
}

export function TeamChatDialog({
  open,
  onOpenChange,
  memberName,
  memberInitials,
  memberRole,
  memberUserId,
}: TeamChatDialogProps) {
  const { user } = useAuth();
  const { messages, sendMessage, selectContact, isLoadingMessages } = useTeamChat();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected contact when dialog opens
  useEffect(() => {
    if (open && memberUserId) {
      selectContact(memberUserId);
    }
  }, [open, memberUserId, selectContact]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage(newMessage);
    setNewMessage("");
  };

  const noAccount = !memberUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px] p-0 overflow-hidden">
        {/* Header */}
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
              <p className="text-xs text-info">{memberRole}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Guard: no account */}
        {noAccount ? (
          <div className="h-[350px] flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground text-center">
              Bu kullanıcının henüz aktif bir hesabı yok.
            </p>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="h-[350px] overflow-y-auto p-4 space-y-3">
              {isLoadingMessages ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      <Skeleton className="h-12 w-48 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Henüz mesaj yok. İlk mesajı gönderin!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isMe = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isMe ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2",
                          isMe
                            ? "bg-info text-info-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isMe ? "text-info-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {new Date(message.created_at).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
