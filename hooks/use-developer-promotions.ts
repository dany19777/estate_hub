'use client';

import { useCallback, useEffect, useState } from 'react';

export type PromotionProduct = { id: string; code: string; name: string; description: string; target_type: 'complex' | 'listing'; surface: string; duration_days: number; price_uzs: number; boost_weight: number; is_active: number };
export type PromotionComplex = { id: string; name: string; slug: string; hero_image_url: string };
export type PromotionListing = { id: string; unit_number: string; complex_id: string; complex_name: string };
export type DeveloperPromotion = { id: string; product_id: string; complex_id: string | null; listing_id: string | null; status: string; starts_at: string; ends_at: string; amount_uzs: number; provider_reference: string; sponsored_label: string; code: string; product_name: string; surface: string; target_type: string; complex_name: string; unit_number: string | null };

type PromotionData = { products: PromotionProduct[]; complexes: PromotionComplex[]; listings: PromotionListing[]; promotions: DeveloperPromotion[] };
const emptyData: PromotionData = { products: [], complexes: [], listings: [], promotions: [] };

export function useDeveloperPromotions() {
  const [data, setData] = useState<PromotionData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState('');
  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/developer/promotions', { cache: 'no-store' });
      const payload = await response.json() as PromotionData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить продвижение.');
      setData(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить продвижение.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const task = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(task); }, [refresh]);

  const purchase = useCallback(async (productId: string, targetId: string) => {
    setProcessing(productId); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/developer/promotions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ productId, targetId }) });
      const payload = await response.json() as PromotionData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось запустить продвижение.');
      setData(payload); setFeedback(payload.message || 'Продвижение запущено.');
      return payload.message || 'Продвижение запущено.';
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'Не удалось запустить продвижение.'; setError(message); throw new Error(message); }
    finally { setProcessing(''); }
  }, []);
  return { ...data, loading, error, feedback, processing, refresh, purchase };
}
