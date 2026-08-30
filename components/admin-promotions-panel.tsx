'use client';

import { AlertTriangle, CalendarClock, CircleDollarSign, Edit3, RefreshCw, Search, Sparkles, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminPlacement, AdminPromotionProduct } from '@/hooks/use-admin-promotions';

type Props = { products: AdminPromotionProduct[]; placements: AdminPlacement[]; stats: { revenue: number; active: number; scheduled: number; expiring: number }; loading: boolean; error: string; processing: string; onRetry: () => void; onUpdateProduct: (product: AdminPromotionProduct) => Promise<void>; onCancel: (promotionId: string) => Promise<void> };
const surfaceNames: Record<string, string> = { search: 'Поиск', homepage: 'Главная', search_homepage: 'Поиск + главная', special: 'Спецкампания' };
function money(value: number) { return value >= 1_000_000 ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / 1_000_000)} млн сум` : `${new Intl.NumberFormat('ru-RU').format(value)} сум`; }
function date(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`)); }

export function AdminPromotionsPanel({ products, placements, stats, loading, error, processing, onRetry, onUpdateProduct, onCancel }: Props) {
  function editProduct(product: AdminPromotionProduct) {
    const name = window.prompt('Название формата', product.name)?.trim(); if (!name) return;
    const duration = Number(window.prompt('Продолжительность, дней', String(product.duration_days))); if (!Number.isInteger(duration) || duration < 1 || duration > 365) return;
    const price = Number(window.prompt('Стоимость, сум', String(product.price_uzs))); if (!Number.isInteger(price) || price < 0) return;
    const weight = Number(window.prompt('Приоритет в рекомендательной выдаче (0–1000)', String(product.boost_weight))); if (!Number.isInteger(weight) || weight < 0 || weight > 1000) return;
    void onUpdateProduct({ ...product, name, duration_days: duration, price_uzs: price, boost_weight: weight });
  }
  return <section className="admin-panel admin-promotions-panel" id="promotions">
    <div className="admin-panel-heading"><div><h2>Продвижение и featured-размещения</h2><p>Управление форматами, приоритетом и активными рекламными позициями</p></div><button type="button" onClick={onRetry}><RefreshCw /> Обновить</button></div>
    {error && <div className="admin-operation-state error"><AlertTriangle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
    <div className="promotion-admin-kpis"><article><span><CircleDollarSign /></span><small>Выручка</small><strong>{money(stats.revenue)}</strong></article><article><span><Sparkles /></span><small>Активные</small><strong>{stats.active}</strong></article><article><span><CalendarClock /></span><small>Запланировано</small><strong>{stats.scheduled}</strong></article><article><span><AlertTriangle /></span><small>Истекают за 3 дня</small><strong>{stats.expiring}</strong></article></div>
    <div className="promotion-admin-products">{products.map((product) => <article className={!product.is_active ? 'disabled' : ''} key={product.id}><div><span><Search /></span><button type="button" onClick={() => editProduct(product)} disabled={processing === product.id} aria-label={`Настроить ${product.name}`}><Edit3 /></button></div><Badge>{surfaceNames[product.surface] ?? product.surface}</Badge><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price_uzs)} <em>/ {product.duration_days} дней</em></strong><small>Приоритет: {product.boost_weight}</small></article>)}</div>
    <div className="promotion-placement-block"><div className="admin-billing-block-heading"><div><h3>Размещения</h3><p>Спонсируемые позиции отделены от органического рейтинга и имеют явную маркировку.</p></div><span>{placements.length} записей</span></div>
      <Table className="admin-table"><TableHeader><TableRow><TableHead>Компания и объект</TableHead><TableHead>Формат</TableHead><TableHead>Период</TableHead><TableHead>Сумма</TableHead><TableHead>Статус</TableHead><TableHead>Действие</TableHead></TableRow></TableHeader><TableBody>
        {loading && <TableRow><TableCell colSpan={6}><div className="table-empty-state">Загружаем размещения…</div></TableCell></TableRow>}
        {!loading && placements.length === 0 && <TableRow><TableCell colSpan={6}><div className="table-empty-state">Оплаченных размещений пока нет.</div></TableCell></TableRow>}
        {placements.map((item) => <TableRow key={item.id}><TableCell><div className="finance-object"><strong>{item.organization_name}</strong><small>{item.complex_name}{item.unit_number ? ` · кв. ${item.unit_number}` : ''}</small></div></TableCell><TableCell><div className="finance-object"><strong>{item.product_name}</strong><small>{surfaceNames[item.surface] ?? item.surface}</small></div></TableCell><TableCell>{date(item.starts_at)} — {date(item.ends_at)}</TableCell><TableCell>{item.provider === 'demo' ? 'Демо' : money(item.amount_uzs)}</TableCell><TableCell><Badge className={`promotion-state ${item.status}`}>{item.status === 'active' ? 'Активно' : item.status === 'scheduled' ? 'Запланировано' : item.status === 'expired' ? 'Завершено' : 'Остановлено'}</Badge></TableCell><TableCell>{['active', 'scheduled'].includes(item.status) ? <button className="promotion-cancel" type="button" disabled={processing === item.id} onClick={() => void onCancel(item.id)} aria-label={`Остановить ${item.product_name}`}><X /> Остановить</button> : <span className="finance-reconciled">Завершено</span>}</TableCell></TableRow>)}
      </TableBody></Table>
    </div>
  </section>;
}
