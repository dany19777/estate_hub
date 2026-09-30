'use client';

import { useEffect, useState } from 'react';
import { InternalLink as Link } from '@/components/internal-link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    acceptedDocuments: false,
    marketingOptIn: false,
  });
  useEffect(() => {
    void fetch('/api/auth/register')
      .then((response) => response.json())
      .then((value) => setEnabled((value as { enabled: boolean }).enabled))
      .catch(() => setEnabled(false))
      .finally(() => setChecking(false));
  }, []);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { message?: string };
      setMessage(result.message || 'Не удалось создать аккаунт.');
      if (response.ok)
        setForm({
          fullName: '',
          email: '',
          password: '',
          acceptedDocuments: false,
          marketingOptIn: false,
        });
    } catch {
      setMessage('Сервис временно недоступен.');
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="login-page">
      <Link className="login-back" href="/login">
        ← Войти
      </Link>
      <section className="login-card">
        <Link href="/" className="login-brand">
          Estate<span>Hub</span>
        </Link>
        <h1>Создать аккаунт</h1>
        {checking ? (
          <p>Проверяем доступность регистрации…</p>
        ) : !enabled ? (
          <p>
            Регистрация откроется после публикации Правил пользования и Политики
            конфиденциальности. Пока доступен вход в выданный тестовый аккаунт.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="register-name">Имя и фамилия</label>
            <Input
              id="register-name"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              minLength={2}
              maxLength={100}
            />
            <label htmlFor="register-email">Email</label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              maxLength={200}
            />
            <label htmlFor="register-password">Пароль</label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={12}
              maxLength={128}
            />
            <small>Не менее 12 символов.</small>
            <label className="register-check">
              <input
                type="checkbox"
                checked={form.acceptedDocuments}
                onChange={(e) =>
                  setForm({ ...form, acceptedDocuments: e.target.checked })
                }
                required
              />
              <span>
                Создавая аккаунт, вы соглашаетесь с{' '}
                <Link href="/legal/terms">Правилами пользования</Link> и{' '}
                <Link href="/legal/privacy">Политикой конфиденциальности</Link>.
              </span>
            </label>
            <label className="register-check">
              <input
                type="checkbox"
                checked={form.marketingOptIn}
                onChange={(e) =>
                  setForm({ ...form, marketingOptIn: e.target.checked })
                }
              />
              <span>
                Хочу получать предложения и акции по email/SMS. Необязательно.
              </span>
            </label>
            {message && <output>{message}</output>}
            <Button type="submit" disabled={pending || !form.acceptedDocuments}>
              {pending ? 'Создаём…' : 'Создать аккаунт'}
            </Button>
          </form>
        )}
        {message && !enabled && <output>{message}</output>}
        <p>
          <Link href="/login">Уже есть аккаунт? Войти</Link>
        </p>
      </section>
    </main>
  );
}
