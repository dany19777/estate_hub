'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';

type SupportRequest = {
  id: string;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  locale: string;
  delivery_status: 'queued' | 'sent' | 'failed';
  delivery_error: string | null;
  created_at: string;
  handling_status: 'new' | 'in_progress' | 'answered' | 'closed';
  internal_note: string | null;
  handled_by_name: string | null;
};

const statusLabels = { new: 'Новое', in_progress: 'В работе', answered: 'Ответили', closed: 'Закрыто' };
const deliveryLabels = { queued: 'Письмо ожидает настройки', sent: 'Передано почтовому сервису', failed: 'Ошибка отправки письма' };

export function AdminSupportPanel() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/support', { cache: 'no-store' });
      const payload = await response.json() as { requests?: SupportRequest[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить обращения.');
      setRequests(payload.requests ?? []);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось загрузить обращения.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(item: SupportRequest, status: 'in_progress' | 'answered' | 'closed') {
    const note = status === 'in_progress' ? '' : window.prompt('Кратко укажите итог обработки. Это внутренняя заметка, клиенту она не отправляется.', item.internal_note ?? '')?.trim();
    if (note === undefined || (status !== 'in_progress' && note.length < 5)) return;
    setProcessing(item.id);
    setError('');
    try {
      const response = await fetch('/api/admin/support', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: item.id, status, note }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось обновить обращение.');
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось обновить обращение.');
    } finally {
      setProcessing('');
    }
  }

  return <section className="admin-panel admin-support-panel" id="support">
    <div className="admin-panel-heading"><div><h2>Вопросы в поддержку</h2><p>Обращения с сайта и состояние доставки письма</p></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw /> Обновить</button></div>
    {error && <p className="admin-support-error">{error}</p>}
    {loading && <div className="table-empty-state">Загружаем обращения…</div>}
    {!loading && requests.length === 0 && <div className="table-empty-state">Обращений пока нет.</div>}
    <div className="admin-support-list">{requests.map((item) => <article key={item.id}>
      <header><div><strong>{item.subject}</strong><small>{item.full_name} · {item.email} · {item.locale.toUpperCase()}</small></div><span>{statusLabels[item.handling_status]}</span></header>
      <p>{item.message}</p>
      <div className="admin-support-meta"><span><Mail /> {deliveryLabels[item.delivery_status]}</span><time>{item.created_at} UTC</time></div>
      {item.delivery_error && <small className="admin-support-error">Ошибка почты: {item.delivery_error}</small>}
      {item.internal_note && <small>Внутренняя заметка: {item.internal_note}</small>}
      <footer>
        {item.handling_status === 'new' && <button type="button" disabled={processing === item.id} onClick={() => void changeStatus(item, 'in_progress')}>Взять в работу</button>}
        {item.handling_status === 'in_progress' && <button type="button" disabled={processing === item.id} onClick={() => void changeStatus(item, 'answered')}>Отметить ответ</button>}
        {item.handling_status !== 'closed' && <button type="button" disabled={processing === item.id} onClick={() => void changeStatus(item, 'closed')}>Закрыть</button>}
      </footer>
    </article>)}</div>
  </section>;
}
