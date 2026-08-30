'use client';

import { type ReactElement, type SyntheticEvent, useRef, useState } from 'react';
import { Check, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InternalLink as Link } from '@/components/internal-link';

type ReservationStage = 'form' | 'hold' | 'confirmed';

export function ReservationDialog({ listingId, unitNumber, trigger }: { listingId: string; unitNumber: string; trigger: ReactElement }) {
  const [stage, setStage] = useState<ReservationStage>('form');
  const [reservationId, setReservationId] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState('');
  const [reservationExpiresAt, setReservationExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(false);
  const createKey = useRef('');
  const confirmKey = useRef('');

  const createHold = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true); setError(''); setVerificationRequired(false);
    if (!createKey.current) createKey.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': createKey.current },
        body: JSON.stringify({ listingId, fullName: form.get('fullName'), phone: form.get('phone') }),
      });
      const data = await response.json() as { reservationId?: string; holdExpiresAt?: string; message?: string; error?: string };
      if (!response.ok || !data.reservationId) { if (data.error === 'verification_required') setVerificationRequired(true); throw new Error(data.message ?? 'Не удалось удержать квартиру.'); }
      setReservationId(data.reservationId); setHoldExpiresAt(data.holdExpiresAt ?? ''); setStage('hold');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удержать квартиру.'); }
    finally { setLoading(false); }
  };

  const confirmPayment = async () => {
    if (!reservationId) return;
    setLoading(true); setError('');
    if (!confirmKey.current) confirmKey.current = crypto.randomUUID();
    try {
      const response = await fetch(`/api/reservations/${reservationId}/confirm`, { method: 'POST', headers: { 'Idempotency-Key': confirmKey.current } });
      const data = await response.json() as { reservationExpiresAt?: string; message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Не удалось подтвердить оплату.');
      setReservationExpiresAt(data.reservationExpiresAt ?? ''); setStage('confirmed');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось подтвердить оплату.'); }
    finally { setLoading(false); }
  };

  const reset = () => { setStage('form'); setReservationId(''); setHoldExpiresAt(''); setReservationExpiresAt(''); setError(''); setVerificationRequired(false); createKey.current = ''; confirmKey.current = ''; };
  const dateLabel = (value: string) => value ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${value.replace(' ', 'T')}Z`)) : '';

  return <Dialog onOpenChange={(open) => { if (!open && !loading) reset(); }}>
    <DialogTrigger render={trigger}>Забронировать</DialogTrigger>
    <DialogContent className="reservation-dialog">
      <DialogHeader>
        <Badge><Clock3 /> Онлайн-бронь</Badge>
        <DialogTitle>Квартира № {unitNumber}</DialogTitle>
        <DialogDescription>{stage === 'form' ? 'После подтверждения данных квартира будет удержана только для вас на 5 минут — до завершения оплаты.' : stage === 'hold' ? `Квартира удерживается до ${dateLabel(holdExpiresAt)}.` : `Бронь действует до ${dateLabel(reservationExpiresAt)}.`}</DialogDescription>
      </DialogHeader>
      {stage === 'form' && <form id={`reservation-${listingId}`} className="reservation-form" onSubmit={createHold}>
        <label>Имя и фамилия<Input name="fullName" required minLength={2} defaultValue="Иван Иванов" /></label>
        <label>Телефон<Input name="phone" required inputMode="tel" defaultValue="+998 90 123 45 67" /></label>
        <label className="consent-row"><input required type="checkbox" /> Я принимаю условия онлайн-бронирования</label>
        <div><span>Стоимость бронирования</span><strong>2 500 000 сум</strong></div>
      </form>}
      {stage === 'hold' && <div className="reservation-success"><span><LockKeyhole /></span><h3>Квартира удержана</h3><p>Завершите защищённый тестовый платёж в течение 5 минут. Цена квартиры зафиксирована на момент удержания.</p></div>}
      {stage === 'confirmed' && <div className="reservation-success"><span><Check /></span><h3>Бронь подтверждена</h3><p><ShieldCheck /> Оплата зарегистрирована, квартира снята с доступной витрины на 72 часа.</p></div>}
      {error && <p className="reservation-error" role="alert">{error}</p>}
      {verificationRequired && <Button nativeButton={false} render={<Link href="/profile" />}><ShieldCheck /> Перейти к проверке личности</Button>}
      <DialogFooter>
        {stage === 'form' ? <><DialogClose render={<Button variant="outline" />} disabled={loading}>Отмена</DialogClose><Button type="submit" form={`reservation-${listingId}`} disabled={loading}>{loading ? 'Проверяем…' : 'Удержать на 5 минут'}</Button></> : stage === 'hold' ? <><DialogClose render={<Button variant="outline" />} disabled={loading}>Отмена</DialogClose><Button onClick={confirmPayment} disabled={loading}>{loading ? 'Подтверждаем…' : 'Подтвердить тестовую оплату'}</Button></> : <DialogClose render={<Button />}>Готово</DialogClose>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
