'use client';

import { useCallback, useEffect, useState } from 'react';

export type DeveloperReview = { id: string; complex_id: string; complex_name: string; author: string; body: string; trust_level: string; updated_at: string; overall: number; response_body: string | null; response_updated_at: string | null };

export function useDeveloperReviews() {
  const [reviews, setReviews] = useState<DeveloperReview[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [processing, setProcessing] = useState(''); const [feedback, setFeedback] = useState('');
  const refresh = useCallback(async () => { setError(''); try { const response = await fetch('/api/developer/reviews', { cache: 'no-store' }); const payload = await response.json() as { reviews?: DeveloperReview[]; message?: string }; if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить отзывы.'); setReviews(payload.reviews ?? []); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить отзывы.'); } finally { setLoading(false); } }, []);
  useEffect(() => { const task = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(task); }, [refresh]);
  const respond = useCallback(async (reviewId: string, text: string) => { setProcessing(reviewId); setError(''); setFeedback(''); try { const response = await fetch('/api/developer/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId, text }) }); const payload = await response.json() as { reviews?: DeveloperReview[]; message?: string }; if (!response.ok) throw new Error(payload.message ?? 'Не удалось опубликовать ответ.'); setReviews(payload.reviews ?? []); setFeedback(payload.message ?? 'Ответ опубликован.'); return payload.message ?? 'Ответ опубликован.'; } catch (reason) { const message = reason instanceof Error ? reason.message : 'Не удалось опубликовать ответ.'; setError(message); throw new Error(message); } finally { setProcessing(''); } }, []);
  return { reviews, loading, error, processing, feedback, refresh, respond };
}
