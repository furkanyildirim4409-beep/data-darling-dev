import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Send, ImagePlus, Mic, Square, Loader2, Bell, BellOff, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutedChats } from "@/hooks/useMutedChats";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import type { ChatMessage } from "@/hooks/useCoachChat";

interface QuickChatPopoverProps {
  athlete: { id: string; name: string; avatar?: string; sport?: string };
  onClose: () => void;
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
      {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      <span className="text-xs">Ses kaydı</span>
    </button>
  );
}

export function QuickChatPopover({ athlete, onClose }: QuickChatPopoverProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const MSG_LIMIT = 50;
  const { user } = useAuth();
  const coachId = user?.id;
  const { isMuted, toggleMute } = useMutedChats();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const initialScrollDoneRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSent = useCallback((mediaUrl: string, mediaType: 'image' | 'audio') => {
    if (!coachId) return;
    const content = mediaType === 'image' ? '📷 Fotoğraf' : '🎤 Ses kaydı';
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: coachId,
      receiver_id: athlete.id,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      media_url: mediaUrl,
      media_type: mediaType,
    };
    setMessages(prev => [...prev, optimistic]);
    supabase.from('messages').insert({
      sender_id: coachId,
      receiver_id: athlete.id,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
    });
  }, [coachId, athlete.id]);

  const { isUploading, isRecording, recordingDuration, handleImageSelect, startRecording, stopRecording, cancelRecording } = useMediaUpload({
    userId: coachId || '',
    onUploadComplete: handleMediaSent,
  });

  // Fetch messages directly
  useEffect(() => {
    if (!coachId || !athlete.id) return;

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      setHasMore(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${coachId},receiver_id.eq.${athlete.id}),and(sender_id.eq.${athlete.id},receiver_id.eq.${coachId})`
        )
        .order('created_at', { ascending: false })
        .limit(MSG_LIMIT);

      if (error) {
        console.error('QuickChat fetch error:', error);
      }

      const fetched = ((data as ChatMessage[]) || []).reverse();
      setMessages(fetched);
      setHasMore(fetched.length >= MSG_LIMIT);
      setIsLoadingMessages(false);

      // Mark unread as read
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', athlete.id)
        .eq('receiver_id', coachId)
        .eq('is_read', false)
        .then();
    };

    fetchMessages();
  }, [coachId, athlete.id]);

  // Realtime subscription
  useEffect(() => {
    if (!coachId || !athlete.id) return;

    const channel = supabase
      .channel(`quick-chat-${athlete.id}-${coachId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (
            (msg.sender_id === athlete.id && msg.receiver_id === coachId) ||
            (msg.sender_id === coachId && msg.receiver_id === athlete.id)
          ) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            // Auto-mark as read if from athlete
            if (msg.sender_id === athlete.id) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', msg.id)
                .then();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, athlete.id]);

  // Auto-scroll only when near bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom || prevScrollHeightRef.current === 0) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  // Preserve scroll after loading older
  useEffect(() => {
    if (scrollContainerRef.current && prevScrollHeightRef.current > 0) {
      const el = scrollContainerRef.current;
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [isLoadingOlder]);

  const loadOlder = async () => {
    if (!coachId || isLoadingOlder || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;
    prevScrollHeightRef.current = scrollContainerRef.current?.scrollHeight || 0;
    setIsLoadingOlder(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.eq.${athlete.id}),and(sender_id.eq.${athlete.id},receiver_id.eq.${coachId})`
      )
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(MSG_LIMIT);

    const older = ((data as ChatMessage[]) || []).reverse();
    if (older.length > 0) {
      setMessages(prev => [...older, ...prev]);
    }
    setHasMore(older.length >= MSG_LIMIT);
    setIsLoadingOlder(false);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingOlder || !hasMore) return;
    if (scrollContainerRef.current.scrollTop < 60) {
      loadOlder();
    }
  };

  const initials = athlete.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleSend = async () => {
    if (!input.trim() || !coachId) return;
    const text = input.trim();
    setInput("");

    // Optimistic
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: coachId,
      receiver_id: athlete.id,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
      media_url: null,
      media_type: null,
    };
    setMessages(prev => [...prev, optimistic]);

    const { error } = await supabase.from('messages').insert({
      sender_id: coachId,
      receiver_id: athlete.id,
      content: text,
    });

    if (error) {
      console.error('QuickChat send error:', error);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
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

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Determine if last message is from athlete (unanswered)
  const lastMsg = messages[messages.length - 1];
  const isUnanswered = lastMsg && lastMsg.sender_id !== coachId;

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

      {/* Unanswered banner */}
      {isUnanswered && (
        <div className="px-4 py-2 bg-warning/10 border-b border-warning/20 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
          </span>
          <span className="text-xs text-warning font-medium">Cevap bekliyor</span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground mt-8">Henüz mesaj yok</p>
        ) : (
          messages.map((msg) => {
            const isCoach = msg.sender_id === coachId;
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
                  {msg.media_type === 'image' && msg.media_url && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                      <img src={msg.media_url} alt="Fotoğraf" className="rounded-lg max-w-full max-h-40 object-cover mb-1" loading="lazy" />
                    </a>
                  )}
                  {msg.media_type === 'audio' && msg.media_url && (
                    <MiniAudioPlayer src={msg.media_url} />
                  )}
                  {msg.content && msg.content !== '📷 Fotoğraf' && msg.content !== '🎤 Ses kaydı' && (
                    <span>{msg.content}</span>
                  )}
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

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={cancelRecording} className="h-8 w-8 text-destructive">
              <X className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-mono text-foreground">{formatDuration(recordingDuration)}</span>
            </div>
            <Button size="icon" onClick={stopRecording} className="h-8 w-8 bg-primary text-primary-foreground">
              <Square className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            </Button>
            <Input
              placeholder="Mesaj yazın..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 h-9 bg-secondary border-border text-sm"
              disabled={isUploading}
            />
            {input.trim() ? (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isUploading}
                className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={startRecording}
                disabled={isUploading}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
