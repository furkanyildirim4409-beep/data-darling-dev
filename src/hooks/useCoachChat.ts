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
  metadata?: { story_id?: string; media_url?: string; category?: string } | null;
}

export function useCoachChat() {
  const { user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions } = useAuth();
  const coachId = user?.id; // message identity = real user

  const [athletes, setAthletes] = useState<ChatAthlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
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
    if (!coachId || !activeCoachId) return;
    setIsLoadingAthletes(true);

    // Assignment scoping for restricted sub-coaches
    let assignedIds: string[] | null = null;
    if (isSubCoach && teamMemberPermissions !== 'full' && teamMember?.id) {
      const { data: assignmentData } = await supabase
        .from('team_member_athletes')
        .select('athlete_id')
        .eq('team_member_id', teamMember.id);

      if (!assignmentData || assignmentData.length === 0) {
        setAthletes([]);
        setIsLoadingAthletes(false);
        return;
      }
      assignedIds = assignmentData.map(a => a.athlete_id);
    }

    // Use activeCoachId to fetch the agency's athletes
    let profilesQuery = supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('coach_id', activeCoachId);

    if (assignedIds) {
      profilesQuery = profilesQuery.in('id', assignedIds);
    }

    const { data: profiles } = await profilesQuery;

    const profileMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();
    for (const p of profiles || []) profileMap.set(p.id, p);

    // Find any senders messaging the coach who are NOT in the scoped roster
    // (e.g. story-reply senders). Look back 90 days.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: extraSenders } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', coachId)
      .gte('created_at', ninetyDaysAgo)
      .limit(1000);

    const extraIds = new Set<string>();
    for (const row of (extraSenders || []) as { sender_id: string }[]) {
      if (row.sender_id !== coachId && !profileMap.has(row.sender_id)) {
        // Honor sub-coach scoping: skip if assignedIds restricts and sender isn't assigned
        if (assignedIds && !assignedIds.includes(row.sender_id)) continue;
        extraIds.add(row.sender_id);
      }
    }

    if (extraIds.size > 0) {
      const { data: extraProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(extraIds));
      for (const p of extraProfiles || []) profileMap.set(p.id, p);
    }

    const allProfiles = Array.from(profileMap.values());
    if (allProfiles.length === 0) {
      setAthletes([]);
      setIsLoadingAthletes(false);
      return;
    }

    const athleteIds = allProfiles.map(p => p.id);

    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.in.(${athleteIds.join(',')})),and(receiver_id.eq.${coachId},sender_id.in.(${athleteIds.join(',')}))`
      )
      .order('created_at', { ascending: false })
      .limit(500);

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
  }, [coachId, activeCoachId, isSubCoach, teamMember, teamMemberPermissions]);

  const MSG_PAGE_SIZE = 50;

  // Fetch messages for selected athlete
  const fetchMessages = useCallback(async (athleteId: string) => {
    if (!coachId) return;
    setIsLoadingMessages(true);
    setHasMoreMessages(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.eq.${athleteId}),and(sender_id.eq.${athleteId},receiver_id.eq.${coachId})`
      )
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE_SIZE);

    const fetched = ((data as ChatMessage[]) || []).reverse();
    setMessages(fetched);
    setHasMoreMessages(fetched.length >= MSG_PAGE_SIZE);
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

  // Load older messages
  const loadOlderMessages = useCallback(async () => {
    if (!coachId || !selectedAthleteId || isLoadingOlder || !hasMoreMessages) return;
    const oldestMsg = messages[0];
    if (!oldestMsg) return;

    setIsLoadingOlder(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.eq.${selectedAthleteId}),and(sender_id.eq.${selectedAthleteId},receiver_id.eq.${coachId})`
      )
      .lt('created_at', oldestMsg.created_at)
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE_SIZE);

    const older = ((data as ChatMessage[]) || []).reverse();
    if (older.length > 0) {
      setMessages(prev => [...older, ...prev]);
    }
    setHasMoreMessages(older.length >= MSG_PAGE_SIZE);
    setIsLoadingOlder(false);
  }, [coachId, selectedAthleteId, isLoadingOlder, hasMoreMessages, messages]);

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
    }
  }, [coachId, selectedAthleteId]);

  // Realtime subscription
  useEffect(() => {
    if (!coachId) return;

    const channel = supabase
      .channel(`coach-inbox-realtime:${coachId}:${Date.now()}`)
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
                  new Notification(`💬 ${senderName} sana yeni bir mesaj gönderdi`, {
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

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
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
    isLoadingOlder,
    hasMoreMessages,
    selectAthlete,
    sendMessage,
    loadOlderMessages,
    refetch: fetchAthletes,
  };
}
