'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuyerDispute = {
  id: string;
  reservation_id: string;
  category: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved_refund' | 'resolved_no_refund' | 'cancelled';
  priority: 'normal' | 'high';
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  reservation_fee_uzs: number;
  reservation_status: string;
  payment_status: string;
  complex_name: string;
  slug: string;
  unit_number: string;
};

export function useBuyerDisputes() {
  const [disputes, setDisputes] = useState<BuyerDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/buyer/disputes', { cache: 'no-store' });
      const payload = await response.json() as { disputes?: BuyerDispute[]; message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить обращения.');
      setDisputes(payload.disputes ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить обращения.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  return { disputes, loading, error, reload };
}
