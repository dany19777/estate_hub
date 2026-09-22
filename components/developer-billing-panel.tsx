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
  loading: boolean;
  error: string;
  feedback: string;
  processing: string;
  onRetry: () => void;
  onChangePlan: (planId: string) => Promise<string>;
  onRenew: () => Promise<string>;
};

function money(value: number) {
  return value === 0 ? 'Индивидуально' : formatUzsAmount(value);
}

function date(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`));
}

export function DeveloperBillingPanel({ plans, subscription, usage, events, loading, error, feedback, processing, onRetry, onChangePlan, onRenew }: Props) {
  const percent = usage.limit ? Math.min(100, Math.round(usage.activeInventory / usage.limit * 100)) : 0;
  return (
    <section className="dashboard-panel developer-billing-panel" id="developer-billing">
      <div className="panel-heading"><div><h2>Тариф и лимиты</h2><p>Онлайн-оплата подписки пока отключена. По вопросам доступа обратитесь в поддержку.</p></div><Badge className={`billing-subscription-state ${subscription?.status ?? 'past_due'}`}>{subscription?.status === 'trialing' ? 'Пробный период' : subscription?.status === 'active' ? 'Активен' : 'Требует решения администратора'}</Badge></div>
      {error && <div className="dashboard-operation-state error"><AlertCircle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
      {feedback && <div className="dashboard-operation-state success"><Check /><span>{feedback}</span></div>}
      {loading ? <div className="table-empty-state">Загружаем тариф…</div> : <>
        <div className="developer-billing-summary">
          <article><span><ShieldCheck /></span><div><small>Текущий тариф</small><strong>{subscription?.name ?? 'Не подключён'}</strong><em>до {date(subscription?.current_period_end)}</em></div><button type="button" disabled><RefreshCw /> Онлайн-продление отключено</button></article>
          <article className="inventory-usage"><div><small>Активный инвентарь</small><strong>{usage.activeInventory} из {usage.limit}</strong></div><div className="inventory-meter"><i style={{ width: `${percent}%` }} /></div><p>Опубликованные и забронированные квартиры занимают слот. Проданные и архивные — нет.</p></article>
        </div>
        <div className="developer-plan-grid">{plans.map((plan) => {
          const current = subscription?.plan_id === plan.id;
          return <article className={current ? 'current' : ''} key={plan.id}><div><span>{current ? <Check /> : <Sparkles />}</span><small>{plan.code}</small></div><h3>{plan.name}</h3><strong>{money(plan.monthly_price_uzs)}<em>{plan.monthly_price_uzs ? ' / месяц' : ''}</em></strong><p>До {plan.inventory_limit} активных квартир</p><button type="button" disabled>{current ? 'Текущий тариф' : 'Пока недоступно'}</button></article>;
        })}</div>
        <div className="developer-billing-history"><div><h3>История платежей</h3><span>{events.length} операций</span></div>{events.length === 0 ? <p>После смены или продления тарифа операция появится здесь.</p> : events.slice(0, 6).map((event) => <article key={event.id}><span><CreditCard /></span><div><strong>{event.event_type === 'plan_change' ? 'Смена тарифа' : 'Продление подписки'}</strong><small>{event.provider_reference}</small></div><p><strong>{money(event.amount_uzs)}</strong><small>{date(event.created_at)}</small></p></article>)}</div>
      </>}
    </section>
  );
}
