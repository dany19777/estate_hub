'use client';

import { useCallback, useEffect, useState } from 'react';

export type FavoriteComplex = { id: string; slug: string; name: string; image: string; price_from: number; available_units: number; completion_label: string };

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/buyer/favorites');
      const payload = await response.json() as { favorites?: FavoriteComplex[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить избранное.');
      setFavorites(payload.favorites ?? []); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить избранное.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  const has = useCallback((complexId: string) => favorites.some((favorite) => favorite.id === complexId), [favorites]);
  const toggle = useCallback(async (complex: Pick<FavoriteComplex, 'id' | 'slug' | 'name' | 'image' | 'price_from' | 'available_units' | 'completion_label'>) => {
    const saved = has(complex.id);
    setFavorites((current) => saved ? current.filter((item) => item.id !== complex.id) : [complex, ...current]);
    try {
      const response = await fetch(saved ? `/api/buyer/favorites?complexId=${encodeURIComponent(complex.id)}` : '/api/buyer/favorites', saved ? { method: 'DELETE' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complexId: complex.id }) });
      if (!response.ok) {
        const payload = await response.json() as { message?: string };
        throw new Error(payload.message ?? 'Не удалось обновить избранное.');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось обновить избранное.'); await reload(); }
  }, [has, reload]);

  return { favorites, loading, error, has, toggle, reload };
}
