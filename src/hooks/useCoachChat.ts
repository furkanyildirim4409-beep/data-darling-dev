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

  // Fetch athletes + latest messages + unread counts in bulk
  const fetchAthletes = useCallback(async () => {
    if (!coachId) return;
    setIsLoadingAthletes(true);

    // 1. Get assigned athletes
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

    // 2. Get all messages between coach and any athlete (bulk, avoid N+1)
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.in.(${athleteIds.join(',')})),and(receiver_id.eq.${coachId},sender_id.in.(${athleteIds.join(',')}))`
      )
      .order('created_at', { ascending: false });

    // 3. Group: latest message per athlete + unread count
    const latestMap = new Map<string, ChatMessage>();
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

    const mapped: ChatAthlete[] = profiles.map(p => ({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      latestMessage: latestMap.get(p.id)
        ? {
            content: latestMap.get(p.id)!.content,
            created_at: latestMap.get(p.id)!.created_at,
            sender_id: latestMap.get(p.id)!.sender_id,
          }
        : null,
      unreadCount: unreadMap.get(p.id) || 0,
    }));

    // Sort by latest message time desc, athletes with no messages last
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

    // Mark unread as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', athleteId)
      .eq('receiver_id', coachId)
      .eq('is_read', false);

    // Update local unread count
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

  // Select athlete
  const selectAthlete = useCallback((athleteId: string) => {
    setSelectedAthleteId(athleteId);
    fetchMessages(athleteId);
  }, [fetchMessages]);

  // Send message with optimistic UI
  const sendMessage = useCallback(async (content: string) => {
    if (!coachId || !selectedAthleteId || !content.trim()) return;

    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: coachId,
      receiver_id: selectedAthleteId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    };

    // Optimistic append
    setMessages(prev => [...prev, optimistic]);

    // Update athlete's latest message
    setAthletes(prev =>
      prev.map(a =>
        a.id === selectedAthleteId
          ? { ...a, latestMessage: { content: optimistic.content, created_at: optimistic.created_at, sender_id: coachId } }
          : a
      )
    );

    const { error } = await supabase.from('messages').insert({
      sender_id: coachId,
      receiver_id: selectedAthleteId,
      content: content.trim(),
    });

    if (error) {
      // Rollback optimistic
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } else {
      // Fire push notification (fire-and-forget)
      supabase.functions.invoke('send-message-push', {
        body: {
          receiver_id: selectedAthleteId,
          sender_id: coachId,
          content: content.trim(),
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

          // If this athlete's chat is open, append & mark read
          if (senderId === selectedAthleteId) {
            setMessages(prev => [...prev, newMsg]);
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          } else {
            // Update unread count
            setAthletes(prev =>
              prev.map(a =>
                a.id === senderId
                  ? { ...a, unreadCount: a.unreadCount + 1, latestMessage: { content: newMsg.content, created_at: newMsg.created_at, sender_id: senderId } }
                  : a
              )
            );
            setTotalUnread(prev => prev + 1);
          }

          // Update latest message for inbox
          setAthletes(prev => {
            const updated = prev.map(a =>
              a.id === senderId
                ? { ...a, latestMessage: { content: newMsg.content, created_at: newMsg.created_at, sender_id: senderId } }
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

  // Initial fetch
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
