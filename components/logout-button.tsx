'use client';
import { useState } from 'react';
export function LogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function leave() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      window.location.assign('/login');
    } catch {
      setError('Не удалось выйти. Повторите попытку.');
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={className}
        type="button"
        onClick={leave}
        disabled={busy}
      >
        {busy ? 'Выходим…' : 'Выйти'}
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
