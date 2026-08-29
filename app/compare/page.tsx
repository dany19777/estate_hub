'use client';

import { ArrowLeft, Check, Heart, Home, MapPin, Search, Scale, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InternalLink as Link } from '@/components/internal-link';
import { useComparisons } from '@/hooks/use-comparisons';
import { formatPriceMillions } from '@/lib/marketplace';

export default function ComparePage() {
  const { items, error, toggle } = useComparisons();
  return <main className="compare-page">
    <header className="detail-header"><Link className="catalog-brand" href="/"><span><Home /></span>Estate<em>Hub</em></Link><nav><Link href="/catalog?market=all">Купить</Link><Link href="/catalog?market=primary">Новостройки</Link><Link href="/catalog?market=secondary">Вторичный рынок</Link></nav><Link href="/profile">Профиль</Link></header>
    <section className="compare-shell">
      <Link className="compare-back" href="/catalog"><ArrowLeft /> Вернуться в каталог</Link>
      <div className="compare-heading"><div><span><Scale /> Подбор по параметрам</span><h1>Сравнение квартир</h1><p>До четырёх реальных предложений: цены и характеристики берутся из опубликованного реестра.</p></div><strong>{items.length} / 4</strong></div>
      {error ? <div className="compare-empty"><strong>{error}</strong><Button variant="outline" nativeButton={false} render={<Link href="/catalog" />}>В каталог</Button></div> : items.length === 0 ? <div className="compare-empty"><Scale /><h2>Добавьте квартиры для сравнения</h2><p>Откройте ЖК, выберите «Сравнить» у подходящей квартиры — можно добавить до четырёх вариантов.</p><Button nativeButton={false} render={<Link href="/catalog" />}>Открыть каталог</Button></div> : <div className="compare-table-wrap"><table className="compare-table"><thead><tr><th>Параметр</th>{items.map((item) => <th key={item.id}><button type="button" onClick={() => void toggle(item.id)} aria-label={`Убрать квартиру ${item.unit_number}`}><X /></button><img src={item.image} alt=""/><Link href={`/complex/${item.slug}`}>{item.complex_name}</Link><small>Квартира № {item.unit_number}</small></th>)}</tr></thead><tbody><tr><th>Цена</th>{items.map((item) => <td key={item.id}><strong>{formatPriceMillions(item.price_uzs)} сум</strong></td>)}</tr><tr><th>Комнаты</th>{items.map((item) => <td key={item.id}>{item.rooms}</td>)}</tr><tr><th>Площадь</th>{items.map((item) => <td key={item.id}>{item.area_sqm} м²</td>)}</tr><tr><th>Этаж</th>{items.map((item) => <td key={item.id}>{item.floor_number} / {item.total_floors}</td>)}</tr><tr><th>Отделка</th>{items.map((item) => <td key={item.id}>{item.finish}</td>)}</tr><tr><th>Готовность ЖК</th>{items.map((item) => <td key={item.id}>{item.completion_label}</td>)}</tr><tr><th>Онлайн-бронь</th>{items.map((item) => <td key={item.id}>{item.reserve_enabled ? <span className="compare-yes"><Check /> Доступна</span> : 'Нет'}</td>)}</tr><tr><th>Действие</th>{items.map((item) => <td key={item.id}><Link href={`/complex/${item.slug}`}>Открыть ЖК</Link></td>)}</tr></tbody></table></div>}
    </section>
  </main>;
}
