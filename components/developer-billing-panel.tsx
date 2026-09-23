'use client';

import { type SyntheticEvent, useState } from 'react';
import { AlertCircle, Check, CreditCard, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { DeveloperBillingEvent, DeveloperPlan, DeveloperSubscription } from '@/hooks/use-developer-billing';
import { formatUzsAmount } from '@/lib/marketplace';

type Props = {
  plans: DeveloperPlan[];
  subscription: DeveloperSubscription | null;
  usage: { activeInventory: number; limit: number };
  events: DeveloperBillingEvent[];
  paymentDetails: { bankName: string; bankAccount: string };
  loading: boolean;
  error: string;
  feedback: string;
  processing: string;
  onRetry: () => void;
  onSubmitContract: (planId: string, contractReference: string, transferReference: string) => Promise<string>;
};

function money(value: number) {
  return value === 0 ? 'Индивидуально' : formatUzsAmount(value);
}

function date(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`));
}

function eventStatus(event: DeveloperBillingEvent) {
  if (event.status === 'pending') return 'проверяется';
  if (event.status === 'paid') return 'подтверждено';
  if (event.status === 'failed') {
    try { return `отклонено: ${String((JSON.parse(event.metadata_json) as { rejectionReason?: string }).rejectionReason ?? 'сверьте данные')}`; }
    catch { return 'отклонено'; }
  }
  return event.status;
}

export function DeveloperBillingPanel({ plans, subscription, usage, events, paymentDetails, loading, error, feedback, processing, onRetry, onSubmitContract }: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [contractReference, setContractReference] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const percent = usage.limit ? Math.min(100, Math.round(usage.activeInventory / usage.limit * 100)) : 0;
  const pending = events.some((event) => event.status === 'pending' && ['subscription_charge', 'plan_change'].includes(event.event_type));
  const selectedPlan = plans.find((item) => item.id === selectedPlanId);
  const hasPaymentDetails = Boolean(paymentDetails.bankName.trim() && paymentDetails.bankAccount.trim());
  const isPaid = subscription?.status === 'active' && Boolean(subscription.contract_paid);
  async function submitContract(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true); setFormError('');
    try {
      await onSubmitContract(selectedPlan.id, contractReference.trim(), transferReference.trim());
      setSelectedPlanId(''); setContractReference(''); setTransferReference('');
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Не удалось отправить заявку.'); }
    finally { setSubmitting(false); }
  }
  return (
    <section className="dashboard-panel developer-billing-panel" id="developer-billing">
      <div className="panel-heading"><div><h2>Тариф и договор</h2><p>{pending ? 'Договор и перевод ожидают проверки суперадмина.' : hasPaymentDetails ? `Оплата банковским переводом: ${paymentDetails.bankName}, счёт ${paymentDetails.bankAccount}. После подписания договора укажите номер операции.` : 'Реквизиты компании не настроены. Откройте тариф, чтобы увидеть порядок подключения; заявку на оплату можно отправить после добавления счёта.'}</p></div><Badge className={`billing-subscription-state ${subscription?.status ?? 'past_due'}`}>{isPaid ? 'Активен' : pending ? 'Перевод проверяется' : subscription?.status === 'trialing' || subscription?.status === 'active' ? 'Ожидает договора и оплаты' : 'Требует решения администратора'}</Badge></div>
      {error && <div className="dashboard-operation-state error"><AlertCircle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
      {feedback && <div className="dashboard-operation-state success"><Check /><span>{feedback}</span></div>}
      {loading ? <div className="table-empty-state">Загружаем тариф…</div> : <>
        <div className="developer-billing-summary">
          <article><span><ShieldCheck /></span><div><small>{isPaid ? 'Активный тариф' : 'Предварительно выбранный тариф'}</small><strong>{subscription?.name ?? 'Не подключён'}</strong><em>{isPaid ? `Оплачен до ${date(subscription?.current_period_end)}` : 'Не активирован — нужен договор и подтверждённый перевод'}</em></div><button type="button" onClick={() => subscription && setSelectedPlanId(subscription.plan_id)} disabled={!subscription || pending || Boolean(processing)}><RefreshCw /> {pending ? 'Проверяем перевод' : isPaid ? 'Продлить по договору' : 'Оформить по договору'}</button></article>
          <article className="inventory-usage"><div><small>Активный инвентарь</small><strong>{usage.activeInventory} из {usage.limit}</strong></div><div className="inventory-meter"><i style={{ width: `${percent}%` }} /></div><p>Опубликованные и забронированные квартиры занимают слот. Проданные и архивные — нет.</p></article>
        </div>
        <div className="developer-plan-grid">{plans.map((plan) => {
          const current = subscription?.plan_id === plan.id;
          return <article className={current ? 'current' : ''} key={plan.id}><div><span>{current ? <Check /> : <Sparkles />}</span><small>{plan.code}</small></div><h3>{plan.name}</h3><strong>{money(plan.monthly_price_uzs)}<em>{plan.monthly_price_uzs ? ' / месяц' : ''}</em></strong><p>До {plan.inventory_limit} активных квартир</p><button type="button" disabled={pending || Boolean(processing) || plan.monthly_price_uzs < 1} onClick={() => setSelectedPlanId(plan.id)}>{current ? isPaid ? 'Продлить по договору' : 'Оформить по договору' : 'Выбрать по договору'}</button></article>;
        })}</div>
        <div className="developer-billing-history"><div><h3>История переводов</h3><span>{events.length} операций</span></div>{events.length === 0 ? <p>После подачи договора и перевода заявка появится здесь.</p> : events.slice(0, 6).map((event) => <article key={event.id}><span><CreditCard /></span><div><strong>{event.event_type === 'plan_change' ? 'Смена тарифа' : 'Продление подписки'}</strong><small>{event.provider_reference} · {eventStatus(event)}</small></div><p><strong>{money(event.amount_uzs)}</strong><small>{date(event.created_at)}</small></p></article>)}</div>
      </>}
      <Dialog open={Boolean(selectedPlanId)} onOpenChange={(open) => { if (!open) { setSelectedPlanId(''); setFormError(''); } }}>
        <DialogContent className="seller-payment-dialog developer-contract-dialog">
          <DialogHeader><span className="seller-payment-eyebrow"><ShieldCheck /> Договор с EstateHub</span><DialogTitle>Подтвердить тариф</DialogTitle><DialogDescription>Сначала подпишите договор и переведите указанную сумму. Подписка активируется только после проверки суперадмином.</DialogDescription></DialogHeader>
          <div className="seller-payment-summary"><span>{selectedPlan?.name} · 30 дней</span><strong>{selectedPlan ? money(selectedPlan.monthly_price_uzs) : '—'}</strong></div>
          {hasPaymentDetails ? <div className="developer-contract-account"><small>Получатель: {paymentDetails.bankName}</small><strong>Счёт {paymentDetails.bankAccount}</strong></div> : <output className="seller-payment-hint">Оформление пока недоступно: администратор EstateHub должен добавить банковские реквизиты компании. Без них не переводите деньги и не указывайте номер операции.</output>}
          <form id="developer-contract-form" className="seller-payment-form" onSubmit={submitContract}>
            <label className="seller-payment-reference" htmlFor="developer-contract-reference">Номер подписанного договора<Input id="developer-contract-reference" value={contractReference} onChange={(event) => setContractReference(event.target.value)} minLength={6} maxLength={100} required /></label>
            <label className="seller-payment-reference" htmlFor="developer-transfer-reference">Номер банковской операции<Input id="developer-transfer-reference" value={transferReference} onChange={(event) => setTransferReference(event.target.value)} minLength={6} maxLength={100} required /></label>
            <p className="seller-payment-hint">Суперадмин сверит подписанный договор, сумму и поступление денег по выписке. Заявка сама по себе не меняет тариф.</p>
            {formError && <p className="lead-request-error">{formError}</p>}
          </form>
          <DialogFooter><DialogClose render={<Button variant="outline" disabled={submitting} />}>Закрыть</DialogClose><Button type="submit" form="developer-contract-form" disabled={!hasPaymentDetails || submitting || contractReference.trim().length < 6 || transferReference.trim().length < 6}>{submitting ? 'Отправляем…' : 'Отправить на проверку'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
