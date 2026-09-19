'use client';

import { useCallback, useEffect, useState } from 'react';

export type RecentlyViewedItem = {
  id: string;
  target_type: 'complex' | 'listing';
  target_id: string;
  viewed_at: string;
  complex_id: string;
  slug: string;
  complex_name: string;
  image: string;
  completion_label: string;
  listing_id: string | null;
  price_uzs: number | null;
  unit_number: string | null;
  rooms: number | null;
  area_sqm: number | null;
};

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/buyer/recently-viewed');
    const data = await response.json() as { items?: RecentlyViewedItem[]; message?: string };
    if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить историю просмотров.');
    setItems(data.items ?? []);
    setError('');
    setLoading(false);
  }, []);
  useEffect(() => {
    const task = window.setTimeout(() => void reload().catch((reason) => { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить историю просмотров.'); setLoading(false); }), 0);
    return () => window.clearTimeout(task);
  }, [reload]);
  return { items, loading, error, reload };
}

export function useTrackRecentlyViewed(targetType: 'complex' | 'listing', targetId?: string) {
  useEffect(() => {
    if (!targetId) return;
    const controller = new AbortController();
    const task = window.setTimeout(() => {
      void fetch('/api/buyer/recently-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId }),
        signal: controller.signal,
      }).catch(() => undefined);
    }, 500);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [targetId, targetType]);
}
