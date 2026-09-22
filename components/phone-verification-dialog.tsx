'use client';

import { type ReactElement, type SyntheticEvent, useState } from 'react';
import { Check, MessageSquareText, Phone, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function PhoneVerificationDialog({ trigger, onVerified }: { trigger: ReactElement; onVerified: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState('+998 ');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function requestCode(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/buyer/phone-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const payload = await response.json() as { status?: string; phone?: string; demoCode?: string; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось получить код.');
      if (payload.status === 'verified') { setStep('done'); onVerified(); return; }
      setPhone(payload.phone ?? phone); setDemoCode(payload.demoCode ?? ''); setStep('code');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось получить код.'); }
    finally { setSubmitting(false); }
  }

  async function confirmCode(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/buyer/phone-verification', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось подтвердить код.');
      setStep('done'); onVerified();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось подтвердить код.'); }
    finally { setSubmitting(false); }
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) { setStep('phone'); setCode(''); setDemoCode(''); setError(''); }
  }

  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger render={trigger}/><DialogContent className="phone-verification-dialog">
    {step === 'phone' && <><DialogHeader><Badge><Phone/> Базовый аккаунт</Badge><DialogTitle>Подтвердите номер телефона</DialogTitle><DialogDescription>После OTP-проверки станут доступны избранное, сравнение, сообщения, просмотры и сохранённые поиски.</DialogDescription></DialogHeader><form id="phone-request-form" className="phone-verification-form" onSubmit={requestCode}><label htmlFor="buyer-phone">Номер телефона<Input id="buyer-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" required/></label>{error && <p className="lead-request-error">{error}</p>}</form><DialogFooter><DialogClose render={<Button variant="outline" disabled={submitting}/>}>Отмена</DialogClose><Button form="phone-request-form" type="submit" disabled={submitting}>{submitting ? 'Создаём код…' : 'Получить код'}</Button></DialogFooter></>}
    {step === 'code' && <><DialogHeader><Badge><MessageSquareText/> OTP-код</Badge><DialogTitle>Введите код из SMS</DialogTitle><DialogDescription>Код действует 10 минут. Для закрытого стенда используется безопасный демонстрационный провайдер.</DialogDescription></DialogHeader><form id="phone-code-form" className="phone-verification-form" onSubmit={confirmCode}><label htmlFor="buyer-phone-code">Шестизначный код<Input id="buyer-phone-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" minLength={6} maxLength={6} required/></label>{demoCode && <div className="phone-demo-code"><ShieldCheck/><span><small>Демо-код текущего стенда</small><strong>{demoCode}</strong></span></div>}{error && <p className="lead-request-error">{error}</p>}</form><DialogFooter><Button variant="outline" type="button" onClick={() => { setStep('phone'); setError(''); }}>Изменить номер</Button><Button form="phone-code-form" type="submit" disabled={submitting || code.length !== 6}>{submitting ? 'Проверяем…' : 'Подтвердить'}</Button></DialogFooter></>}
    {step === 'done' && <div className="phone-verification-success"><span><Check/></span><Badge variant="secondary"><ShieldCheck/> Телефон подтверждён</Badge><DialogTitle>Базовый аккаунт активирован</DialogTitle><DialogDescription>Теперь доступны персональные функции EstateHub. Онлайн-бронирование пока не подключено; для просмотра квартиры свяжитесь с продавцом.</DialogDescription><DialogFooter><DialogClose render={<Button/>}>Готово</DialogClose></DialogFooter></div>}
  </DialogContent></Dialog>;
}
