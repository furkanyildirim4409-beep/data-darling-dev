import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Send, ImagePlus, Mic, Square, Loader2, Bell, BellOff, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useAuth } from "@/contexts/AuthContext";
import { useMutedChats } from "@/hooks/useMutedChats";
import { useMediaUpload } from "@/hooks/useMediaUpload";

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
  const { messages, selectAthlete, sendMessage, isLoadingMessages } = useCoachChat();
  const { user } = useAuth();
  const { isMuted, toggleMute } = useMutedChats();
  const bottomRef = useRef<HTMLDivElement>(null);
  const initializedAthleteId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSent = useCallback((mediaUrl: string, mediaType: 'image' | 'audio') => {
    sendMessage('', mediaUrl, mediaType);
  }, [sendMessage]);

  const { isUploading, isRecording, recordingDuration, handleImageSelect, startRecording, stopRecording, cancelRecording } = useMediaUpload({
    userId: user?.id || '',
    onUploadComplete: handleMediaSent,
  });

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

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
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
