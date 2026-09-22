'use client';

import { AlertCircle, Check, CreditCard, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
  const percent = usage.limit ? Math.min(100, Math.round(usage.activeInventory / usage.limit * 100)) : 0;
  const pending = events.some((event) => event.status === 'pending' && ['subscription_charge', 'plan_change'].includes(event.event_type));
  function requestContract(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    if (!plan || !paymentDetails.bankAccount || pending) return;
    const contractReference = window.prompt(`Выбран тариф «${plan.name}»: ${money(plan.monthly_price_uzs)} за 30 дней. Подписанный договор и перевод на ${paymentDetails.bankName}, счёт ${paymentDetails.bankAccount} обязательны. Введите номер подписанного договора:`)?.trim();
    if (!contractReference) return;
    const transferReference = window.prompt('После перевода точной суммы укажите номер банковской операции из выписки:')?.trim();
    if (!transferReference) return;
    void onSubmitContract(planId, contractReference, transferReference);
  }
  return (
    <section className="dashboard-panel developer-billing-panel" id="developer-billing">
      <div className="panel-heading"><div><h2>Тариф и договор</h2><p>{pending ? 'Договор и перевод ожидают проверки суперадмина.' : paymentDetails.bankAccount ? `Оплата банковским переводом: ${paymentDetails.bankName}, счёт ${paymentDetails.bankAccount}. После подписания договора укажите номер операции.` : 'Реквизиты компании ещё настраиваются.'}</p></div><Badge className={`billing-subscription-state ${subscription?.status ?? 'past_due'}`}>{subscription?.status === 'active' && subscription.contract_paid ? 'Активен' : subscription?.status === 'trialing' || subscription?.status === 'active' ? 'Ожидает договора' : 'Требует решения администратора'}</Badge></div>
      {error && <div className="dashboard-operation-state error"><AlertCircle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
      {feedback && <div className="dashboard-operation-state success"><Check /><span>{feedback}</span></div>}
      {loading ? <div className="table-empty-state">Загружаем тариф…</div> : <>
        <div className="developer-billing-summary">
          <article><span><ShieldCheck /></span><div><small>Текущий тариф</small><strong>{subscription?.name ?? 'Не подключён'}</strong><em>до {date(subscription?.current_period_end)}</em></div><button type="button" onClick={() => subscription && requestContract(subscription.plan_id)} disabled={!subscription || !paymentDetails.bankAccount || pending || Boolean(processing)}><RefreshCw /> {pending ? 'Проверяем перевод' : 'Продлить по договору'}</button></article>
          <article className="inventory-usage"><div><small>Активный инвентарь</small><strong>{usage.activeInventory} из {usage.limit}</strong></div><div className="inventory-meter"><i style={{ width: `${percent}%` }} /></div><p>Опубликованные и забронированные квартиры занимают слот. Проданные и архивные — нет.</p></article>
        </div>
        <div className="developer-plan-grid">{plans.map((plan) => {
          const current = subscription?.plan_id === plan.id;
          return <article className={current ? 'current' : ''} key={plan.id}><div><span>{current ? <Check /> : <Sparkles />}</span><small>{plan.code}</small></div><h3>{plan.name}</h3><strong>{money(plan.monthly_price_uzs)}<em>{plan.monthly_price_uzs ? ' / месяц' : ''}</em></strong><p>До {plan.inventory_limit} активных квартир</p><button type="button" disabled={current || !paymentDetails.bankAccount || pending || Boolean(processing) || plan.monthly_price_uzs < 1} onClick={() => requestContract(plan.id)}>{current ? 'Текущий тариф' : 'Выбрать по договору'}</button></article>;
        })}</div>
        <div className="developer-billing-history"><div><h3>История переводов</h3><span>{events.length} операций</span></div>{events.length === 0 ? <p>После подачи договора и перевода заявка появится здесь.</p> : events.slice(0, 6).map((event) => <article key={event.id}><span><CreditCard /></span><div><strong>{event.event_type === 'plan_change' ? 'Смена тарифа' : 'Продление подписки'}</strong><small>{event.provider_reference} · {eventStatus(event)}</small></div><p><strong>{money(event.amount_uzs)}</strong><small>{date(event.created_at)}</small></p></article>)}</div>
      </>}
    </section>
  );
}
