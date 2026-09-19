'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileSearch, RefreshCw, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

type AuditEvent = { id: string; actor_type: string; actor_name: string | null; actor_email: string | null; action: string; entity_type: string; entity_id: string; metadata: Record<string, unknown>; created_at: string };

const actionLabels: Record<string, string> = {
  'access.bootstrap_owner': 'Создан первый SUPERADMIN', 'access.add_role': 'Назначена роль', 'access.remove_role': 'Снята роль',
  'access.user_block': 'Пользователь заблокирован', 'access.user_unblock': 'Пользователь разблокирован',
  'verification.approved': 'Верификация одобрена', 'verification.rejected': 'Верификация отклонена',
  'complex.published': 'ЖК опубликован', 'complex.rejected': 'Публикация ЖК отклонена',
  'reservation.confirmed': 'Бронирование оплачено', 'reservation.extended': 'Бронирование продлено',
  'review.published': 'Отзыв опубликован', 'review.rejected': 'Отзыв отклонён',
};

function date(value: string) { return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${value.replace(' ', 'T')}Z`)); }

export function AdminAuditPanel({ query = '' }: { query?: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/audit?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      const payload = await response.json() as { events?: AuditEvent[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить аудит.');
      setEvents(payload.events ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось загрузить аудит.'); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);

  return <section className="admin-panel admin-audit-panel" id="audit">
    <div className="admin-panel-heading"><div><h2>Журнал аудита</h2><p>Роли, проверки, публикации, бронирования и финансовые решения</p></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw/> Обновить</Button></div>
    {error && <div className="admin-operation-state error"><FileSearch/><span>{error}</span></div>}
    <div className="admin-audit-list">{loading ? <div className="table-empty-state">Загружаем журнал…</div> : events.length ? events.map((event) => <article key={event.id}><span><ShieldCheck/></span><div><strong>{actionLabels[event.action] ?? event.action}</strong><small>{event.actor_name ?? (event.actor_type === 'system' ? 'Система' : event.actor_email ?? 'Неизвестный пользователь')} · {event.entity_type} · {event.entity_id}</small><code>{Object.keys(event.metadata).length ? JSON.stringify(event.metadata) : 'без дополнительных данных'}</code></div><time>{date(event.created_at)}</time></article>) : <div className="table-empty-state">По выбранному фильтру событий нет.</div>}</div>
  </section>;
}
