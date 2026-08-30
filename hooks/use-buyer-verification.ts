'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuyerVerification = { id: string; provider: string; document_type: 'passport' | 'id_card'; document_last4: string; birth_date: string; status: 'submitted' | 'in_review' | 'verified' | 'rejected'; risk_level: string; rejection_reason: string | null; submitted_at: string; reviewed_at: string | null; verified_at: string | null; updated_at: string };

export function useBuyerVerification() {
  const [verification, setVerification] = useState<BuyerVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const response = await fetch('/api/buyer/verification', { cache: 'no-store' });
    const payload = await response.json() as { verification?: BuyerVerification | null; message?: string };
    if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить статус проверки.');
    setVerification(payload.verification ?? null);
    setLoading(false);
    setError(null);
  }, []);
  useEffect(() => { void reload().catch((reason) => { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить статус проверки.'); setLoading(false); }); }, [reload]);
  return { verification, loading, error, reload };
}
