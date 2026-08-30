'use client';

import { AlertTriangle, Check, Clock3, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AdminDispute } from '@/hooks/use-admin-disputes';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const categories: Record<string, string> = { unit_unavailable: 'Квартира недоступна', terms_not_honored: 'Нарушены условия', developer_cancelled: 'Отмена застройщика', payment_issue: 'Проблема оплаты', other: 'Другая причина' };
const statuses: Record<string, string> = { open: 'Новый', in_review: 'В работе', resolved_refund: 'Возврат', resolved_no_refund: 'Без возврата', cancelled: 'Отменён' };

function money(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / 1_000_000)} млн сум`;
}

export function AdminDisputesPanel({ disputes, loading, error, processing, onRetry, onDecision }: {
  disputes: AdminDispute[];
  loading: boolean;
  error: string;
  processing: string;
  onRetry: () => void;
  onDecision: (disputeId: string, action: 'start_review' | 'approve_refund' | 'reject', note?: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<'active' | 'all' | 'closed'>('active');
  const visible = useMemo(() => disputes.filter((item) => filter === 'all' || (filter === 'active' ? ['open', 'in_review'].includes(item.status) : !['open', 'in_review'].includes(item.status))), [disputes, filter]);

  function decide(item: AdminDispute, action: 'approve_refund' | 'reject') {
    const prompt = action === 'approve_refund' ? 'Основание для полного возврата' : 'Причина отказа в возврате';
    const note = window.prompt(prompt)?.trim() ?? '';
    if (note.length < 5) return;
    void onDecision(item.id, action, note);
  }

  return <section className="admin-panel admin-disputes-panel" id="disputes">
    <div className="admin-panel-heading"><div><h2>Споры и ручные возвраты</h2><p>Эскалации покупателей и решения Finance Operator</p></div><span className="queue-total">{disputes.filter((item) => ['open', 'in_review'].includes(item.status)).length} активных</span></div>
    <div className="finance-toolbar"><div>{[['active', 'Активные'], ['all', 'Все'], ['closed', 'Решённые']].map(([value, label]) => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value as typeof filter)}>{label}</button>)}</div><button type="button" onClick={onRetry} disabled={loading}><RefreshCw /> Обновить</button></div>
    {error && <div className="admin-operation-state error"><AlertTriangle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
    <Table className="admin-table disputes-table"><TableHeader><TableRow><TableHead>Покупатель</TableHead><TableHead>Причина</TableHead><TableHead>Объект</TableHead><TableHead>Сумма</TableHead><TableHead>Приоритет</TableHead><TableHead>Статус</TableHead><TableHead>Решение</TableHead></TableRow></TableHeader><TableBody>
      {loading && <TableRow><TableCell colSpan={7}><div className="table-empty-state">Загружаем споры…</div></TableCell></TableRow>}
      {!loading && visible.length === 0 && <TableRow><TableCell colSpan={7}><div className="table-empty-state"><Check /> В этой очереди споров нет.</div></TableCell></TableRow>}
      {visible.map((item) => <TableRow key={item.id}>
        <TableCell><div className="finance-object"><strong>{item.buyer_name}</strong><small>{item.buyer_email}</small></div></TableCell>
        <TableCell><div className="dispute-reason"><strong>{categories[item.category]}</strong><small title={item.description}>{item.description}</small></div></TableCell>
        <TableCell><div className="finance-object"><strong>{item.complex_name} · № {item.unit_number}</strong><small>{item.developer_name}</small></div></TableCell>
        <TableCell><strong>{money(item.reservation_fee_uzs)}</strong></TableCell>
        <TableCell><Badge className={`dispute-priority ${item.priority}`}>{item.priority === 'high' ? 'Высокий' : 'Обычный'}</Badge></TableCell>
        <TableCell><Badge className={`dispute-status ${item.status}`}>{item.status === 'in_review' && <Clock3 />}{statuses[item.status]}</Badge></TableCell>
        <TableCell>{item.status === 'open' ? <button className="dispute-start" type="button" disabled={processing === item.id} onClick={() => void onDecision(item.id, 'start_review')}>{processing === item.id ? 'Открываем…' : 'Взять в работу'}</button> : item.status === 'in_review' ? <div className="dispute-actions"><button className="refund" type="button" disabled={processing === item.id} onClick={() => decide(item, 'approve_refund')} title="Одобрить полный возврат"><RotateCcw /></button><button className="reject" type="button" disabled={processing === item.id} onClick={() => decide(item, 'reject')} title="Отказать в возврате"><X /></button></div> : <span className="finance-reconciled">Решено</span>}</TableCell>
      </TableRow>)}
    </TableBody></Table>
  </section>;
}
