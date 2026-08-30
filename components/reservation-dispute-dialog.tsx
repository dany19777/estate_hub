'use client';

import { AlertTriangle, Check, FileSearch, ShieldCheck } from 'lucide-react';
import { type ReactElement, type SyntheticEvent, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function ReservationDisputeDialog({ reservationId, complexName, unitNumber, trigger, onSubmitted }: {
  reservationId: string;
  complexName: string;
  unitNumber: string;
  trigger: ReactElement;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ disputeId: string; priority: string } | null>(null);
  const [form, setForm] = useState({ category: 'terms_not_honored', description: '', consent: false });
  const idempotencyKey = useRef('');

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) { setError(''); setResult(null); idempotencyKey.current = ''; }
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/buyer/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify({ reservationId, category: form.category, description: form.description }),
      });
      const payload = await response.json() as { disputeId?: string; priority?: string; message?: string };
      if (!response.ok || !payload.disputeId) throw new Error(payload.message || 'Не удалось зарегистрировать спор.');
      setResult({ disputeId: payload.disputeId, priority: payload.priority ?? 'normal' });
      onSubmitted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось зарегистрировать спор.');
    } finally {
      setSubmitting(false);
    }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger render={trigger} />
    <DialogContent className="reservation-dispute-dialog">
      {!result ? <>
        <DialogHeader><Badge><AlertTriangle /> Спор по бронированию</Badge><DialogTitle>Сообщить о проблеме</DialogTitle><DialogDescription>{complexName} · квартира № {unitNumber}. Обращение увидит финансовый специалист EstateHub.</DialogDescription></DialogHeader>
        <form id={`reservation-dispute-${reservationId}`} className="reservation-dispute-form" onSubmit={submit}>
          <label htmlFor={`dispute-category-${reservationId}`}>Причина<select id={`dispute-category-${reservationId}`} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="terms_not_honored">Застройщик не соблюдает условия</option><option value="unit_unavailable">Квартира фактически недоступна</option><option value="developer_cancelled">Застройщик отменил бронь</option><option value="payment_issue">Проблема с оплатой</option><option value="other">Другая причина</option></select></label>
          <label htmlFor={`dispute-description-${reservationId}`}>Что произошло?<textarea id={`dispute-description-${reservationId}`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Опишите ситуацию и укажите, какие условия не были выполнены" minLength={20} maxLength={1000} required /></label>
          <div className="dispute-process-note"><FileSearch /><p><strong>Решение принимается по данным брони и аудита</strong><small>Полный возврат выполняется только после подтверждения вины застройщика.</small></p></div>
          <label className="lead-consent"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required /> Подтверждаю достоверность описания</label>
          {error && <p className="lead-request-error">{error}</p>}
        </form>
        <DialogFooter><DialogClose render={<Button variant="outline" disabled={submitting} />}>Отмена</DialogClose><Button type="submit" form={`reservation-dispute-${reservationId}`} disabled={submitting || !form.consent || form.description.trim().length < 20}>{submitting ? 'Отправляем…' : 'Передать на рассмотрение'}</Button></DialogFooter>
      </> : <div className="lead-request-success"><span><Check /></span><Badge variant="secondary"><ShieldCheck /> Обращение зарегистрировано</Badge><DialogTitle>Спор передан специалисту</DialogTitle><DialogDescription>{result.priority === 'high' ? 'Обращению назначен высокий приоритет.' : 'Статус и решение будут доступны в профиле.'}</DialogDescription><small>Номер: {result.disputeId.slice(0, 8).toUpperCase()}</small><DialogFooter><DialogClose render={<Button />}>Готово</DialogClose></DialogFooter></div>}
    </DialogContent>
  </Dialog>;
}
