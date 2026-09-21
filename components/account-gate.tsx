'use client';
import { useEffect } from 'react';
import { ArrowLeft, Building2, Headphones, ShieldCheck } from 'lucide-react';
import { useSession } from '@/hooks/use-session';
import { LogoutButton } from '@/components/logout-button';
import { InternalLink as Link } from '@/components/internal-link';
export function AccountGate({
  permission,
  children,
}: {
  permission?: string;
  children: React.ReactNode;
}) {
  const { session, loading, error, unauthenticated } = useSession();
  useEffect(() => {
    if (!loading && unauthenticated) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(returnTo)}`,
      );
    }
  }, [loading, unauthenticated]);
  if (loading) return <output className="auth-state">Проверяем доступ…</output>;
  if (!session)
    return (
      <main className="auth-state">
        <p role="alert">{error || 'Войдите в аккаунт.'}</p>
        <Link href="/login">Перейти ко входу</Link>
      </main>
    );
  if (permission && !session.permissions.includes(permission)) {
    if (permission === 'VIEW_DEVELOPER_DASHBOARD')
      return (
        <main className="developer-access-page">
          <header className="developer-access-header shell">
            <Link className="developer-access-brand" href="/">
              <span>
                <Building2 />
              </span>
              Estate<strong>Hub</strong>
            </Link>
            <Link href="/account">
              <ArrowLeft /> Мой кабинет
            </Link>
          </header>
          <section
            className="developer-access-card"
            aria-labelledby="developer-access-title"
          >
            <span className="developer-access-icon">
              <ShieldCheck />
            </span>
            <span className="developer-access-eyebrow">
              Кабинет застройщика
            </span>
            <h1 id="developer-access-title">
              Этот раздел доступен только застройщикам
            </h1>
            <p>
              Сейчас вы вошли как <strong>{session.user.email}</strong>. Если вы
              застройщик, выйдите из этого профиля и войдите с логином и паролем
              застройщика.
            </p>
            <div className="developer-access-actions">
              <LogoutButton
                className="developer-access-primary"
                label="Выйти и войти как застройщик"
              />
              <Link className="developer-access-secondary" href="/account">
                Вернуться в мой кабинет
              </Link>
            </div>
            <div className="developer-access-help">
              <span>
                <Headphones />
              </span>
              <div>
                <strong>Ещё нет аккаунта застройщика?</strong>
                <p>
                  Оставьте заявку на регистрацию через форму поддержки — мы
                  поможем подключить вашу компанию.
                </p>
                <Link href="/#how-it-works">
                  Оставить заявку на регистрацию →
                </Link>
              </div>
            </div>
          </section>
          <Link className="developer-access-home" href="/">
            На главную EstateHub
          </Link>
        </main>
      );
    return (
      <main className="auth-state">
        <h1>Нет доступа к этому кабинету</h1>
        <p>Вы вошли как {session.user.email}.</p>
        <Link href="/account">Мой кабинет</Link>
        <LogoutButton />
      </main>
    );
  }
  return (
    <>
      <div className="account-session-bar">
        <Link href="/">EstateHub</Link>
        <span>{session.user.email}</span>
        <LogoutButton />
      </div>
      {children}
    </>
  );
}
