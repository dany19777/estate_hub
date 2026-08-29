'use client';

import { type ReactElement, type SyntheticEvent, useRef, useState } from 'react';
import { CalendarDays, Check, MessageCircle, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type LeadRequestDialogProps = {
  type: 'consultation' | 'viewing';
  complexId: string;
  complexName: string;
  listingId?: string;
  unitNumber?: string;
  trigger: ReactElement;
};

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function LeadRequestDialog({ type, complexId, complexName, listingId, unitNumber, trigger }: LeadRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ leadId: string; message: string; repeated: boolean } | null>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', message: '', requestedDate: dateOffset(1), timeSlot: '14:00', consent: true });
  const idempotencyKey = useRef('');
  const isViewing = type === 'viewing';

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError('');
      setResult(null);
      idempotencyKey.current = '';
    }
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify({ ...form, type, complexId, listingId: listingId ?? null }),
      });
      const payload = await response.json() as { leadId?: string; message?: string; repeated?: boolean };
      if (!response.ok || !payload.leadId) throw new Error(payload.message || 'Не удалось отправить заявку.');
      setResult({ leadId: payload.leadId, message: payload.message || 'Заявка отправлена.', repeated: Boolean(payload.repeated) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось отправить заявку.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="lead-request-dialog">
        {!result ? <>
          <DialogHeader>
            <Badge>{isViewing ? <CalendarDays /> : <MessageCircle />} {isViewing ? 'Бесплатный просмотр' : 'Бесплатная консультация'}</Badge>
            <DialogTitle>{isViewing ? 'Запись на просмотр' : 'Связаться с застройщиком'}</DialogTitle>
            <DialogDescription>{complexName}{unitNumber ? ` · квартира № ${unitNumber}` : ''}. Заявка попадёт напрямую в CRM застройщика.</DialogDescription>
          </DialogHeader>
          <form id={`lead-request-${type}-${listingId ?? complexId}`} className="lead-request-form" onSubmit={submit}>
            {isViewing && <div className="lead-schedule-fields"><label htmlFor={`lead-date-${listingId}`}>Дата<Input id={`lead-date-${listingId}`} type="date" min={dateOffset(0)} max={dateOffset(30)} value={form.requestedDate} onChange={(event) => setForm({ ...form, requestedDate: event.target.value })} required /></label><label htmlFor={`lead-time-${listingId}`}>Время<select id={`lead-time-${listingId}`} value={form.timeSlot} onChange={(event) => setForm({ ...form, timeSlot: event.target.value })}>{['10:00', '12:00', '14:00', '16:00', '18:00'].map((time) => <option key={time}>{time}</option>)}</select></label></div>}
            <label htmlFor={`lead-name-${type}-${listingId ?? complexId}`}>Имя и фамилия<Input id={`lead-name-${type}-${listingId ?? complexId}`} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Иван Иванов" required minLength={2} maxLength={100} /></label>
            <div className="lead-contact-fields"><label htmlFor={`lead-phone-${type}-${listingId ?? complexId}`}>Телефон<Input id={`lead-phone-${type}-${listingId ?? complexId}`} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+998 90 123 45 67" inputMode="tel" required /></label><label htmlFor={`lead-email-${type}-${listingId ?? complexId}`}>Email, необязательно<Input id={`lead-email-${type}-${listingId ?? complexId}`} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></label></div>
            <label htmlFor={`lead-message-${type}-${listingId ?? complexId}`}>{isViewing ? 'Комментарий менеджеру' : 'Что вас интересует?'}<textarea id={`lead-message-${type}-${listingId ?? complexId}`} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={isViewing ? 'Например, хочу посмотреть отделку и планировку' : 'Например, расскажите об условиях рассрочки'} maxLength={500} /></label>
            <label className="lead-consent"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required /> Я согласен на обработку данных для ответа на заявку</label>
            {error && <p className="lead-request-error">{error}</p>}
          </form>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={submitting} />}>Отмена</DialogClose>
            <Button type="submit" form={`lead-request-${type}-${listingId ?? complexId}`} disabled={submitting || !form.consent}>{submitting ? 'Отправляем…' : isViewing ? 'Запросить просмотр' : 'Получить консультацию'}</Button>
          </DialogFooter>
        </> : <div className="lead-request-success">
          <span><Check /></span>
          <Badge variant="secondary"><ShieldCheck /> Заявка зарегистрирована</Badge>
          <DialogTitle>{isViewing ? 'Менеджер подтвердит просмотр' : 'Менеджер свяжется с вами'}</DialogTitle>
          <DialogDescription>{result.message}{result.repeated ? ' Мы связали её с вашим существующим профилем клиента.' : ''}</DialogDescription>
          <small>Номер заявки: {result.leadId.slice(0, 8).toUpperCase()}</small>
          <DialogFooter><DialogClose render={<Button />}>Готово</DialogClose></DialogFooter>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
