'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuyerViewing = { id: string; requested_date: string; time_slot: string; status: 'requested' | 'confirmed' | 'rescheduled'; complex_name: string; slug: string; unit_number: string | null };

export function useViewings() {
  const [viewings, setViewings] = useState<BuyerViewing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { const response = await fetch('/api/buyer/viewings'); const data = await response.json() as { viewings?: BuyerViewing[]; message?: string }; if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить просмотры.'); setViewings(data.viewings ?? []); }, []);
  useEffect(() => { void reload().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить просмотры.')); }, [reload]);
  return { viewings, error, reload };
}
