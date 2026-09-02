'use client';

import { useCallback, useEffect, useState } from 'react';

export type SavedSearch = { id: string; name: string; filters: Record<string, string | number | boolean>; notifications_enabled: number };

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { const response = await fetch('/api/buyer/preferences'); const data = await response.json() as { searches?: SavedSearch[]; message?: string }; if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить поиски.'); setSearches(data.searches ?? []); }, []);
  useEffect(() => {
    const task = window.setTimeout(() => {
      void reload().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить поиски.'));
    }, 0);
    return () => window.clearTimeout(task);
  }, [reload]);
  const setNotifications = useCallback(async (searchId: string, notificationsEnabled: boolean) => { const response = await fetch('/api/buyer/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchId, notificationsEnabled }) }); const data = await response.json() as { message?: string }; if (!response.ok) throw new Error(data.message ?? 'Не удалось обновить уведомления поиска.'); await reload(); return data.message ?? 'Сохранено.'; }, [reload]);
  return { searches, error, reload, setNotifications };
}
