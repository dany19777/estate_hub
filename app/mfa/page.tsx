'use client';

import { useEffect, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type State = { status?: 'setup_required' | 'code_required' | 'verified'; email?: string; message?: string };

export default function MfaPage() {
  const [state, setState] = useState<State | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void fetch('/api/auth/mfa', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { window.location.replace('/login'); return; }
      const payload = await response.json() as State;
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить проверку входа.');
      if (payload.status === 'verified') { window.location.replace('/admin'); return; }
      setState(payload);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Не удалось загрузить проверку входа.'));
  }, []);

  async function setup() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/mfa', { method: 'POST' });
      const payload = await response.json() as { secret?: string; message?: string };
      if (!response.ok || !payload.secret) throw new Error(payload.message ?? 'Не удалось создать ключ MFA.');
      setSecret(payload.secret);
      setCode('');
      setCopied(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось создать ключ MFA.');
    } finally { setBusy(false); }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setError('Не удалось скопировать ключ. Выделите его и скопируйте вручную.');
    }
  }

  async function verify(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/mfa', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const payload = await response.json() as { message?: string; redirectTo?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Неверный код.');
      window.location.replace(payload.redirectTo ?? '/admin');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось проверить код.');
      setBusy(false);
    }
  }

  return <main className="login-page"><section className="login-card">
    <Link href="/" className="login-brand"><Building2 /> Estate<span>Hub</span></Link>
    <ShieldCheck aria-hidden="true" />
    <h1>Подтверждение входа</h1>
    <p>Доступ к кабинету платформы защищён одноразовым кодом из приложения-аутентификатора.</p>
    {state?.email && <p>{state.email}</p>}
    {!state && !error && <p>Проверяем настройки MFA…</p>}
    {state?.status === 'setup_required' && !secret && <Button type="button" disabled={busy} onClick={() => void setup()}>{busy ? 'Создаём ключ…' : 'Настроить приложение-аутентификатор'}</Button>}
    {secret && <div className="mfa-setup-key">
      <p><strong>Шаг 1.</strong> Откройте приложение-аутентификатор на телефоне и выберите «Добавить аккаунт» → «Ввести ключ вручную».</p>
      <p>Название аккаунта: EstateHub ({state?.email}). Тип ключа: по времени (TOTP).</p>
      <p><strong>Ключ настройки — его не нужно вводить в поле ниже:</strong></p>
      <code>{secret}</code>
      <Button type="button" variant="outline" onClick={() => void copySecret()}>{copied ? 'Ключ скопирован' : 'Скопировать ключ'}</Button>
      <p><strong>Шаг 2.</strong> Сохраните аккаунт в приложении. Оно покажет шестизначный код, который меняется каждые 30 секунд. Введите именно этот код в поле ниже.</p>
    </div>}
    {(state?.status === 'code_required' || secret) && <form onSubmit={verify}>
      <label htmlFor="mfa-code">Шестизначный код из приложения-аутентификатора</label>
      <Input id="mfa-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" placeholder="000000" minLength={6} maxLength={6} required />
      <Button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Проверяем…' : 'Подтвердить вход'}</Button>
    </form>}
    {error && <p className="login-error" role="alert">{error}</p>}
    <Link href="/login">Вернуться ко входу</Link>
  </section></main>;
}
