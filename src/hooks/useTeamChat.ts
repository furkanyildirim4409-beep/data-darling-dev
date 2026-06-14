import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode, createElement } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TeamContact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  unreadCount: number;
  lastMessage: { content: string; created_at: string; sender_id: string } | null;
}

export interface TeamMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface TeamChatValue {
  contacts: TeamContact[];
  selectedContactId: string | null;
  messages: TeamMessage[];
  totalUnread: number;
  isLoadingContacts: boolean;
  isLoadingMessages: boolean;
  selectContact: (contactId: string) => void;
  sendMessage: (content: string) => Promise<void>;
}

const TeamChatContext = createContext<TeamChatValue | null>(null);

function useTeamChatStateInternal(): TeamChatValue {
  const { user, activeCoachId, isSubCoach } = useAuth();
  const userId = user?.id;

  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const selectedContactIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  const fetchContacts = useCallback(async () => {
    if (!userId || !activeCoachId) return;
    setIsLoadingContacts(true);

    let contactProfiles: { id: string; name: string; avatar: string; role: string }[] = [];

    if (!isSubCoach) {
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, full_name, avatar_url, role')
        .eq('head_coach_id', userId)
        .eq('status', 'active')
        .not('user_id', 'is', null);

      contactProfiles = (members || []).map(m => ({
        id: m.user_id!,
        name: m.full_name,
        avatar: m.avatar_url || '',
        role: m.role,
      }));
    } else {
      const { data: headCoachInfo } = await supabase
        .rpc('get_coach_info', { _coach_id: activeCoachId });

      if (headCoachInfo) {
        const info = headCoachInfo as { full_name: string; avatar_url: string };
        contactProfiles.push({
          id: activeCoachId,
          name: info.full_name || 'Baş Antrenör',
          avatar: info.avatar_url || '',
          role: 'Baş Antrenör',
        });
      }

      const { data: peers } = await supabase
        .from('team_members')
        .select('user_id, full_name, avatar_url, role')
        .eq('head_coach_id', activeCoachId)
        .eq('status', 'active')
        .not('user_id', 'is', null);

      for (const p of peers || []) {
        if (p.user_id && p.user_id !== userId) {
          contactProfiles.push({
            id: p.user_id,
            name: p.full_name,
            avatar: p.avatar_url || '',
            role: p.role,
          });
        }
      }
    }

    contactProfiles = contactProfiles.filter(c => !!c.id);

    if (contactProfiles.length === 0) {
      setContacts([]);
      setTotalUnread(0);
      setIsLoadingContacts(false);
      return;
    }

    const contactIds = contactProfiles.map(c => c.id);

    const { data: allMessages } = await supabase
      .from('team_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.in.(${contactIds.join(',')})),and(receiver_id.eq.${userId},sender_id.in.(${contactIds.join(',')}))`
      )
      .order('created_at', { ascending: false })
      .limit(500);

    const latestMap = new Map<string, TeamMessage>();
    const unreadMap = new Map<string, number>();

    for (const msg of (allMessages || []) as TeamMessage[]) {
      const contactId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!latestMap.has(contactId)) latestMap.set(contactId, msg);
      if (msg.receiver_id === userId && !msg.is_read) {
        unreadMap.set(contactId, (unreadMap.get(contactId) || 0) + 1);
      }
    }

    const mapped: TeamContact[] = contactProfiles.map(c => {
      const latest = latestMap.get(c.id);
      return {
        ...c,
        unreadCount: unreadMap.get(c.id) || 0,
        lastMessage: latest
          ? { content: latest.content, created_at: latest.created_at, sender_id: latest.sender_id }
          : null,
      };
    });

    mapped.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    });

    setContacts(mapped);
    setTotalUnread(mapped.reduce((s, c) => s + c.unreadCount, 0));
    setIsLoadingContacts(false);
  }, [userId, activeCoachId, isSubCoach]);

  const fetchMessages = useCallback(async (contactId: string) => {
    if (!userId) return;
    setIsLoadingMessages(true);

    const { data } = await supabase
      .from('team_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(50);

    setMessages(((data as TeamMessage[]) || []).reverse());
    setIsLoadingMessages(false);

    await supabase
      .from('team_messages')
      .update({ is_read: true })
      .eq('sender_id', contactId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    setContacts(prev => {
      const target = prev.find(c => c.id === contactId);
      const wasUnread = target?.unreadCount || 0;
      if (wasUnread > 0) {
        setTotalUnread(prevTotal => Math.max(0, prevTotal - wasUnread));
      }
      return prev.map(c => c.id === contactId ? { ...c, unreadCount: 0 } : c);
    });
  }, [userId]);

  const selectContact = useCallback((contactId: string) => {
    setSelectedContactId(contactId);
    fetchMessages(contactId);
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!userId || !selectedContactId || !content.trim()) return;

    const text = content.trim();
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();

    const optimistic: TeamMessage = {
      id: tempId,
      sender_id: userId,
      receiver_id: selectedContactId,
      content: text,
      is_read: false,
      created_at: now,
    };

    setMessages(prev => [...prev, optimistic]);

    const contactId = selectedContactId;
    setContacts(prev =>
      prev.map(c =>
        c.id === contactId
          ? { ...c, lastMessage: { content: text, created_at: now, sender_id: userId } }
          : c
      )
    );

    const { error } = await supabase
      .from('team_messages')
      .insert({ sender_id: userId, receiver_id: contactId, content: text })
      .select()
      .single();

    if (error) {
      toast.error('Mesaj gönderilemedi: ' + error.message);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      fetchContacts();
    }
  }, [userId, selectedContactId, fetchContacts]);

  // Realtime
  useEffect(() => {
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`team-chat-realtime-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        (payload) => {
          const newMsg = payload.new as TeamMessage;
          if (newMsg.sender_id !== userId && newMsg.receiver_id !== userId) return;

          if (newMsg.sender_id === userId) {
            setMessages(prev => {
              const hasOptimistic = prev.some(
                m => m.sender_id === userId && m.receiver_id === newMsg.receiver_id && m.content === newMsg.content && m.id !== newMsg.id
              );
              if (hasOptimistic) {
                let replaced = false;
                return prev.map(m => {
                  if (!replaced && m.sender_id === userId && m.receiver_id === newMsg.receiver_id && m.content === newMsg.content && m.id !== newMsg.id) {
                    replaced = true;
                    return newMsg;
                  }
                  return m;
                });
              }
              if (newMsg.receiver_id === selectedContactIdRef.current) {
                return [...prev, newMsg];
              }
              return prev;
            });
            return;
          }

          const senderId = newMsg.sender_id;

          if (senderId === selectedContactIdRef.current) {
            setMessages(prev => [...prev, newMsg]);
            supabase.from('team_messages').update({ is_read: true }).eq('id', newMsg.id);
          } else {
            let incremented = false;
            setContacts(prev => {
              const exists = prev.some(c => c.id === senderId);
              if (!exists) return prev;
              incremented = true;
              return prev.map(c =>
                c.id === senderId ? { ...c, unreadCount: c.unreadCount + 1 } : c
              );
            });
            if (incremented) {
              setTotalUnread(prev => prev + 1);
            } else {
              // Unknown sender — refresh contacts so they appear
              setTimeout(() => fetchContacts(), 0);
            }
          }

          setContacts(prev => {
            const updated = prev.map(c =>
              c.id === senderId
                ? { ...c, lastMessage: { content: newMsg.content, created_at: newMsg.created_at, sender_id: senderId } }
                : c
            );
            updated.sort((a, b) => {
              if (!a.lastMessage && !b.lastMessage) return 0;
              if (!a.lastMessage) return 1;
              if (!b.lastMessage) return -1;
              return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
            });
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'team_messages' },
        (payload) => {
          const updated = payload.new as TeamMessage;
          const previous = payload.old as Partial<TeamMessage> | undefined;
          if (!updated?.id) return;
          if (updated.sender_id !== userId && updated.receiver_id !== userId) return;

          setMessages(prev => prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m)));

          // Live-decrement when an inbound message is marked read elsewhere
          if (updated.receiver_id === userId) {
            const becameRead =
              updated.is_read === true &&
              (previous ? previous.is_read === false : true);
            if (becameRead) {
              const senderId = updated.sender_id;
              let decremented = false;
              setContacts(prev =>
                prev.map(c => {
                  if (c.id !== senderId) return c;
                  if (c.unreadCount <= 0) return c;
                  decremented = true;
                  return { ...c, unreadCount: Math.max(0, c.unreadCount - 1) };
                })
              );
              if (decremented) {
                setTotalUnread(prev => Math.max(0, prev - 1));
              }
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [userId, fetchContacts]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    selectedContactId,
    messages,
    totalUnread,
    isLoadingContacts,
    isLoadingMessages,
    selectContact,
    sendMessage,
  };
}

export function TeamChatProvider({ children }: { children: ReactNode }) {
  const value = useTeamChatStateInternal();
  return createElement(TeamChatContext.Provider, { value }, children);
}

export function useTeamChat(): TeamChatValue {
  const ctx = useContext(TeamChatContext);
  if (!ctx) {
    throw new Error('useTeamChat must be used within TeamChatProvider');
  }
  return ctx;
}
