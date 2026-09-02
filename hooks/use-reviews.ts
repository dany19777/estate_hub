'use client';

import { useCallback, useEffect, useState } from 'react';

import { ReviewRatings, ReviewsPayload } from '@/lib/reviews';

const empty: ReviewsPayload = { reviews: [], aggregate: { overall: 0, total: 0, categories: { construction_quality: 0, location: 0, infrastructure: 0, yard: 0, sound_insulation: 0, management_service: 0 } }, myReview: null };

export function useReviews(complexId: string) {
  const [data, setData] = useState<ReviewsPayload>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const refresh = useCallback(async () => {
    if (!complexId) return;
    setError('');
    try {
      const response = await fetch(`/api/reviews?complexId=${encodeURIComponent(complexId)}`, { cache: 'no-store' });
      const payload = await response.json() as ReviewsPayload & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить отзывы.');
      setData(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить отзывы.'); }
    finally { setLoading(false); }
  }, [complexId]);

  useEffect(() => { const task = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(task); }, [refresh]);

  const submit = useCallback(async (text: string, ratings: ReviewRatings) => {
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complexId, text, ratings }) });
    const payload = await response.json() as { message?: string };
    if (!response.ok) throw new Error(payload.message ?? 'Не удалось сохранить отзыв.');
    setFeedback(payload.message ?? 'Отзыв отправлен.'); await refresh(); return payload.message ?? 'Отзыв отправлен.';
  }, [complexId, refresh]);

  const report = useCallback(async (reviewId: string, reason: string) => {
    const response = await fetch('/api/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId, reason }) });
    const payload = await response.json() as { message?: string };
    if (!response.ok) throw new Error(payload.message ?? 'Не удалось отправить жалобу.');
    setFeedback(payload.message ?? 'Жалоба отправлена.'); return payload.message ?? 'Жалоба отправлена.';
  }, []);

  return { ...data, loading, error, feedback, refresh, submit, report };
}
