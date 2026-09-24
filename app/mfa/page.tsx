'use client';

import { useEffect, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type State = { status?: 'setup_required' | 'code_required' | 'verified'; email?: string; message?: string; demo?: boolean; demoCode?: string | null };

export default function MfaPage() {
  const [state, setState] = useState<State | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    let demoMode = false;
    async function load() {
      try {
        const response = await fetch('/api/auth/mfa', { cache: 'no-store' });
        if (response.status === 401) { window.location.replace('/login'); return; }
        const payload = await response.json() as State;
        if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить проверку входа.');
        if (payload.status === 'verified') { window.location.replace('/admin'); return; }
        demoMode = payload.demo === true;
        setState(payload);
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось загрузить проверку входа.'); }
    }
    void load();
    const timer = window.setInterval(() => { if (demoMode) void load(); }, 5000);
    return () => window.clearInterval(timer);
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

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
    } catch {
      setError('Не удалось скопировать коды. Выделите их и скопируйте вручную.');
    }
  }

  async function verify(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/mfa', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const payload = await response.json() as { message?: string; redirectTo?: string; recoveryCodes?: string[] };
      if (!response.ok) throw new Error(payload.message ?? 'Неверный код.');
      if (payload.recoveryCodes?.length) {
        setRecoveryCodes(payload.recoveryCodes);
        setCode('');
        setCopied(false);
        setBusy(false);
      } else window.location.replace(payload.redirectTo ?? '/admin');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось проверить код.');
      setBusy(false);
    }
  }

  return <main className="login-page"><section className="login-card">
    <Link href="/" className="login-brand"><Building2 /> Estate<span>Hub</span></Link>
    <ShieldCheck aria-hidden="true" />
    <h1>Подтверждение входа</h1>
    <p>{state?.demo ? 'Локальный тестовый вход: код показан прямо на этой странице.' : 'Доступ к кабинету платформы защищён одноразовым кодом из приложения-аутентификатора.'}</p>
    {state?.email && <p>{state.email}</p>}
    {!state && !error && <p>Проверяем настройки MFA…</p>}
    {state?.status === 'setup_required' && !secret && <Button type="button" disabled={busy} onClick={() => void setup()}>{busy ? 'Создаём ключ…' : 'Настроить приложение-аутентификатор'}</Button>}
    {state?.demo && <div className="mfa-setup-key mfa-demo-key">
      <p><strong>Тестовый код для входа:</strong></p>
      <strong className="mfa-demo-code">{state.demoCode ?? 'Подождите несколько секунд…'}</strong>
      <p>Введите эти 6 цифр в поле ниже. Код обновляется автоматически каждые 30 секунд. Приложение на телефоне сейчас не требуется.</p>
    </div>}
    {secret && !recoveryCodes.length && <div className="mfa-setup-key">
      <p><strong>Шаг 1.</strong> Откройте приложение-аутентификатор на телефоне и выберите «Добавить аккаунт» → «Ввести ключ вручную».</p>
      <p>Название аккаунта: EstateHub ({state?.email}). Тип ключа: по времени (TOTP).</p>
      <p><strong>Ключ настройки — его не нужно вводить в поле ниже:</strong></p>
      <code>{secret}</code>
      <Button type="button" variant="outline" onClick={() => void copySecret()}>{copied ? 'Ключ скопирован' : 'Скопировать ключ'}</Button>
      <p><strong>Шаг 2.</strong> Сохраните аккаунт в приложении. Оно покажет шестизначный код, который меняется каждые 30 секунд. Введите именно этот код в поле ниже.</p>
    </div>}
    {(state?.status === 'code_required' || secret) && !recoveryCodes.length && <form onSubmit={verify}>
      <label htmlFor="mfa-code">{recoveryMode ? 'Одноразовый резервный код' : state?.demo ? 'Шестизначный тестовый код' : 'Шестизначный код из приложения-аутентификатора'}</label>
      <Input id="mfa-code" value={code} onChange={(event) => setCode(recoveryMode ? event.target.value.toUpperCase().replace(/[^A-F0-9-]/g, '').slice(0, 19) : event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode={recoveryMode ? 'text' : 'numeric'} autoComplete={recoveryMode ? 'off' : 'one-time-code'} pattern={recoveryMode ? '[A-Fa-f0-9-]{16,19}' : '[0-9]{6}'} placeholder={recoveryMode ? 'XXXX-XXXX-XXXX-XXXX' : '000000'} maxLength={recoveryMode ? 19 : 6} required />
      <Button type="submit" disabled={busy || (recoveryMode ? code.replaceAll('-', '').length !== 16 : code.length !== 6)}>{busy ? 'Проверяем…' : 'Подтвердить вход'}</Button>
    </form>}
    {state?.status === 'code_required' && !state.demo && !recoveryCodes.length && <Button type="button" variant="outline" onClick={() => { setRecoveryMode(!recoveryMode); setCode(''); setError(''); }}>{recoveryMode ? 'Ввести код из приложения' : 'Использовать резервный код'}</Button>}
    {recoveryCodes.length > 0 && <output className="mfa-setup-key">
      <p><strong>Сохраните резервные коды.</strong> Каждый из них действует только один раз, если вы потеряете доступ к приложению-аутентификатору. После ухода с этой страницы коды больше не появятся.</p>
      <ul className="mfa-recovery-list">{recoveryCodes.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
      <Button type="button" variant="outline" onClick={() => void copyRecoveryCodes()}>{copied ? 'Коды скопированы' : 'Скопировать все коды'}</Button>
      <Button type="button" onClick={() => window.location.replace('/admin')}>Я сохранил коды — открыть кабинет</Button>
    </output>}
    {error && <p className="login-error" role="alert">{error}</p>}
    <Link href="/login">Вернуться ко входу</Link>
  </section></main>;
}
