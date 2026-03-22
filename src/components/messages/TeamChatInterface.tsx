import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, Users, Search } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useTeamChat, type TeamContact, type TeamMessage } from "@/hooks/useTeamChat";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function TeamChatInterface() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    contacts,
    selectedContactId,
    messages,
    isLoadingContacts,
    isLoadingMessages,
    selectContact,
    sendMessage,
  } = useTeamChat();

  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialScrollDoneRef = useRef(false);

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  // Reset scroll flag on contact change
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [selectedContactId]);

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;
    const el = scrollRef.current;

    if (!initialScrollDoneRef.current) {
      el.scrollTop = el.scrollHeight;
      initialScrollDoneRef.current = true;
      return;
    }

    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSelectContact = (id: string) => {
    selectContact(id);
    if (isMobile) setMobileShowChat(true);
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date
  const grouped: { date: string; msgs: TeamMessage[] }[] = [];
  for (const msg of messages) {
    const dateStr = format(new Date(msg.created_at), "d MMMM yyyy", { locale: tr });
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date: dateStr, msgs: [msg] });
    }
  }

  // --- Sidebar ---
  const sidebar = (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-info" />
          <h2 className="font-semibold text-foreground">Ekip Sohbeti</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Üye ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-border"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoadingContacts ? (
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
            {search ? "Sonuç bulunamadı" : "Henüz ekip üyesi yok"}
          </div>
        ) : (
          <div className="p-2">
            {filtered.map(contact => (
              <button
                key={contact.id}
                onClick={() => handleSelectContact(contact.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selectedContactId === contact.id
                    ? "bg-info/10 border border-info/20"
                    : "hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contact.avatar || undefined} />
                    <AvatarFallback className="bg-info/20 text-info text-sm font-medium">
                      {contact.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm truncate",
                      contact.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
                    )}>
                      {contact.name}
                    </span>
                    {contact.lastMessage && (
                      <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                        {formatDistanceToNow(new Date(contact.lastMessage.created_at), { addSuffix: false, locale: tr })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-info/30 text-info font-normal">
                      {contact.role}
                    </Badge>
                    {contact.lastMessage ? (
                      <p className={cn(
                        "text-xs truncate",
                        contact.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {contact.lastMessage.sender_id !== contact.id ? "Sen: " : ""}
                        {contact.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Henüz mesaj yok</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // --- Chat Pane ---
  const chatPane = (
    <div className="flex-1 flex flex-col h-full bg-background">
      {selectedContact ? (
        <>
          {/* Header */}
          <div className="h-16 flex items-center gap-3 px-4 border-b border-border bg-card">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setMobileShowChat(false)} className="mr-1">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Avatar className="w-9 h-9 border-2 border-info/30">
              <AvatarImage src={selectedContact.avatar || undefined} />
              <AvatarFallback className="bg-info/20 text-info text-sm">
                {selectedContact.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">{selectedContact.name}</p>
              <p className="text-xs text-info">{selectedContact.role}</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-6 h-6 border-2 border-info border-t-transparent rounded-full" />
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
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm",
                              isMe
                                ? "bg-info text-info-foreground rounded-br-md"
                                : "bg-secondary text-foreground rounded-bl-md"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={cn(
                              "text-[10px] mt-1 text-right",
                              isMe ? "text-info-foreground/70" : "text-muted-foreground"
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
                className="flex-1 bg-muted/50 border-border focus:border-info"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="flex-shrink-0 h-9 w-9 bg-info text-info-foreground hover:bg-info/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Sohbet başlatmak için bir ekip üyesi seçin</p>
          </div>
        </div>
      )}
    </div>
  );

  // Mobile: single pane
  if (isMobile) {
    if (mobileShowChat && selectedContact) {
      return <div className="h-full flex flex-col">{chatPane}</div>;
    }
    return <div className="h-full">{sidebar}</div>;
  }

  // Desktop: two pane
  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0">{sidebar}</div>
      {chatPane}
    </div>
  );
}
