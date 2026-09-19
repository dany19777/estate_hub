'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuyerInquiry = {
  id: string;
  lead_type: 'consultation' | 'viewing' | 'reservation' | 'chat' | 'manual';
  status: 'new' | 'contact_required' | 'contacted' | 'consultation' | 'selection' | 'viewing_scheduled' | 'viewing_completed' | 'reservation' | 'deal_in_progress' | 'won' | 'lost';
  source: string;
  message: string;
  created_at: string;
  updated_at: string;
  complex_id: string;
  slug: string;
  complex_name: string;
  image: string;
  listing_id: string | null;
  unit_number: string | null;
};

export function useBuyerInquiries() {
  const [inquiries, setInquiries] = useState<BuyerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/buyer/inquiries');
    const data = await response.json() as { inquiries?: BuyerInquiry[]; message?: string };
    if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить обращения.');
    setInquiries(data.inquiries ?? []);
    setError('');
    setLoading(false);
  }, []);
  useEffect(() => {
    const task = window.setTimeout(() => void reload().catch((reason) => { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить обращения.'); setLoading(false); }), 0);
    return () => window.clearTimeout(task);
  }, [reload]);
  return { inquiries, loading, error, reload };
}
