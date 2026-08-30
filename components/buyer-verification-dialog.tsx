'use client';

import { type ReactElement, type SyntheticEvent, useState } from 'react';
import { Check, FileCheck2, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function BuyerVerificationDialog({ trigger, onSubmitted }: { trigger: ReactElement; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ documentType: 'id_card', documentNumber: '', birthDate: '', consent: false });

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/buyer/verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось отправить данные.');
      setSubmitted(true);
      onSubmitted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось отправить данные.');
    } finally {
      setSubmitting(false);
    }
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) { setError(''); setSubmitted(false); }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger render={trigger} />
    <DialogContent className="buyer-verification-dialog">
      {!submitted ? <>
        <DialogHeader><Badge><ShieldCheck /> Проверка личности</Badge><DialogTitle>Подтвердите данные покупателя</DialogTitle><DialogDescription>Подтверждение требуется один раз перед первым платным бронированием. Полный номер документа EstateHub не сохраняет.</DialogDescription></DialogHeader>
        <form id="buyer-verification-form" className="buyer-verification-form" onSubmit={submit}>
          <label htmlFor="identity-document-type">Документ<select id="identity-document-type" value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}><option value="id_card">ID-карта</option><option value="passport">Паспорт</option></select></label>
          <label htmlFor="identity-document-number">Серия и номер<Input id="identity-document-number" value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value.toUpperCase() })} placeholder="AA1234567" minLength={6} maxLength={20} required /></label>
          <label htmlFor="identity-birth-date">Дата рождения<Input id="identity-birth-date" type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} required /></label>
          <div className="identity-provider-note"><FileCheck2 /><p><strong>Провайдер проверки подключается через защищённый адаптер</strong><small>В этой версии решение подтверждает специалист EstateHub.</small></p></div>
          <label className="lead-consent"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required /> Я согласен на проверку личности для операций бронирования</label>
          {error && <p className="lead-request-error">{error}</p>}
        </form>
        <DialogFooter><DialogClose render={<Button variant="outline" disabled={submitting} />}>Отмена</DialogClose><Button type="submit" form="buyer-verification-form" disabled={submitting || !form.consent}>{submitting ? 'Отправляем…' : 'Отправить на проверку'}</Button></DialogFooter>
      </> : <div className="lead-request-success"><span><Check /></span><Badge variant="secondary"><ShieldCheck /> Данные защищены</Badge><DialogTitle>Заявка отправлена</DialogTitle><DialogDescription>Статус обновится в профиле после решения специалиста.</DialogDescription><DialogFooter><DialogClose render={<Button />}>Готово</DialogClose></DialogFooter></div>}
    </DialogContent>
  </Dialog>;
}
