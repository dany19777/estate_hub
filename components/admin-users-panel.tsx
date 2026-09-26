'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Check, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';

type User = { id: string; email: string; full_name: string; status: string; created_at: string; roles: string[]; organization_role: string | null; organization_name: string | null; phone_status: string | null };
const availableRoles = ['SUPERADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'VERIFICATION_SPECIALIST', 'FINANCE_OPERATOR', 'SUPPORT', 'CONTENT_MANAGER'] as const;

export function AdminUsersPanel({ query = '' }: { query?: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const payload = await response.json() as { users?: User[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить пользователей.');
      setUsers(payload.users ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось загрузить пользователей.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const visible = useMemo(() => { const value = query.trim().toLowerCase(); return users.filter((user) => !value || `${user.full_name} ${user.email} ${user.organization_name ?? ''}`.toLowerCase().includes(value)); }, [query, users]);

  async function update(userId: string, action: string, role?: string) {
    setProcessing(`${userId}:${role ?? action}`); setFeedback(''); setError('');
    try {
      const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action, role }) });
      const payload = await response.json() as { users?: User[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось обновить права.');
      setUsers(payload.users ?? []); setFeedback(payload.message ?? 'Права обновлены.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось обновить права.'); }
    finally { setProcessing(''); }
  }

  return <section className="admin-panel admin-users-panel" id="users">
    <div className="admin-panel-heading"><div><h2>Пользователи и роли</h2><p>Доступ к платформе по принципу наименьших привилегий</p></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw /> Обновить</Button></div>
    {error && <div className="admin-operation-state error"><Ban/><span>{error}</span></div>}{feedback && <div className="admin-operation-state success"><Check/><span>{feedback}</span></div>}
    <div className="admin-user-directory">{loading ? <div className="table-empty-state">Загружаем пользователей…</div> : visible.map((user) => <article key={user.id}><span className="admin-directory-avatar"><UserRound/></span><div className="admin-directory-identity"><strong>{user.full_name}</strong><small>{user.email}</small><em>{user.organization_name ? `${user.organization_name} · ${user.organization_role}` : 'Без организации'} · телефон {user.phone_status === 'verified' ? 'подтверждён' : 'не подтверждён'}</em></div><div className="admin-directory-roles">{availableRoles.map((role) => { const active = user.roles.includes(role); return <button type="button" className={active ? 'active' : ''} disabled={Boolean(processing)} onClick={() => void update(user.id, active ? 'remove_role' : 'add_role', role)} key={role}><ShieldCheck/>{role}</button>; })}</div><button className={`admin-user-status ${user.status}`} type="button" disabled={Boolean(processing)} onClick={() => void update(user.id, user.status === 'active' ? 'block' : 'unblock')}>{user.status === 'active' ? 'Заблокировать' : 'Разблокировать'}</button></article>)}</div>
  </section>;
}
