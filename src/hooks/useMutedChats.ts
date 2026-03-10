import { useState, useCallback } from 'react';

const STORAGE_KEY = 'coach_muted_chats';

function readMuted(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useMutedChats() {
  const [mutedIds, setMutedIds] = useState<string[]>(readMuted);

  const isMuted = useCallback((id: string) => mutedIds.includes(id), [mutedIds]);

  const toggleMute = useCallback((id: string) => {
    setMutedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { mutedIds, isMuted, toggleMute };
}
