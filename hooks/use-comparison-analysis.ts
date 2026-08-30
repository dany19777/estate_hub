'use client';

import { useState } from 'react';
import type { ComparisonAnalysis } from '@/lib/comparison-analysis';

export function useComparisonAnalysis() {
  const [analysis, setAnalysis] = useState<ComparisonAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setLoading(true); setError(null);
    try { const response = await fetch('/api/buyer/comparison-analysis'); const data = await response.json() as { analysis?: ComparisonAnalysis; message?: string }; if (!response.ok || !data.analysis) throw new Error(data.message ?? 'Не удалось выполнить сравнение.'); setAnalysis(data.analysis); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось выполнить сравнение.'); }
    finally { setLoading(false); }
  };
  return { analysis, loading, error, run };
}
