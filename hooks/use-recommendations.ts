'use client';

import { useEffect, useState } from 'react';
import type { ComplexSummary } from '@/lib/marketplace';

export type Recommendation = ComplexSummary & { reasons: string[] };

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [basis, setBasis] = useState<{ type: string; label: string } | null>(null);
  const [disclosure, setDisclosure] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch('/api/buyer/recommendations', { signal: controller.signal }).then(async (response) => { const data = await response.json() as { recommendations?: Recommendation[]; basis?: { type: string; label: string }; disclosure?: string; message?: string }; if (!response.ok) throw new Error(data.message ?? 'Не удалось загрузить рекомендации.'); setRecommendations(data.recommendations ?? []); setBasis(data.basis ?? null); setDisclosure(data.disclosure ?? ''); }).catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить рекомендации.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  return { recommendations, basis, disclosure, loading, error };
}
