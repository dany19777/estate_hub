'use client';

import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Edit3, RefreshCw, WalletCards } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminBillingEvent, AdminBillingPlan, AdminSubscription, SecondaryBillingListing } from '@/hooks/use-admin-billing';
import { formatUzsAmount } from '@/lib/marketplace';

type Props = {
  plans: AdminBillingPlan[];
  subscriptions: AdminSubscription[];
  config: { secondary_listing_fee_uzs: number; secondary_period_days: number } | null;
  secondaryListings: SecondaryBillingListing[];
  events: AdminBillingEvent[];
  stats: { revenue: number; activeSubscriptions: number; activeSecondary: number; expiringSecondary: number };
  loading: boolean;
  error: string;
  processing: string;
  onRetry: () => void;
  onUpdatePlan: (plan: AdminBillingPlan) => Promise<void>;
  onUpdateConfig: (feeUzs: number, periodDays: number) => Promise<void>;
  onActivateDeveloper: (organizationId: string, claimId: string) => Promise<void>;
  onRejectPaymentClaim: (claimId: string, reason: string) => Promise<void>;
  onActivateSecondary: (listingId: string, claimId: string) => Promise<void>;
};

function money(value: number) {
  return formatUzsAmount(value);
}

function date(value?: string | null) {
  if (!value) return 'Не оплачен';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`));
}

export function AdminBillingPanel({ plans, subscriptions, config, secondaryListings, events, stats, loading, error, processing, onRetry, onUpdatePlan, onUpdateConfig, onActivateDeveloper, onRejectPaymentClaim, onActivateSecondary }: Props) {
  function editPlan(plan: AdminBillingPlan) {
    const name = window.prompt('Название тарифа', plan.name)?.trim();
    if (!name) return;
    const limit = Number(window.prompt('Лимит активных квартир', String(plan.inventory_limit)));
    if (!Number.isInteger(limit) || limit < 1) return;
    const price = Number(window.prompt('Стоимость в сумах за 30 дней', String(plan.monthly_price_uzs)));
    if (!Number.isInteger(price) || price < 0) return;
    void onUpdatePlan({ ...plan, name, inventory_limit: limit, monthly_price_uzs: price });
  }

  function editConfig() {
    if (!config) return;
    const fee = Number(window.prompt('Стоимость публикации вторичного объявления, сум', String(config.secondary_listing_fee_uzs)));
    if (!Number.isInteger(fee) || fee < 1) return;
    const days = Number(window.prompt('Продолжительность оплаченного периода, дней', String(config.secondary_period_days)));
    if (!Number.isInteger(days) || days < 1 || days > 365) return;
    void onUpdateConfig(fee, days);
  }

  function confirmSecondary(item: SecondaryBillingListing) {
    if (!item.payment_claim_id || !item.payment_reference) return;
    const method = item.payment_method === 'offline_bank_transfer' ? 'счёт компании' : 'банковская карта';
    const entered = window.prompt(`Проверьте поступление ${money(config?.secondary_listing_fee_uzs ?? 0)} на ${method} в банковской выписке. Введите номер операции ${item.payment_reference} для подтверждения:`);
    if (entered?.trim() !== item.payment_reference) return;
    void onActivateSecondary(item.id, item.payment_claim_id);
  }

  function confirmDeveloper(item: AdminSubscription) {
    if (!item.payment_claim_id || !item.payment_reference || !item.contract_reference) return;
    const entered = window.prompt(`Сверьте подписанный договор ${item.contract_reference}, тариф «${item.requested_plan_name ?? item.plan_name}» и поступление ${money(item.payment_amount ?? 0)} по банковской выписке. Введите номер операции ${item.payment_reference}:`);
    if (entered?.trim() !== item.payment_reference) return;
    void onActivateDeveloper(item.organization_id, item.payment_claim_id);
  }

  function rejectClaim(claimId: string) {
    const reason = window.prompt('Причина отклонения заявки на перевод:')?.trim();
    if (reason && reason.length >= 5) void onRejectPaymentClaim(claimId, reason);
  }

  return (
    <section className="admin-panel admin-billing-panel" id="billing">
      <div className="admin-panel-heading"><div><h2>Тарифы и биллинг</h2><p>Подписки застройщиков и оплаченные периоды вторичного рынка</p></div><button type="button" onClick={onRetry}><RefreshCw /> Обновить</button></div>
      {error && <div className="admin-operation-state error"><AlertTriangle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
      <div className="billing-kpis">
        <article><span><CircleDollarSign /></span><small>Выручка</small><strong>{money(stats.revenue)}</strong></article>
        <article><span><CheckCircle2 /></span><small>Подписки</small><strong>{stats.activeSubscriptions}</strong></article>
        <article><span><WalletCards /></span><small>Вторичный рынок</small><strong>{stats.activeSecondary}</strong></article>
        <article><span><CalendarClock /></span><small>Истекают за 7 дней</small><strong>{stats.expiringSecondary}</strong></article>
      </div>
      <div className="admin-billing-plans">{plans.map((plan) => <article className={!plan.is_active ? 'disabled' : ''} key={plan.id}><div><Badge>{plan.code}</Badge><button type="button" onClick={() => editPlan(plan)} disabled={processing === plan.id} aria-label={`Настроить ${plan.name}`}><Edit3 /></button></div><h3>{plan.name}</h3><strong>{plan.monthly_price_uzs ? money(plan.monthly_price_uzs) : 'Индивидуально'}</strong><p>{plan.inventory_limit} активных квартир</p></article>)}</div>
      <div className="admin-billing-block">
        <div className="admin-billing-block-heading"><div><h3>Подписки застройщиков</h3><p>Занятые слоты считаются только по опубликованным и забронированным квартирам.</p></div><span>{subscriptions.length} компаний</span></div>
        <Table className="admin-table"><TableHeader><TableRow><TableHead>Компания</TableHead><TableHead>Тариф</TableHead><TableHead>Использование</TableHead><TableHead>Статус</TableHead><TableHead>Оплачен до</TableHead><TableHead>Договор и перевод</TableHead></TableRow></TableHeader><TableBody>
          {loading && <TableRow><TableCell colSpan={6}><div className="table-empty-state">Загружаем подписки…</div></TableCell></TableRow>}
          {!loading && subscriptions.map((item) => <TableRow key={item.id}><TableCell><strong>{item.organization_name}</strong></TableCell><TableCell>{item.plan_name}</TableCell><TableCell><div className="billing-usage-cell"><span><i style={{ width: `${Math.min(100, Number(item.active_inventory) / Number(item.inventory_limit) * 100)}%` }} /></span><strong>{item.active_inventory} / {item.inventory_limit}</strong></div></TableCell><TableCell><Badge className={`billing-admin-status ${item.status}`}>{item.status === 'trialing' ? 'Пробный' : item.status === 'active' ? 'Активен' : item.status === 'past_due' ? 'Просрочен' : 'Отключён'}</Badge></TableCell><TableCell>{date(item.current_period_end)}</TableCell><TableCell>{item.payment_claim_id ? <div><small>Договор {item.contract_reference} · перевод {item.payment_reference}</small><button className="secondary-billing-action" type="button" disabled={processing === item.organization_id} onClick={() => confirmDeveloper(item)}>Подтвердить поступление</button><button className="secondary-billing-action" type="button" disabled={processing === item.payment_claim_id} onClick={() => rejectClaim(item.payment_claim_id!)}>Отклонить</button></div> : 'Нет заявки'}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
      <div className="admin-billing-block secondary-billing-block">
        <div className="admin-billing-block-heading"><div><h3>Публикации вторичного рынка</h3><p>{config ? `${money(config.secondary_listing_fee_uzs)} за ${config.secondary_period_days} дней. После срока объявление автоматически скрывается.` : 'Условия не настроены.'}</p></div><button type="button" onClick={editConfig} disabled={!config || processing === 'config'}><Edit3 /> Изменить условия</button></div>
        <Table className="admin-table"><TableHeader><TableRow><TableHead>Объявление</TableHead><TableHead>Продавец</TableHead><TableHead>Стоимость объекта</TableHead><TableHead>Период до</TableHead><TableHead>Статус</TableHead><TableHead>Действие</TableHead></TableRow></TableHeader><TableBody>
          {!loading && secondaryListings.length === 0 && <TableRow><TableCell colSpan={6}><div className="table-empty-state">Объявлений вторичного рынка пока нет.</div></TableCell></TableRow>}
          {secondaryListings.map((item) => <TableRow key={item.id}><TableCell><div className="finance-object"><strong>{item.complex_name} · кв. {item.unit_number}</strong><small>{item.market_type === 'SECONDARY_OWNER' ? 'Собственник' : 'Агентство'}</small></div></TableCell><TableCell>{item.seller_name}</TableCell><TableCell>{money(item.price_uzs)}</TableCell><TableCell>{date(item.paid_until)}</TableCell><TableCell><Badge className={`billing-admin-status ${item.purchase_status === 'active' ? 'active' : 'past_due'}`}>{item.purchase_status === 'active' ? 'Оплачено' : item.payment_claim_id ? 'Проверить перевод' : item.purchase_status === 'expired' ? 'Истёк' : 'Не оплачен'}</Badge></TableCell><TableCell>{item.payment_claim_id ? <div><small>{item.payment_method === 'offline_bank_transfer' ? 'Банк' : 'Карта'} · {item.payment_reference}</small><button className="secondary-billing-action" type="button" disabled={processing === item.id || item.status === 'sold'} onClick={() => confirmSecondary(item)}>{processing === item.id ? 'Сохраняем…' : 'Подтвердить поступление'}</button><button className="secondary-billing-action" type="button" disabled={processing === item.payment_claim_id} onClick={() => rejectClaim(item.payment_claim_id!)}>Отклонить</button></div> : <span>Ожидаем перевод</span>}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
      <div className="billing-event-strip"><div><h3>Последние начисления</h3><span>{events.length} событий</span></div><div>{events.slice(0, 5).map((event) => <article key={event.id}><span><WalletCards /></span><p><strong>{event.organization_name ?? (event.complex_name ? `${event.complex_name} · кв. ${event.unit_number}` : 'Платёж')}</strong><small>{event.event_type === 'plan_change' ? 'Смена тарифа' : event.event_type === 'subscription_charge' ? 'Подписка' : event.event_type === 'secondary_renewal' ? 'Продление объявления' : 'Публикация объявления'}</small></p><em>{money(event.amount_uzs)}</em></article>)}</div></div>
    </section>
  );
}
