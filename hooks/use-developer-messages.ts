'use client';

import { useCallback, useEffect, useState } from 'react';

export type DeveloperConversation = {
  id: string;
  listing_id: string;
  status: 'open' | 'closed';
  updated_at: string;
  buyer_name: string;
  buyer_email: string;
  complex_name: string;
  slug: string;
  image: string;
  unit_number: string;
  rooms: number;
  area_sqm: number;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export function useDeveloperMessages() {
  const [conversations, setConversations] = useState<DeveloperConversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const response = await fetch('/api/developer/messages', { cache: 'no-store' });
    const data = await response.json() as { conversations?: DeveloperConversation[]; message?: string };
    if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить сообщения.');
    setConversations(data.conversations ?? []);
    setError(null);
    setLoading(false);
  }, []);
  useEffect(() => { void reload().catch((reason) => { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить сообщения.'); setLoading(false); }); }, [reload]);
  return { conversations, error, loading, reload };
}
