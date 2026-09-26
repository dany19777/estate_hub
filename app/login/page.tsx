'use client';
import { useState } from 'react';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InternalLink as Link } from '@/components/internal-link';
export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const result = (await response.json()) as {
        message?: string;
        redirectTo?: string;
      };
      if (!response.ok) throw new Error(result.message || 'Не удалось войти.');
      if (!result.redirectTo) throw new Error('Сервер не определил кабинет.');
      const returnTo = new URLSearchParams(window.location.search).get(
        'returnTo',
      );
      window.location.assign(
        returnTo?.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : result.redirectTo,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Не удалось связаться с сервером.',
      );
      setPending(false);
    }
  }
  return (
    <main className="login-page">
      <Link className="login-back" href="/">
        <ArrowLeft size={18} /> На главную
      </Link>
      <section className="login-card">
        <Link href="/" className="login-brand">
          <Building2 /> Estate<span>Hub</span>
        </Link>
        <h1>Вход в аккаунт</h1>
        <p>Войдите, чтобы продолжить работу в своём кабинете.</p>
        <form onSubmit={submit}>
          <label htmlFor="login">Логин</label>
          <Input
            id="login"
            name="username"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            maxLength={254}
            autoCapitalize="none"
            spellCheck={false}
          />
          <label htmlFor="password">Пароль</label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={256}
          />
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Входим…' : 'Войти'}
          </Button>
        </form>
      </section>
    </main>
  );
}
