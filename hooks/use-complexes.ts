'use client';

import { useCallback, useEffect, useState } from 'react';

import type { CatalogResponse } from '@/lib/marketplace';

type QueryValue = string | number | boolean | undefined;

const emptyCatalog: CatalogResponse = {
  items: [],
  total: 0,
  parsedFilters: [],
  unsupportedCriteria: [],
  validationWarnings: [],
  alternatives: [],
  alternativeReason: null,
  facets: { cities: [], districts: [], complexes: [] },
};

export function useComplexes(parameters: Record<string, QueryValue>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== '' && value !== false) query.set(key, String(value));
  }
  const queryString = query.toString();
  const [data, setData] = useState<CatalogResponse>(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${queryString}#${attempt}`;
  const [loadedRequestKey, setLoadedRequestKey] = useState('');

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/complexes${queryString ? `?${queryString}` : ''}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as CatalogResponse & { message?: string };
        if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить каталог');
        return payload;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить каталог');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedRequestKey(requestKey);
        }
      });

    return () => controller.abort();
  }, [queryString, requestKey]);

  return { data, loading: loading || loadedRequestKey !== requestKey, error, retry };
}
