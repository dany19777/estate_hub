'use client';

import { useEffect, useState } from 'react';

export function useLegalDocumentsPublished() {
  const [published, setPublished] = useState(false);
  useEffect(() => {
    void fetch('/api/legal/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setPublished((data as { published: boolean }).published))
      .catch(() => setPublished(false));
  }, []);
  return published;
}
