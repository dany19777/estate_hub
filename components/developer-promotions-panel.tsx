'use client';

import { AlertCircle, Check, Home, Search, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import type { DeveloperPromotion, PromotionComplex, PromotionListing, PromotionProduct } from '@/hooks/use-developer-promotions';
import { formatUzsAmount } from '@/lib/marketplace';

type Props = { products: PromotionProduct[]; complexes: PromotionComplex[]; listings: PromotionListing[]; promotions: DeveloperPromotion[]; loading: boolean; error: string; feedback: string; processing: string; onRetry: () => void; onPurchase: (productId: string, targetId: string) => Promise<string> };
const surfaceNames: Record<string, string> = { search: 'Поиск', homepage: 'Главная', search_homepage: 'Поиск + главная', special: 'Спецкампания' };
function money(value: number) { return formatUzsAmount(value); }
function date(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`)); }

export function DeveloperPromotionsPanel({ products, complexes, listings, promotions, loading, error, feedback, processing, onRetry, onPurchase }: Props) {
  const defaults = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product.target_type === 'complex' ? complexes[0]?.id ?? '' : listings[0]?.id ?? ''])), [complexes, listings, products]);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const activeCount = promotions.filter((item) => item.status === 'active' || item.status === 'scheduled').length;
  return <section className="dashboard-panel developer-promotions-panel" id="developer-promotions">
    <div className="panel-heading"><div><h2>Продвижение</h2><p>Новые платные кампании пока недоступны. Действующие размещения остаются в истории.</p></div><Badge className="promotion-active-badge"><Sparkles /> {activeCount} активных</Badge></div>
    {error && <div className="dashboard-operation-state error"><AlertCircle /><span>{error}</span><button type="button" onClick={onRetry}>Повторить</button></div>}
    {feedback && <div className="dashboard-operation-state success"><Check /><span>{feedback}</span></div>}
    {loading ? <div className="table-empty-state">Загружаем форматы продвижения…</div> : <>
      <div className="promotion-product-grid">{products.map((product) => {
        const targetOptions = product.target_type === 'complex' ? complexes.map((item) => ({ id: item.id, label: item.name })) : listings.map((item) => ({ id: item.id, label: `${item.complex_name} · кв. ${item.unit_number}` }));
        const target = targets[product.id] ?? defaults[product.id] ?? '';
        const icon = product.surface === 'homepage' ? Home : product.target_type === 'listing' ? Star : Search;
        const Icon = icon;
        return <article key={product.id}><div><span><Icon /></span><Badge>{surfaceNames[product.surface] ?? product.surface}</Badge></div><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price_uzs)} <em>/ {product.duration_days} дней</em></strong><select value={target} onChange={(event) => setTargets((current) => ({ ...current, [product.id]: event.target.value }))} aria-label={`Объект для ${product.name}`}>{targetOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select><button type="button" disabled>Пока недоступно</button></article>;
      })}</div>
      <div className="promotion-history"><div><h3>Мои размещения</h3><span>{promotions.length} записей</span></div>{promotions.length === 0 ? <p>Выберите формат выше — размещение появится здесь после оплаты.</p> : promotions.map((item) => <article key={item.id}><span><Sparkles /></span><div><strong>{item.product_name}</strong><small>{item.complex_name}{item.unit_number ? ` · кв. ${item.unit_number}` : ''}</small></div><Badge className={`promotion-state ${item.status}`}>{item.status === 'active' ? 'Активно' : item.status === 'scheduled' ? 'Запланировано' : item.status === 'expired' ? 'Завершено' : 'Остановлено'}</Badge><p><small>{date(item.starts_at)} — {date(item.ends_at)}</small><strong>{money(item.amount_uzs)}</strong></p></article>)}</div>
    </>}
  </section>;
}
