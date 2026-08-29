'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ComplexDetail } from '@/lib/marketplace';

export function useComplexDetail(slug: string) {
  const [data, setData] = useState<ComplexDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${slug}#${attempt}`;
  const [loadedRequestKey, setLoadedRequestKey] = useState('');
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    fetch(`/api/complexes/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as ComplexDetail & { message?: string };
        if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить жилой комплекс');
        return payload;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить жилой комплекс');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedRequestKey(requestKey);
        }
      });
    return () => controller.abort();
  }, [requestKey, slug]);

  return { data, loading: loading || loadedRequestKey !== requestKey, error, retry };
}
