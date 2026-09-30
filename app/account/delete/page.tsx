'use client';

import { useEffect, useState } from 'react';
import { InternalLink as Link } from '@/components/internal-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AccountDeletePage() {
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    void fetch('/api/account/deletion')
      .then(async (r) => {
        if (r.status === 401) { setAuthenticated(false); return null; }
        setAuthenticated(r.ok);
        return r.json();
      })
      .then((value) => {
        const data = value as { request?: { status: string } } | null;
        if (data?.request) setStatus(`Статус заявки: ${data.request.status}`);
      })
      .catch(() => setStatus('Не удалось загрузить состояние заявки.'));
  }, []);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch('/api/account/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      const data = (await response.json()) as { message?: string };
      setStatus(data.message || 'Не удалось отправить запрос.');
    } catch {
      setStatus('Не удалось связаться с сервером.');
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="legal-page">
      <Link href="/profile?section=security">← Профиль и безопасность</Link>
      <h1>Удаление аккаунта</h1>
      <p>
        Отправьте запрос на удаление аккаунта и персональных данных. Специалист
        проверит связанные объявления и сделки и сообщит о ходе удаления. До
        завершения проверки аккаунт остаётся доступным.
      </p>
      {authenticated === false && <p><Link href="/login?returnTo=%2Faccount%2Fdelete">Войдите, чтобы отправить запрос</Link></p>}
      {authenticated && <form className="account-delete-form" onSubmit={submit}>
        <label htmlFor="delete-confirm">
          Введите УДАЛИТЬ для подтверждения запроса
        </label>
        <Input
          id="delete-confirm"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          required
        />
        <Button type="submit" disabled={pending || confirmation !== 'УДАЛИТЬ'}>
          {pending ? 'Отправляем…' : 'Запросить удаление'}
        </Button>
      </form>}
      {status && <output>{status}</output>}
    </main>
  );
}
