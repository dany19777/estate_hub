'use client';

import { useCallback, useEffect, useState } from 'react';

export type DeveloperPlan = { id: string; code: string; name: string; inventory_limit: number; monthly_price_uzs: number; is_active: number };
export type DeveloperBillingEvent = { id: string; event_type: string; amount_uzs: number; status: string; provider: string; provider_reference: string; metadata_json: string; period_start: string; period_end: string; created_at: string };
export type DeveloperSubscription = { id: string; organization_id: string; plan_id: string; status: string; contract_paid: number; current_period_start: string; current_period_end: string; auto_renew: number; code: string; name: string; inventory_limit: number; monthly_price_uzs: number };

type BillingData = {
  plans: DeveloperPlan[];
  subscription: DeveloperSubscription | null;
  usage: { activeInventory: number; limit: number };
  events: DeveloperBillingEvent[];
  paymentDetails: { bankName: string; bankAccount: string };
};

const emptyData: BillingData = { plans: [], subscription: null, usage: { activeInventory: 0, limit: 0 }, events: [], paymentDetails: { bankName: '', bankAccount: '' } };

export function useDeveloperBilling() {
  const [data, setData] = useState<BillingData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/developer/billing', { cache: 'no-store' });
      const payload = await response.json() as BillingData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить подписку.');
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить подписку.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const update = useCallback(async (planId: string, contractReference: string, transferReference: string) => {
    setProcessing(planId);
    setError('');
    setFeedback('');
    try {
      const response = await fetch('/api/developer/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ planId, contractReference, transferReference }),
      });
      const payload = await response.json() as BillingData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось обновить подписку.');
      setData(payload);
      setFeedback(payload.message || 'Подписка обновлена.');
      return payload.message || 'Подписка обновлена.';
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось обновить подписку.';
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing('');
    }
  }, []);

  return { ...data, loading, error, feedback, processing, refresh, submitContract: update };
}
