'use client';

import { useCallback, useEffect, useState } from 'react';

export type AdminDispute = {
  id: string;
  reservation_id: string;
  category: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved_refund' | 'resolved_no_refund' | 'cancelled';
  priority: 'normal' | 'high';
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  reservation_fee_uzs: number;
  reservation_status: string;
  payment_status: string;
  buyer_name: string;
  buyer_email: string;
  complex_name: string;
  unit_number: string;
  developer_name: string;
};

type DisputeData = {
  disputes: AdminDispute[];
  stats: { active: number; highPriority: number; refunded: number; rejected: number };
};

const emptyData: DisputeData = { disputes: [], stats: { active: 0, highPriority: 0, refunded: 0, rejected: 0 } };

export function useAdminDisputes() {
  const [data, setData] = useState<DisputeData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/disputes', { cache: 'no-store' });
      const payload = await response.json() as DisputeData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить споры.');
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить споры.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const decide = useCallback(async (disputeId: string, action: 'start_review' | 'approve_refund' | 'reject', note = '') => {
    setProcessing(disputeId);
    setError('');
    try {
      const response = await fetch('/api/admin/disputes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disputeId, action, note }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось сохранить решение.');
      await refresh();
      return payload.message || 'Решение сохранено.';
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось сохранить решение.';
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing('');
    }
  }, [refresh]);

  return { ...data, loading, error, processing, refresh, decide };
}
