'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuyerConversation = {
  id: string;
  listing_id: string;
  status: 'open' | 'closed';
  updated_at: string;
  complex_name: string;
  slug: string;
  image: string;
  unit_number: string;
  rooms: number;
  area_sqm: number;
  seller: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
  unread_count: number;
};

export function useMessages() {
  const [conversations, setConversations] = useState<BuyerConversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const response = await fetch('/api/buyer/messages');
    const data = await response.json() as { conversations?: BuyerConversation[]; message?: string };
    if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить сообщения.');
    setConversations(data.conversations ?? []);
    setError(null);
  }, []);
  useEffect(() => { void reload().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить сообщения.')); }, [reload]);
  return { conversations, error, reload };
}
