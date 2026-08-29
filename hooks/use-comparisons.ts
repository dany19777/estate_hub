'use client';

import { useCallback, useEffect, useState } from 'react';

export type ComparisonItem = { id: string; slug: string; complex_name: string; image: string; unit_number: string; rooms: number; area_sqm: number; floor_number: number; total_floors: number; finish: string; price_uzs: number; market_type: string; reserve_enabled: number; completion_label: string };

export function useComparisons() {
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { const response = await fetch('/api/buyer/comparisons'); const data = await response.json() as { items?: ComparisonItem[]; message?: string }; if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить сравнение.'); setItems(data.items ?? []); }, []);
  useEffect(() => { void reload().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить сравнение.')); }, [reload]);
  const has = useCallback((listingId: string) => items.some((item) => item.id === listingId), [items]);
  const toggle = useCallback(async (listingId: string) => { const selected = has(listingId); const response = await fetch(selected ? `/api/buyer/comparisons?listingId=${encodeURIComponent(listingId)}` : '/api/buyer/comparisons', selected ? { method: 'DELETE' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId }) }); const data = await response.json() as { message?: string }; if (!response.ok) { setError(data.message ?? 'Не удалось обновить сравнение.'); return; } await reload(); }, [has, reload]);
  return { items, error, has, toggle, reload };
}
