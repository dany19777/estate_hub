'use client';

import { useCallback, useEffect, useState } from 'react';

export type AdminPromotionProduct = { id: string; code: string; name: string; description: string; target_type: 'complex' | 'listing'; surface: string; duration_days: number; price_uzs: number; boost_weight: number; is_active: number; sort_order: number };
export type AdminPlacement = { id: string; status: string; starts_at: string; ends_at: string; amount_uzs: number; provider: string; provider_reference: string; sponsored_label: string; organization_name: string; product_id: string; code: string; product_name: string; surface: string; complex_name: string; unit_number: string | null };
type PromotionData = { products: AdminPromotionProduct[]; placements: AdminPlacement[]; stats: { revenue: number; active: number; scheduled: number; expiring: number } };
const emptyData: PromotionData = { products: [], placements: [], stats: { revenue: 0, active: 0, scheduled: 0, expiring: 0 } };

export function useAdminPromotions() {
  const [data, setData] = useState<PromotionData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');
  const refresh = useCallback(async () => {
    setError('');
    try { const response = await fetch('/api/admin/promotions', { cache: 'no-store' }); const payload = await response.json() as PromotionData & { message?: string }; if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить продвижение.'); setData(payload); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить продвижение.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const task = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(task); }, [refresh]);
  const patch = useCallback(async (body: Record<string, unknown>, key: string) => {
    setProcessing(key); setError('');
    try { const response = await fetch('/api/admin/promotions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json() as PromotionData & { message?: string }; if (!response.ok) throw new Error(payload.message || 'Не удалось выполнить действие.'); setData(payload); return payload.message || 'Изменения сохранены.'; }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'Не удалось выполнить действие.'; setError(message); throw new Error(message); }
    finally { setProcessing(''); }
  }, []);
  return { ...data, loading, error, processing, refresh, updateProduct: (product: AdminPromotionProduct) => patch({ action: 'update_product', productId: product.id, name: product.name, durationDays: product.duration_days, priceUzs: product.price_uzs, boostWeight: product.boost_weight, isActive: Boolean(product.is_active) }, product.id), cancel: (promotionId: string) => patch({ action: 'cancel', promotionId }, promotionId) };
}
