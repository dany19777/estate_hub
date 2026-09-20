'use client';
import { useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
export default function AccountPage() {
  const { session, loading, error, unauthenticated } = useSession();
  useEffect(() => {
    if (loading) return;
    if (unauthenticated) window.location.replace('/login');
    else if (session)
      window.location.replace(
        session.permissions.includes('VIEW_ADMIN')
          ? '/admin'
          : session.permissions.includes('VIEW_DEVELOPER_DASHBOARD')
            ? '/developer'
            : '/profile',
      );
  }, [session, loading, unauthenticated]);
  return (
    <main className="auth-state">
      {error && !unauthenticated ? (
        <>
          <p role="alert">{error}</p>
          <a href="/login">Войти</a>
        </>
      ) : (
        'Открываем кабинет…'
      )}
    </main>
  );
}
