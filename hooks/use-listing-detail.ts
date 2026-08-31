'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ListingDetail } from '@/lib/marketplace';

export function useListingDetail(id: string) {
  const [data, setData] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void fetch(`/api/listings/${encodeURIComponent(id)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => { const payload = await response.json() as ListingDetail & { message?: string }; if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить объявление.'); return payload; })
      .then(setData)
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить объявление.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  return { data, loading, error, retry };
}
