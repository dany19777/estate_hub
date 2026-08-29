'use client';

import { useCallback, useEffect, useState } from 'react';

export type SavedSearch = { id: string; name: string; filters: Record<string, string | number | boolean>; notifications_enabled: number };

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { const response = await fetch('/api/buyer/preferences'); const data = await response.json() as { searches?: SavedSearch[]; message?: string }; if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить поиски.'); setSearches(data.searches ?? []); }, []);
  useEffect(() => { void reload().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить поиски.')); }, [reload]);
  return { searches, error, reload };
}
