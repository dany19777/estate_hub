'use client';

import { useCallback, useEffect, useState } from 'react';

export type AdminFinanceOperation = {
  id: string;
  reservation_id: string;
  operation_type: 'reservation_payment' | 'refund' | 'reconciliation';
  provider: string;
  provider_reference: string;
  amount_uzs: number;
  status: 'pending' | 'succeeded' | 'failed' | 'manual_review';
  created_at: string;
  reservation_status: string;
  payment_status: string;
  buyer_name: string;
  complex_name: string;
  unit_number: string;
};

type FinanceData = {
  operations: AdminFinanceOperation[];
  stats: { totalPaid: number; totalRefunded: number; reviewCount: number; operationsCount: number };
};

const emptyData: FinanceData = { operations: [], stats: { totalPaid: 0, totalRefunded: 0, reviewCount: 0, operationsCount: 0 } };

export function useAdminFinance() {
  const [data, setData] = useState<FinanceData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/finance', { cache: 'no-store' });
      const payload = await response.json() as FinanceData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить финансовые операции.');
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить финансовые операции.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const reconcile = useCallback(async (operationId: string) => {
    setProcessing(operationId);
    setError('');
    try {
      const response = await fetch('/api/admin/finance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось выполнить сверку.');
      await refresh();
      return payload.message || 'Операция сверена.';
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось выполнить сверку.';
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing('');
    }
  }, [refresh]);

  return { ...data, loading, error, processing, refresh, reconcile };
}
