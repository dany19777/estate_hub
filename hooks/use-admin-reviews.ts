'use client';

import { useCallback, useEffect, useState } from 'react';

export type AdminReview = { id: string; complex_id: string; complex_name: string; author: string; body: string; status: string; trust_level: string; moderation_reason: string | null; created_at: string; updated_at: string; overall: number; report_count: number; latest_report_reason: string | null };

export function useAdminReviews() {
  const [queue, setQueue] = useState<AdminReview[]>([]);
  const [stats, setStats] = useState({ pending: 0, published: 0, hidden: 0, reports: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');
  const refresh = useCallback(async () => { setError(''); try { const response = await fetch('/api/admin/reviews', { cache: 'no-store' }); const payload = await response.json() as { queue?: AdminReview[]; stats?: typeof stats; message?: string }; if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить отзывы.'); setQueue(payload.queue ?? []); if (payload.stats) setStats(payload.stats); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить отзывы.'); } finally { setLoading(false); } }, []);
  useEffect(() => { const task = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(task); }, [refresh]);
  const decide = useCallback(async (reviewId: string, decision: 'publish' | 'reject' | 'hide' | 'restore' | 'dismiss_report', reason = '') => { setProcessing(reviewId); setError(''); try { const response = await fetch('/api/admin/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId, decision, reason }) }); const payload = await response.json() as { message?: string }; if (!response.ok) throw new Error(payload.message ?? 'Не удалось сохранить решение.'); await refresh(); return payload.message ?? 'Решение сохранено.'; } catch (caught) { const message = caught instanceof Error ? caught.message : 'Не удалось сохранить решение.'; setError(message); throw new Error(message); } finally { setProcessing(''); } }, [refresh]);
  return { queue, stats, loading, error, processing, refresh, decide };
}
