'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
export default function AccountPage() {
  const { session, loading, error, unauthenticated, mfaRequired } = useSession();
  useEffect(() => {
    if (loading) return;
    if (unauthenticated) window.location.replace('/login');
    else if (mfaRequired) window.location.replace('/mfa');
    else if (session)
      window.location.replace(
        session.permissions.includes('VIEW_ADMIN')
          ? '/admin'
          : session.permissions.includes('VIEW_DEVELOPER_DASHBOARD')
            ? '/developer'
            : '/profile',
      );
  }, [session, loading, unauthenticated, mfaRequired]);
  return (
    <main className="auth-state">
      {error && !unauthenticated ? (
        <>
          <p role="alert">{error}</p>
          <Link href="/login">Войти</Link>
        </>
      ) : (
        'Открываем кабинет…'
      )}
    </main>
  );
}
