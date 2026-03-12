import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, MessageCircle, Bell, BellOff, ImagePlus, Mic, Square, X, Loader2, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { ChatAthlete, ChatMessage } from "@/hooks/useCoachChat";
import { useMutedChats } from "@/hooks/useMutedChats";
import { useMediaUpload } from "@/hooks/useMediaUpload";

interface ActiveChatProps {
  athlete: ChatAthlete | null;
  messages: ChatMessage[];
  coachId: string;
  isLoading: boolean;
  isLoadingOlder?: boolean;
  hasMoreMessages?: boolean;
  onSendMessage: (content: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => void;
  onLoadOlder?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

function MiniAudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <button onClick={toggle} className="flex items-center gap-2 py-1">
      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      <span className="text-xs">Ses kaydı</span>
      <div className="flex gap-0.5">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="w-0.5 rounded-full bg-current opacity-60" style={{ height: `${6 + Math.random() * 10}px` }} />
        ))}
      </div>
    </button>
  );
}

export function ActiveChat({ athlete, messages, coachId, isLoading, isLoadingOlder, hasMoreMessages, onSendMessage, onLoadOlder, onBack, showBackButton }: ActiveChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isMuted, toggleMute } = useMutedChats();
  const prevScrollHeightRef = useRef<number>(0);
  const initialScrollDoneRef = useRef(false);

  const handleMediaSent = useCallback((mediaUrl: string, mediaType: 'image' | 'audio') => {
    onSendMessage('', mediaUrl, mediaType);
  }, [onSendMessage]);

  const { isUploading, isRecording, recordingDuration, handleImageSelect, startRecording, stopRecording, cancelRecording } = useMediaUpload({
    userId: coachId,
    onUploadComplete: handleMediaSent,
  });

  // Reset initial flag when athlete changes
  useEffect(() => {
    initialScrollDoneRef.current = false;
    prevScrollHeightRef.current = 0;
  }, [athlete?.id]);

  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;
    const el = scrollRef.current;

    // Restore scroll position after loading older messages
    if (prevScrollHeightRef.current > 0) {
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
      return;
    }

    // First load: scroll to bottom
    if (!initialScrollDoneRef.current) {
      el.scrollTop = el.scrollHeight;
      initialScrollDoneRef.current = true;
      return;
    }

    // New message: only scroll if near bottom
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !onLoadOlder || !hasMoreMessages || isLoadingOlder) return;
    if (scrollRef.current.scrollTop < 60) {
      prevScrollHeightRef.current = scrollRef.current.scrollHeight;
      onLoadOlder();
    }
  }, [onLoadOlder, hasMoreMessages, isLoadingOlder]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
    inputRef.current?.focus();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
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
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">{athlete.full_name || "İsimsiz"}</p>
          <p className="text-xs text-muted-foreground">Sporcu</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleMute(athlete.id)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title={isMuted(athlete.id) ? "Bildirimleri aç" : "Bildirimleri kapat"}
        >
          {isMuted(athlete.id) ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
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
                        {/* Media rendering */}
                        {msg.media_type === 'image' && msg.media_url && (
                          <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={msg.media_url}
                              alt="Paylaşılan fotoğraf"
                              className="rounded-lg max-w-full max-h-60 object-cover mb-1"
                              loading="lazy"
                            />
                          </a>
                        )}
                        {msg.media_type === 'audio' && msg.media_url && (
                          <MiniAudioPlayer src={msg.media_url} />
                        )}
                        {/* Text content (skip placeholder text for media-only messages) */}
                        {msg.content && msg.content !== '📷 Fotoğraf' && msg.content !== '🎤 Ses kaydı' && (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelect(file);
          e.target.value = '';
        }}
      />

      {/* Input area */}
      <div className="p-3 border-t border-border bg-card">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={cancelRecording} className="h-9 w-9 text-destructive">
              <X className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-mono text-foreground">{formatDuration(recordingDuration)}</span>
              <span className="text-xs text-muted-foreground">Kayıt yapılıyor...</span>
            </div>
            <Button size="icon" onClick={stopRecording} className="h-9 w-9 bg-primary text-primary-foreground">
              <Square className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Mesaj yaz..."
              className="flex-1 bg-muted/50 border-border"
              disabled={isUploading}
            />
            {input.trim() ? (
              <Button type="submit" size="icon" disabled={isUploading} className="flex-shrink-0 h-9 w-9">
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={startRecording}
                disabled={isUploading}
                className="flex-shrink-0 h-9 w-9"
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
