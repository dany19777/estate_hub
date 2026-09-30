'use client';

import { useEffect, useState } from 'react';
import { InternalLink as Link } from '@/components/internal-link';

const key = 'estatehub.cookie-consent.v1';
type Choice = 'essential' | 'accepted';

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(key);
      if (saved === 'essential' || saved === 'accepted') setChoice(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function save(next: Choice) {
    localStorage.setItem(key, next);
    setChoice(next);
    window.dispatchEvent(
      new CustomEvent('estatehub:cookie-consent', { detail: next }),
    );
  }
  if (choice) return null;
  return (
    <aside className="cookie-consent" aria-label="Настройки cookie">
      <div>
        <strong>Настройки cookie</strong>
        <p>
          Сейчас сайт использует только необходимые cookie для входа и работы
          сервиса. Подробнее — в{' '}
          <Link href="/legal/privacy">Политике конфиденциальности</Link>.
        </p>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" onClick={() => save('essential')}>
          Только необходимые
        </button>
        <button type="button" onClick={() => save('accepted')}>
          Принять
        </button>
      </div>
    </aside>
  );
}
