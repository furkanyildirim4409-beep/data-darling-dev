import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatAthlete {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  latestMessage: {
    content: string;
    created_at: string;
    sender_id: string;
    media_type?: string | null;
  } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  media_url?: string | null;
  media_type?: string | null;
}

export function useCoachChat() {
  const { user } = useAuth();
  const coachId = user?.id;

  const [athletes, setAthletes] = useState<ChatAthlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Helper: get preview text for a message
  const getPreviewText = (content: string, mediaType?: string | null) => {
    if (mediaType === 'image') return '📷 Fotoğraf';
    if (mediaType === 'audio') return '🎤 Ses kaydı';
    return content;
  };

  // Fetch athletes + latest messages + unread counts in bulk
  const fetchAthletes = useCallback(async () => {
    if (!coachId) return;
    setIsLoadingAthletes(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('coach_id', coachId);

    if (!profiles || profiles.length === 0) {
      setAthletes([]);
      setIsLoadingAthletes(false);
      return;
    }

    const athleteIds = profiles.map(p => p.id);

    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.in.(${athleteIds.join(',')})),and(receiver_id.eq.${coachId},sender_id.in.(${athleteIds.join(',')}))`
      )
      .order('created_at', { ascending: false });

    const latestMap = new Map<string, any>();
    const unreadMap = new Map<string, number>();

    for (const msg of (allMessages || []) as ChatMessage[]) {
      const athleteId = msg.sender_id === coachId ? msg.receiver_id : msg.sender_id;

      if (!latestMap.has(athleteId)) {
        latestMap.set(athleteId, msg);
      }

      if (msg.receiver_id === coachId && !msg.is_read) {
        unreadMap.set(athleteId, (unreadMap.get(athleteId) || 0) + 1);
      }
    }

    const mapped: ChatAthlete[] = profiles.map(p => {
      const latest = latestMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        latestMessage: latest
          ? {
              content: getPreviewText(latest.content, latest.media_type),
              created_at: latest.created_at,
              sender_id: latest.sender_id,
              media_type: latest.media_type,
            }
          : null,
        unreadCount: unreadMap.get(p.id) || 0,
      };
    });

    mapped.sort((a, b) => {
      if (!a.latestMessage && !b.latestMessage) return 0;
      if (!a.latestMessage) return 1;
      if (!b.latestMessage) return -1;
      return new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime();
    });

    setAthletes(mapped);
    setTotalUnread(mapped.reduce((sum, a) => sum + a.unreadCount, 0));
    setIsLoadingAthletes(false);
  }, [coachId]);

  // Fetch messages for selected athlete
  const fetchMessages = useCallback(async (athleteId: string) => {
    if (!coachId) return;
    setIsLoadingMessages(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.eq.${athleteId}),and(sender_id.eq.${athleteId},receiver_id.eq.${coachId})`
      )
      .order('created_at', { ascending: true });

    setMessages((data as ChatMessage[]) || []);
    setIsLoadingMessages(false);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', athleteId)
      .eq('receiver_id', coachId)
      .eq('is_read', false);

    setAthletes(prev =>
      prev.map(a =>
        a.id === athleteId ? { ...a, unreadCount: 0 } : a
      )
    );
    setTotalUnread(prev => {
      const athleteUnread = athletes.find(a => a.id === athleteId)?.unreadCount || 0;
      return Math.max(0, prev - athleteUnread);
    });
  }, [coachId, athletes]);

  const selectAthlete = useCallback((athleteId: string) => {
    setSelectedAthleteId(athleteId);
    fetchMessages(athleteId);
  }, [fetchMessages]);

  // Send message with optimistic UI — supports media
  const sendMessage = useCallback(async (content: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => {
    if (!coachId || !selectedAthleteId) return;
    if (!content.trim() && !mediaUrl) return;

    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: coachId,
      receiver_id: selectedAthleteId,
      content: content.trim() || (mediaType === 'image' ? '📷 Fotoğraf' : '🎤 Ses kaydı'),
      created_at: new Date().toISOString(),
      is_read: false,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    };

    setMessages(prev => [...prev, optimistic]);

    const previewText = getPreviewText(optimistic.content, mediaType);
    setAthletes(prev =>
      prev.map(a =>
        a.id === selectedAthleteId
          ? { ...a, latestMessage: { content: previewText, created_at: optimistic.created_at, sender_id: coachId, media_type: mediaType } }
          : a
      )
    );

    const insertData: any = {
      sender_id: coachId,
      receiver_id: selectedAthleteId,
      content: content.trim() || (mediaType === 'image' ? '📷 Fotoğraf' : '🎤 Ses kaydı'),
    };
    if (mediaUrl) insertData.media_url = mediaUrl;
    if (mediaType) insertData.media_type = mediaType;

    const { error } = await supabase.from('messages').insert(insertData);

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } else {
      supabase.functions.invoke('send-message-push', {
        body: {
          receiver_id: selectedAthleteId,
          sender_id: coachId,
          content: previewText,
        },
      }).catch(() => {});
    }
  }, [coachId, selectedAthleteId]);

  // Realtime subscription
  useEffect(() => {
    if (!coachId) return;

    channelRef.current = supabase
      .channel('coach-inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${coachId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          const senderId = newMsg.sender_id;
          const previewText = getPreviewText(newMsg.content, newMsg.media_type);

          if (senderId === selectedAthleteId) {
            setMessages(prev => [...prev, newMsg]);
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          } else {
            setAthletes(prev =>
              prev.map(a =>
                a.id === senderId
                  ? { ...a, unreadCount: a.unreadCount + 1, latestMessage: { content: previewText, created_at: newMsg.created_at, sender_id: senderId, media_type: newMsg.media_type } }
                  : a
              )
            );
            setTotalUnread(prev => prev + 1);

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const mutedRaw = localStorage.getItem('coach_muted_chats');
                const muted: string[] = mutedRaw ? JSON.parse(mutedRaw) : [];
                if (!muted.includes(senderId)) {
                  const senderName = athletes.find(a => a.id === senderId)?.full_name || 'Sporcu';
                  new Notification(`Yeni Mesaj: ${senderName}`, {
                    body: previewText.substring(0, 100),
                    icon: '/pwa-192x192.png',
                  });
                }
              } catch {}
            }
          }

          setAthletes(prev => {
            const updated = prev.map(a =>
              a.id === senderId
                ? { ...a, latestMessage: { content: previewText, created_at: newMsg.created_at, sender_id: senderId, media_type: newMsg.media_type } }
                : a
            );
            updated.sort((a, b) => {
              if (!a.latestMessage && !b.latestMessage) return 0;
              if (!a.latestMessage) return 1;
              if (!b.latestMessage) return -1;
              return new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime();
            });
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [coachId, selectedAthleteId]);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  return {
    athletes,
    selectedAthleteId,
    messages,
    totalUnread,
    isLoadingAthletes,
    isLoadingMessages,
    selectAthlete,
    sendMessage,
    refetch: fetchAthletes,
  };
}
