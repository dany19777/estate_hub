'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Check, Handshake, RotateCcw, UserRound, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DeveloperReservation } from '@/hooks/use-developer-reservations';
import { formatPriceMillions } from '@/lib/marketplace';

const labels: Record<string, string> = {
  payment_hold: 'Ожидает оплаты', confirmed: 'Активная бронь', cancelled: 'Отменена', expired: 'Истекла', refunded: 'Возврат',
  active: 'Активна', visit_completed: 'Визит завершён', deal_in_progress: 'Сделка', buyer_refused: 'Отказ покупателя', developer_refused: 'Отмена застройщика', sold: 'Продано', cancelled_admin: 'Отменена админом',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(`${value.replace(' ', 'T')}Z`));
}

export function DeveloperReservationsPanel({ reservations, stats, loading, error, reload }: { reservations: DeveloperReservation[]; stats: { active: number; holds: number; deals: number; total: number }; loading: boolean; error: string | null; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<'active' | 'holds' | 'history'>('active');
  const [processing, setProcessing] = useState('');
  const [feedback, setFeedback] = useState('');
  const visible = useMemo(() => reservations.filter((reservation) => filter === 'active'
    ? reservation.status === 'confirmed'
    : filter === 'holds' ? reservation.status === 'payment_hold' : !['confirmed', 'payment_hold'].includes(reservation.status)), [filter, reservations]);

  async function updateReservation(reservation: DeveloperReservation, action: 'visit_completed' | 'deal_in_progress' | 'extend' | 'buyer_refused' | 'developer_refused') {
    let reason = '';
    let newExpiry = '';
    if (action === 'extend') {
      reason = window.prompt('Причина продления брони')?.trim() ?? '';
      if (!reason) return;
      const defaultExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().slice(0, 16);
      const requested = window.prompt('Новый срок в формате ГГГГ-ММ-ДДTЧЧ:ММ', defaultExpiry)?.trim() ?? '';
      if (!requested) return;
      const parsed = new Date(requested);
      if (Number.isNaN(parsed.getTime())) { setFeedback('Не удалось распознать новый срок.'); return; }
      newExpiry = parsed.toISOString();
    }
    if (action === 'buyer_refused' && !window.confirm('Зафиксировать добровольный отказ покупателя? Сумма брони остаётся невозвратной.')) return;
    if (action === 'developer_refused' && !window.confirm('Отменить бронь по вине застройщика и зарегистрировать полный возврат?')) return;
    setProcessing(reservation.id);
    setFeedback('');
    try {
      const response = await fetch('/api/developer/reservations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reservationId: reservation.id, action, reason, newExpiry }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось обновить бронь.');
      setFeedback(payload.message ?? 'Бронирование обновлено.');
      await reload();
    } catch (caught) {
      setFeedback(caught instanceof Error ? caught.message : 'Не удалось обновить бронь.');
    } finally {
      setProcessing('');
    }
  }

  return (
    <section className="dashboard-panel developer-reservations-panel" id="developer-reservations">
      <div className="panel-heading"><div><h2>Бронирования</h2><p>Оплата, 72-часовой срок и результат визита</p></div><div className="reservation-kpis"><span><strong>{stats.active}</strong> активных</span><span><strong>{stats.holds}</strong> ожидают</span><span><strong>{stats.deals}</strong> в сделке</span></div></div>
      <div className="project-tabs"><button className={filter === 'active' ? 'active' : ''} type="button" onClick={() => setFilter('active')}>Активные {stats.active}</button><button className={filter === 'holds' ? 'active' : ''} type="button" onClick={() => setFilter('holds')}>Ожидают оплаты {stats.holds}</button><button className={filter === 'history' ? 'active' : ''} type="button" onClick={() => setFilter('history')}>История {Math.max(0, stats.total - stats.active - stats.holds)}</button></div>
      {feedback && <div className={`reservation-feedback ${feedback.includes('Не удалось') ? 'error' : ''}`}><Check /><span>{feedback}</span></div>}
      {error ? <div className="developer-message-empty"><p>{error}</p><Button variant="outline" onClick={() => void reload()}>Повторить</Button></div> : <Table className="developer-table developer-reservations-table">
        <TableHeader><TableRow><TableHead>Покупатель</TableHead><TableHead>Квартира</TableHead><TableHead>Платёж</TableHead><TableHead>Срок</TableHead><TableHead>Статус</TableHead><TableHead>Действия</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading && <TableRow><TableCell colSpan={6}><div className="table-empty-state">Загружаем бронирования…</div></TableCell></TableRow>}
          {!loading && visible.length === 0 && <TableRow><TableCell colSpan={6}><div className="table-empty-state">В этом разделе бронирований пока нет.</div></TableCell></TableRow>}
          {visible.map((reservation) => <TableRow key={reservation.id}><TableCell><div className="reservation-buyer"><span><UserRound /></span><div><strong>{reservation.buyer_name}</strong><small>{reservation.buyer_phone}</small></div></div></TableCell><TableCell><strong>{reservation.complex_name}</strong><small>№ {reservation.unit_number} · {reservation.rooms} комн. · {reservation.area_sqm} м²</small></TableCell><TableCell><strong>{formatPriceMillions(reservation.reservation_fee_uzs)} сум</strong><small>{reservation.payment_status === 'paid' ? 'Оплачено' : reservation.payment_status === 'refunded' ? 'Возвращено' : 'Ожидается'}</small></TableCell><TableCell><strong>{formatDate(reservation.status === 'payment_hold' ? reservation.hold_expires_at : reservation.reservation_expires_at)}</strong>{reservation.extended_at && <small>Продлено: {formatDate(reservation.extended_at)}</small>}</TableCell><TableCell><Badge className={`reservation-state ${reservation.status} ${reservation.outcome_status}`}>{labels[reservation.outcome_status !== 'active' ? reservation.outcome_status : reservation.status] ?? reservation.status}</Badge></TableCell><TableCell><div className="reservation-actions">{reservation.status === 'confirmed' && reservation.outcome_status === 'active' && <button type="button" onClick={() => void updateReservation(reservation, 'visit_completed')} disabled={processing === reservation.id} title="Визит в офис завершён"><Check /></button>}{reservation.status === 'confirmed' && reservation.outcome_status === 'visit_completed' && <button type="button" onClick={() => void updateReservation(reservation, 'deal_in_progress')} disabled={processing === reservation.id} title="Перевести в сделку"><Handshake /></button>}{reservation.status === 'confirmed' && !['buyer_refused', 'developer_refused', 'sold', 'cancelled_admin'].includes(reservation.outcome_status) && <><button type="button" onClick={() => void updateReservation(reservation, 'extend')} disabled={processing === reservation.id} title="Продлить бронь"><CalendarClock /></button><button className="buyer-refuse" type="button" onClick={() => void updateReservation(reservation, 'buyer_refused')} disabled={processing === reservation.id} title="Отказ покупателя"><X /></button><button className="developer-refuse" type="button" onClick={() => void updateReservation(reservation, 'developer_refused')} disabled={processing === reservation.id} title="Отмена застройщика и возврат"><RotateCcw /></button></>}</div></TableCell></TableRow>)}
        </TableBody>
      </Table>}
    </section>
  );
}
