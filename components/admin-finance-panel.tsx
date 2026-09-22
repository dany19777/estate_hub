'use client';

import { AlertTriangle, CheckCircle2, RefreshCw, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AdminFinanceOperation } from '@/hooks/use-admin-finance';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatUzsAmount } from '@/lib/marketplace';

type Props = {
  operations: AdminFinanceOperation[];
  loading: boolean;
  error: string;
  processing: string;
  onRetry: () => void;
  onReconcile: (operationId: string) => Promise<void>;
};

const operationLabels = { reservation_payment: 'Оплата брони', refund: 'Возврат', reconciliation: 'Сверка' } as const;
const statusLabels = { pending: 'Ожидает', succeeded: 'Проведена', failed: 'Ошибка', manual_review: 'На сверке' } as const;

function formatMoney(value: number) {
  return formatUzsAmount(value);
}

export function AdminFinancePanel({ operations, loading, error, processing, onRetry, onReconcile }: Props) {
  const [filter, setFilter] = useState<'all' | 'reservation_payment' | 'refund' | 'review'>('all');
  const visibleOperations = useMemo(() => operations.filter((item) => {
    if (filter === 'review') return item.status !== 'succeeded';
    return filter === 'all' || item.operation_type === filter;
  }), [filter, operations]);

  return (
    <section className="admin-panel finance-operations-panel" id="finance">
      <div className="admin-panel-heading"><div><h2>Брони и платёжные операции</h2><p>Платежи, возвраты и сверка с провайдером</p></div><span className="queue-total">{operations.length} операций</span></div>
      <div className="finance-toolbar">
        <div>{[
          ['all', 'Все'], ['reservation_payment', 'Оплаты'], ['refund', 'Возвраты'], ['review', 'На сверке'],
        ].map(([value, label]) => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value as typeof filter)}>{label}</button>)}</div>
        <button type="button" onClick={onRetry} disabled={loading}><RefreshCw /> Обновить</button>
      </div>
      {error && <div className="admin-operation-state error"><AlertTriangle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
      <Table className="admin-table finance-table"><TableHeader><TableRow><TableHead>Операция</TableHead><TableHead>Покупатель и объект</TableHead><TableHead>Сумма</TableHead><TableHead>Провайдер</TableHead><TableHead>Статус</TableHead><TableHead>Создана</TableHead><TableHead>Действие</TableHead></TableRow></TableHeader><TableBody>
        {loading && <TableRow><TableCell colSpan={7}><div className="table-empty-state">Загружаем платёжный журнал…</div></TableCell></TableRow>}
        {!loading && visibleOperations.length === 0 && <TableRow><TableCell colSpan={7}><div className="table-empty-state"><WalletCards /> В этой части журнала операций пока нет.</div></TableCell></TableRow>}
        {visibleOperations.map((item) => {
          const date = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(`${item.created_at.replace(' ', 'T')}Z`));
          return <TableRow key={item.id}>
            <TableCell><div className="finance-operation"><span className={item.operation_type === 'refund' ? 'refund' : 'payment'}>{item.operation_type === 'refund' ? <RefreshCw /> : <WalletCards />}</span><p><strong>{operationLabels[item.operation_type]}</strong><small>{item.reservation_id.slice(0, 12)}…</small></p></div></TableCell>
            <TableCell><div className="finance-object"><strong>{item.buyer_name}</strong><small>{item.complex_name} · кв. {item.unit_number}</small></div></TableCell>
            <TableCell><strong>{formatMoney(item.amount_uzs)}</strong></TableCell>
            <TableCell><div className="finance-object"><strong>{item.provider}</strong><small>{item.provider_reference}</small></div></TableCell>
            <TableCell><Badge className={`finance-status ${item.status}`}>{item.status === 'succeeded' && <CheckCircle2 />}{statusLabels[item.status]}</Badge></TableCell>
            <TableCell>{date}</TableCell>
            <TableCell>{item.status === 'succeeded' ? <span className="finance-reconciled">Сверено</span> : <button className="finance-reconcile" type="button" disabled={processing === item.id} onClick={() => void onReconcile(item.id)}>{processing === item.id ? 'Сверяем…' : 'Сверить'}</button>}</TableCell>
          </TableRow>;
        })}
      </TableBody></Table>
    </section>
  );
}
