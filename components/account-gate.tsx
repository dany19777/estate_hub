'use client';
import { useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { LogoutButton } from '@/components/logout-button';
export function AccountGate({
  permission,
  children,
}: {
  permission?: string;
  children: React.ReactNode;
}) {
  const { session, loading, error, unauthenticated } = useSession();
  useEffect(() => {
    if (!loading && unauthenticated) window.location.replace('/login');
  }, [loading, unauthenticated]);
  if (loading)
    return (
      <main className="auth-state" role="status">
        Проверяем доступ…
      </main>
    );
  if (!session)
    return (
      <main className="auth-state">
        <p role="alert">{error || 'Войдите в аккаунт.'}</p>
        <a href="/login">Перейти ко входу</a>
      </main>
    );
  if (permission && !session.permissions.includes(permission))
    return (
      <main className="auth-state">
        <h1>Нет доступа к этому кабинету</h1>
        <p>Вы вошли как {session.user.email}.</p>
        <a href="/account">Мой кабинет</a>
        <LogoutButton />
      </main>
    );
  return (
    <>
      <div className="account-session-bar">
        <a href="/">EstateHub</a>
        <span>{session.user.email}</span>
        <LogoutButton />
      </div>
      {children}
    </>
  );
}
