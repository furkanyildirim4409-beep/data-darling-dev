import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode, createElement } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ChatRoomType = 'assigned' | 'direct';
export type ChatRoomStatus = 'pending' | 'accepted' | 'declined';

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
  room_type: ChatRoomType;
  room_status: ChatRoomStatus;
  room_id: string | null;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_deleted?: boolean;
  media_url?: string | null;
  media_type?: string | null;
  metadata?: { story_id?: string; media_url?: string; category?: string } | null;
}

interface CoachChatValue {
  athletes: ChatAthlete[];
  selectedAthleteId: string | null;
  messages: ChatMessage[];
  totalUnread: number;
  isLoadingAthletes: boolean;
  isLoadingMessages: boolean;
  isLoadingOlder: boolean;
  hasMoreMessages: boolean;
  selectAthlete: (athleteId: string) => void;
  sendMessage: (content: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => Promise<void>;
  unsendMessage: (messageId: string) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  respondToRequest: (athleteId: string, action: 'approve' | 'decline') => Promise<void>;
  refetch: () => Promise<void>;
}

const CoachChatContext = createContext<CoachChatValue | null>(null);

function useCoachChatStateInternal(): CoachChatValue {
  const { user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions } = useAuth();
  const coachId = user?.id;

  const [athletes, setAthletes] = useState<ChatAthlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const selectedAthleteIdRef = useRef<string | null>(null);
  const athletesRef = useRef<ChatAthlete[]>([]);

  useEffect(() => {
    selectedAthleteIdRef.current = selectedAthleteId;
  }, [selectedAthleteId]);

  useEffect(() => {
    athletesRef.current = athletes;
  }, [athletes]);

  const getPreviewText = (content: string, mediaType?: string | null) => {
    if (mediaType === 'image') return '📷 Fotoğraf';
    if (mediaType === 'audio') return '🎤 Ses kaydı';
    return content;
  };

  const fetchAthletes = useCallback(async () => {
    if (!coachId || !activeCoachId) return;
    setIsLoadingAthletes(true);

    let assignedIds: string[] | null = null;
    if (isSubCoach && teamMemberPermissions !== 'full' && teamMember?.id) {
      const { data: assignmentData } = await supabase
        .from('team_member_athletes')
        .select('athlete_id')
        .eq('team_member_id', teamMember.id);

      if (!assignmentData || assignmentData.length === 0) {
        setAthletes([]);
        setTotalUnread(0);
        setIsLoadingAthletes(false);
        return;
      }
      assignedIds = assignmentData.map(a => a.athlete_id);
    }

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
      setTotalUnread(0);
      setIsLoadingAthletes(false);
      return;
    }

    const athleteIds = allProfiles.map(p => p.id);

    const { data: roomsData } = await supabase
      .from('chat_rooms')
      .select('id, athlete_id, room_type, status')
      .eq('coach_id', activeCoachId)
      .in('athlete_id', athleteIds);

    const roomMap = new Map<string, { id: string; room_type: ChatRoomType; status: ChatRoomStatus }>();
    for (const r of (roomsData || []) as any[]) {
      roomMap.set(r.athlete_id, { id: r.id, room_type: r.room_type, status: r.status });
    }

    const rosterIds = new Set<string>((profiles || []).map(p => p.id));

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
      if (!latestMap.has(athleteId)) latestMap.set(athleteId, msg);
      if (msg.receiver_id === coachId && !msg.is_read) {
        unreadMap.set(athleteId, (unreadMap.get(athleteId) || 0) + 1);
      }
    }

    const mapped: ChatAthlete[] = allProfiles
      .map(p => {
        const latest = latestMap.get(p.id);
        const room = roomMap.get(p.id);
        const isRoster = rosterIds.has(p.id);
        const room_type: ChatRoomType = room?.room_type ?? (isRoster ? 'assigned' : 'direct');
        const room_status: ChatRoomStatus = (room?.status as ChatRoomStatus) ?? 'accepted';
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
          room_type,
          room_status,
          room_id: room?.id ?? null,
        };
      })
      .filter(a => a.room_status !== 'declined');

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

    // Use functional updaters to avoid stale closure on athletes
    setAthletes(prev => {
      const target = prev.find(a => a.id === athleteId);
      const wasUnread = target?.unreadCount || 0;
      if (wasUnread > 0) {
        setTotalUnread(prevTotal => Math.max(0, prevTotal - wasUnread));
      }
      return prev.map(a => (a.id === athleteId ? { ...a, unreadCount: 0 } : a));
    });
  }, [coachId]);

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

  const unsendMessage = useCallback(async (messageId: string) => {
    if (!coachId) return;
    const deletedContent = '🚫 Bu mesaj silindi.';
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, is_deleted: true, content: deletedContent, media_url: null, media_type: null, metadata: null }
        : m
    ));
    setAthletes(prev => prev.map(a =>
      a.latestMessage && a.latestMessage.sender_id === coachId && a.id === selectedAthleteId
        ? { ...a, latestMessage: { ...a.latestMessage, content: deletedContent, media_type: null } }
        : a
    ));
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: deletedContent })
      .eq('id', messageId)
      .eq('sender_id', coachId);
    if (error && selectedAthleteId) {
      fetchMessages(selectedAthleteId);
    }
  }, [coachId, selectedAthleteId, fetchMessages]);

  const respondToRequest = useCallback(async (athleteId: string, action: 'approve' | 'decline') => {
    const target = athletesRef.current.find(a => a.id === athleteId);
    if (!target?.room_id) return;

    const newStatus: ChatRoomStatus = action === 'approve' ? 'accepted' : 'declined';

    if (action === 'approve') {
      setAthletes(prev => prev.map(a => (a.id === athleteId ? { ...a, room_status: 'accepted' } : a)));
    } else {
      setAthletes(prev => prev.filter(a => a.id !== athleteId));
      if (selectedAthleteId === athleteId) {
        setSelectedAthleteId(null);
        setMessages([]);
      }
    }

    const { error } = await supabase
      .from('chat_rooms')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', target.room_id);

    if (error) {
      fetchAthletes();
    }
  }, [selectedAthleteId, fetchAthletes]);

  // Realtime subscription
  useEffect(() => {
    if (!coachId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    const channel = supabase
      .channel(`coach-inbox-realtime:${coachId}:${channelId}`)
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

          const knownSender = athletesRef.current.some(a => a.id === senderId);
          if (!knownSender) {
            setTimeout(() => fetchAthletes(), 0);
          }

          if (senderId === selectedAthleteIdRef.current) {
            setMessages(prev => [...prev, newMsg]);
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);

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
          } else {
            let actuallyIncremented = false;
            setAthletes(prev => {
              const exists = prev.some(a => a.id === senderId);
              if (!exists) return prev;
              actuallyIncremented = true;
              const updated = prev.map(a =>
                a.id === senderId
                  ? { ...a, unreadCount: a.unreadCount + 1, latestMessage: { content: previewText, created_at: newMsg.created_at, sender_id: senderId, media_type: newMsg.media_type } }
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
            if (actuallyIncremented) {
              setTotalUnread(prev => prev + 1);
            }

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const mutedRaw = localStorage.getItem('coach_muted_chats');
                const muted: string[] = mutedRaw ? JSON.parse(mutedRaw) : [];
                if (!muted.includes(senderId)) {
                  const senderName = athletesRef.current.find(a => a.id === senderId)?.full_name || 'Sporcu';
                  new Notification(`💬 ${senderName} sana yeni bir mesaj gönderdi`, {
                    body: previewText.substring(0, 100),
                    icon: '/pwa-192x192.png',
                  });
                }
              } catch {}
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${coachId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          if (!updated?.id) return;
          setMessages(prev => prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${coachId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          const previous = payload.old as Partial<ChatMessage> | undefined;
          if (!updated?.id) return;
          setMessages(prev => prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m)));
          if (updated.is_deleted) {
            const senderId = updated.sender_id;
            setAthletes(prev => prev.map(a =>
              a.id === senderId && a.latestMessage && a.latestMessage.sender_id === senderId
                ? { ...a, latestMessage: { ...a.latestMessage, content: '🚫 Bu mesaj silindi.', media_type: null } }
                : a
            ));
          }
          // Live-decrement when a message is marked read elsewhere (other tab/page/realtime)
          const becameRead =
            updated.is_read === true &&
            (previous ? previous.is_read === false : true);
          if (becameRead) {
            const senderId = updated.sender_id;
            let decremented = false;
            setAthletes(prev =>
              prev.map(a => {
                if (a.id !== senderId) return a;
                if (a.unreadCount <= 0) return a;
                decremented = true;
                return { ...a, unreadCount: Math.max(0, a.unreadCount - 1) };
              })
            );
            if (decremented) {
              setTotalUnread(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_rooms',
          filter: `coach_id=eq.${activeCoachId ?? coachId}`,
        },
        () => {
          setTimeout(() => fetchAthletes(), 0);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_rooms',
          filter: `coach_id=eq.${activeCoachId ?? coachId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; athlete_id: string; status: string; room_type: string };
          if (!row) return;
          if (row.status === 'declined') {
            setAthletes(prev => prev.filter(a => a.id !== row.athlete_id));
            return;
          }
          setAthletes(prev =>
            prev.map(a =>
              a.id === row.athlete_id
                ? { ...a, room_status: row.status as ChatRoomStatus, room_type: row.room_type as ChatRoomType, room_id: row.id }
                : a
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [coachId, activeCoachId, fetchAthletes]);

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
    unsendMessage,
    loadOlderMessages,
    respondToRequest,
    refetch: fetchAthletes,
  };
}

export function CoachChatProvider({ children }: { children: ReactNode }) {
  const value = useCoachChatStateInternal();
  return createElement(CoachChatContext.Provider, { value }, children);
}

export function useCoachChat(): CoachChatValue {
  const ctx = useContext(CoachChatContext);
  if (!ctx) {
    throw new Error('useCoachChat must be used within CoachChatProvider');
  }
  return ctx;
}
