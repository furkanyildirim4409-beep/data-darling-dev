import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Lightweight hook that returns a Set of athlete IDs where the last message
 * in the conversation was sent by the athlete (i.e. coach hasn't replied yet).
 */
export function useUnansweredChats(athleteIds: string[]) {
  const { user, activeCoachId } = useAuth();
  const coachId = user?.id; // message identity = real user
  const [unansweredIds, setUnansweredIds] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    if (!coachId || athleteIds.length === 0) return;

    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, created_at')
      .or(
        `and(sender_id.eq.${coachId},receiver_id.in.(${athleteIds.join(',')})),and(receiver_id.eq.${coachId},sender_id.in.(${athleteIds.join(',')}))`
      )
      .order('created_at', { ascending: false });

    if (!data) return;

    // Find latest message per athlete
    const latestMap = new Map<string, { sender_id: string }>();
    for (const msg of data) {
      const athleteId = msg.sender_id === coachId ? msg.receiver_id : msg.sender_id;
      if (!latestMap.has(athleteId)) {
        latestMap.set(athleteId, { sender_id: msg.sender_id });
      }
    }

    const unanswered = new Set<string>();
    for (const [athleteId, latest] of latestMap) {
      // If last message was from the athlete → coach hasn't replied
      if (latest.sender_id !== coachId) {
        unanswered.add(athleteId);
      }
    }
    setUnansweredIds(unanswered);
  }, [coachId, athleteIds.join(',')]);

  useEffect(() => { fetch(); }, [fetch]);

  // Subscribe to new messages for live updates
  useEffect(() => {
    if (!coachId) return;
    const channel = supabase
      .channel('unanswered-tracker')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${coachId}`,
      }, (payload) => {
        const senderId = (payload.new as any).sender_id;
        setUnansweredIds(prev => new Set([...prev, senderId]));
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${coachId}`,
      }, (payload) => {
        const receiverId = (payload.new as any).receiver_id;
        setUnansweredIds(prev => {
          const next = new Set(prev);
          next.delete(receiverId);
          return next;
        });
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [coachId]);

  return unansweredIds;
}
