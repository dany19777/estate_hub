'use client';

import { useCallback, useEffect, useState } from 'react';

export type PhoneVerification = { status: 'not_started' | 'pending' | 'verified' | 'blocked'; phone: string | null; verifiedAt: string | null };

export function usePhoneVerification() {
  const [verification, setVerification] = useState<PhoneVerification>({ status: 'not_started', phone: null, verifiedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const response = await fetch('/api/buyer/phone-verification', { cache: 'no-store' });
    const payload = await response.json() as PhoneVerification & { message?: string };
    if (!response.ok) throw new Error(payload.message ?? 'Не удалось проверить телефон.');
    setVerification(payload); setError('');
  }, []);
  useEffect(() => { void reload().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось проверить телефон.')).finally(() => setLoading(false)); }, [reload]);
  return { verification, loading, error, reload };
}
