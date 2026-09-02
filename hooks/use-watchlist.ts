'use client';

import { useCallback, useEffect, useState } from 'react';

export type WatchSubscription = {
  id: string;
  target_type: 'complex' | 'listing' | 'saved_search';
  target_id: string;
  target_name: string;
  slug: string | null;
  listing_id: string | null;
  unit_number: string | null;
  notify_price_reduction: number;
  notify_availability: number;
  notify_special_offer: number;
  notify_new_inventory: number;
  active: number;
  created_at: string;
  updated_at: string;
};

export type WatchSettings = { notifyPriceReduction: boolean; notifyAvailability: boolean; notifySpecialOffer: boolean; notifyNewInventory: boolean };

export function useWatchlist() {
  const [subscriptions, setSubscriptions] = useState<WatchSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/buyer/watchlist', { cache: 'no-store' });
      const payload = await response.json() as { subscriptions?: WatchSubscription[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить подписки.');
      setSubscriptions(payload.subscriptions ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить подписки.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const task = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(task); }, [refresh]);

  const save = useCallback(async (targetType: WatchSubscription['target_type'], targetId: string, settings: WatchSettings) => {
    setProcessing(true); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/buyer/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId, ...settings }) });
      const payload = await response.json() as { subscriptions?: WatchSubscription[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось сохранить подписку.');
      setSubscriptions(payload.subscriptions ?? []); setFeedback(payload.message ?? 'Подписка сохранена.'); return payload.message ?? 'Подписка сохранена.';
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'Не удалось сохранить подписку.'; setError(message); throw new Error(message); }
    finally { setProcessing(false); }
  }, []);

  const remove = useCallback(async (targetType: WatchSubscription['target_type'], targetId: string) => {
    setProcessing(true); setError(''); setFeedback('');
    try {
      const response = await fetch(`/api/buyer/watchlist?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`, { method: 'DELETE' });
      const payload = await response.json() as { subscriptions?: WatchSubscription[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось отключить подписку.');
      setSubscriptions(payload.subscriptions ?? []); setFeedback(payload.message ?? 'Подписка отключена.'); return payload.message ?? 'Подписка отключена.';
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'Не удалось отключить подписку.'; setError(message); throw new Error(message); }
    finally { setProcessing(false); }
  }, []);

  const find = useCallback((targetType: WatchSubscription['target_type'], targetId: string) => subscriptions.find((item) => item.target_type === targetType && item.target_id === targetId) ?? null, [subscriptions]);
  return { subscriptions, loading, processing, error, feedback, refresh, save, remove, find };
}
