'use client';

import { useEffect, useState } from 'react';

export type MarketplaceSession = {
  user: { id: string; email: string; fullName: string };
  platformRoles: string[];
  organization: { id: string; name: string; role: string } | null;
  permissions: string[];
  phoneVerification: {
    status: string;
    phone: string | null;
    verifiedAt: string | null;
  };
};

export function useSession() {
  const [session, setSession] = useState<MarketplaceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthenticated, setUnauthenticated] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/session', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as MarketplaceSession & {
          message?: string;
        };
        if (response.status === 401) setUnauthenticated(true);
        if (!response.ok)
          throw new Error(
            payload.message ?? 'Не удалось определить права доступа.',
          );
        setSession(payload);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === 'AbortError')
          return;
        setError(
          caught instanceof Error
            ? caught.message
            : 'Не удалось определить права доступа.',
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { session, loading, error, unauthenticated };
}
