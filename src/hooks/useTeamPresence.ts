import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

export interface TeamMemberPresence {
  id: string;
  name: string;
  isOnline: boolean;
  lastSeen: Date;
  status: "online" | "away" | "busy" | "offline";
}

// Simulated presence data - in a real app this would come from a backend
const getRandomStatus = (): "online" | "away" | "busy" | "offline" => {
  const statuses: ("online" | "away" | "busy" | "offline")[] = ["online", "away", "busy", "offline"];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

export function useTeamPresence(memberIds: string[]) {
  const [presence, setPresence] = useState<Record<string, TeamMemberPresence>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Initialize presence for all members
  useEffect(() => {
    const initialPresence: Record<string, TeamMemberPresence> = {};
    memberIds.forEach((id) => {
      initialPresence[id] = {
        id,
        name: "",
        isOnline: Math.random() > 0.3, // 70% chance online
        lastSeen: new Date(),
        status: getRandomStatus(),
      };
    });
    setPresence(initialPresence);
  }, [memberIds.join(",")]);

  // Simulate presence changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPresence((prev) => {
        const updated = { ...prev };
        const ids = Object.keys(updated);
        if (ids.length === 0) return prev;

        // Randomly change one member's status
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        const wasOnline = updated[randomId]?.isOnline;
        const newStatus = getRandomStatus();
        const isNowOnline = newStatus !== "offline";

        updated[randomId] = {
          ...updated[randomId],
          isOnline: isNowOnline,
          status: newStatus,
          lastSeen: new Date(),
        };

        // Show toast for status change
        if (wasOnline !== isNowOnline) {
          const memberName = updated[randomId]?.name || "Takım üyesi";
          if (isNowOnline) {
            toast({
              title: "🟢 Çevrimiçi",
              description: `${memberName} şimdi çevrimiçi`,
            });
          }
        }

        return updated;
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Update member name in presence
  const updateMemberName = useCallback((id: string, name: string) => {
    setPresence((prev) => ({
      ...prev,
      [id]: prev[id] ? { ...prev[id], name } : { id, name, isOnline: true, lastSeen: new Date(), status: "online" },
    }));
  }, []);

  // Simulate receiving a message
  const simulateIncomingMessage = useCallback((memberId: string, memberName: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || 0) + 1,
    }));

    toast({
      title: "💬 Yeni Mesaj",
      description: `${memberName} size bir mesaj gönderdi`,
    });
  }, []);

  // Clear unread count for a member
  const clearUnread = useCallback((memberId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [memberId]: 0,
    }));
  }, []);

  // Get presence for a specific member
  const getMemberPresence = useCallback(
    (id: string): TeamMemberPresence | undefined => {
      return presence[id];
    },
    [presence]
  );

  return {
    presence,
    unreadCounts,
    updateMemberName,
    simulateIncomingMessage,
    clearUnread,
    getMemberPresence,
  };
}
