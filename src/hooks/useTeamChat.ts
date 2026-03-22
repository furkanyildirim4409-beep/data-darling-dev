import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TeamContact {
  id: string; // user_id (profiles.id)
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

export function useTeamChat() {
  const { user, activeCoachId, isSubCoach, teamMember } = useAuth();
  const userId = user?.id;

  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const selectedContactIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!userId || !activeCoachId) return;
    setIsLoadingContacts(true);

    let contactProfiles: { id: string; name: string; avatar: string; role: string }[] = [];

    if (!isSubCoach) {
      // Head Coach: see all active team members with user_id
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
      // Sub-Coach: see Head Coach + other team members
      // 1. Head Coach profile
      const { data: headCoach } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', activeCoachId)
        .single();

      if (headCoach) {
        contactProfiles.push({
          id: headCoach.id,
          name: headCoach.full_name || 'Baş Antrenör',
          avatar: headCoach.avatar_url || '',
          role: 'Baş Antrenör',
        });
      }

      // 2. Other team members
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

    if (contactProfiles.length === 0) {
      setContacts([]);
      setIsLoadingContacts(false);
      return;
    }

    // Fetch unread counts + latest messages
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

  // Fetch messages for a contact
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

    // Mark as read
    await supabase
      .from('team_messages')
      .update({ is_read: true })
      .eq('sender_id', contactId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unreadCount: 0 } : c));
    setTotalUnread(prev => {
      const was = contacts.find(c => c.id === contactId)?.unreadCount || 0;
      return Math.max(0, prev - was);
    });
  }, [userId, contacts]);

  const selectContact = useCallback((contactId: string) => {
    setSelectedContactId(contactId);
    fetchMessages(contactId);
  }, [fetchMessages]);

  // Send message with optimistic UI
  const sendMessage = useCallback(async (content: string) => {
    if (!userId || !selectedContactId || !content.trim()) return;

    const optimistic: TeamMessage = {
      id: crypto.randomUUID(),
      sender_id: userId,
      receiver_id: selectedContactId,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setContacts(prev =>
      prev.map(c =>
        c.id === selectedContactId
          ? { ...c, lastMessage: { content: optimistic.content, created_at: optimistic.created_at, sender_id: userId } }
          : c
      )
    );

    const { error } = await supabase.from('team_messages').insert({
      sender_id: userId,
      receiver_id: selectedContactId,
      content: content.trim(),
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
  }, [userId, selectedContactId]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    channelRef.current = supabase
      .channel('team-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const newMsg = payload.new as TeamMessage;
          const senderId = newMsg.sender_id;

          if (senderId === selectedContactIdRef.current) {
            setMessages(prev => [...prev, newMsg]);
            // Auto mark as read
            supabase.from('team_messages').update({ is_read: true }).eq('id', newMsg.id);
          } else {
            setContacts(prev =>
              prev.map(c =>
                c.id === senderId
                  ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: { content: newMsg.content, created_at: newMsg.created_at, sender_id: senderId } }
                  : c
              )
            );
            setTotalUnread(prev => prev + 1);
          }

          // Update latest message for sender
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
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [userId]);

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
