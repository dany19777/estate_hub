'use client';

import NextImage from 'next/image';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Banknote, BellRing, Building2, CalendarDays, CheckCircle2, Heart, Home, MapPin, Maximize2, MessageCircle, Phone, Scale, Search, Share2, ShieldCheck, Tag, UserRound } from 'lucide-react';

import { ChatDialog } from '@/components/chat-dialog';
import { InternalLink as Link } from '@/components/internal-link';
import { LeadRequestDialog } from '@/components/lead-request-dialog';
import { DemoReservationButton } from '@/components/demo-reservation-button';
import { MarketplaceHeader } from '@/components/marketplace-header';
import { WatchlistDialog } from '@/components/watchlist-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComparisons } from '@/hooks/use-comparisons';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingDetail } from '@/hooks/use-listing-detail';
import { useTrackRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useWatchlist } from '@/hooks/use-watchlist';
import { formatPriceMillions, formatPricePerSqm } from '@/lib/marketplace';

const reasonLabels: Record<string, string> = {
  initial_publication: 'Первая публикация', initial_submission: 'Создание объявления', secondary_submission: 'Подача объявления', seller_update: 'Продавец изменил цену', admin_correction: 'Корректировка платформы',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`));
}

export default function ListingPage() {
  const params = useParams();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId ?? '';
  const { data, loading, error, retry } = useListingDetail(id);
  const [activeImage, setActiveImage] = useState(0);
  const { has: isFavorite, toggle: toggleFavorite } = useFavorites();
  const { has: isCompared, toggle: toggleComparison } = useComparisons();
  const watchlist = useWatchlist();
  useTrackRecentlyViewed('listing', data?.listing.id);

  const chartPoints = useMemo(() => {
    const values = data?.priceHistory.map((item) => item.newPriceUzs) ?? [];
    if (!values.length && data) values.push(data.listing.priceUzs);
    const min = Math.min(...values), max = Math.max(...values), spread = Math.max(max - min, max * .04, 1);
    const points = values.map((value, index) => ({ x: values.length === 1 ? 310 : 20 + index * (580 / (values.length - 1)), y: 150 - ((value - min + spread * .15) / (spread * 1.3)) * 120, value }));
    return { values, min, max, points, polyline: points.map((point) => `${point.x},${point.y}`).join(' ') };
  }, [data]);

  if (loading) return <main className="listing-detail-page"><MarketplaceHeader/><div className="shell listing-detail-state"><span className="catalog-loader"/><strong>Загружаем объявление и историю цены…</strong></div></main>;
  if (error || !data) return <main className="listing-detail-page"><MarketplaceHeader/><div className="shell listing-detail-state error"><h1>Объявление недоступно</h1><p>{error ?? 'Объявление не найдено.'}</p><div><Button variant="outline" onClick={retry}>Попробовать снова</Button><Button nativeButton={false} render={<Link href="/catalog"/>}>В каталог</Button></div></div></main>;

  const { listing, complex, description, priceHistory } = data;
  const images = data.gallery.length ? data.gallery : [complex.image];
  const secondary = listing.marketType !== 'PRIMARY_DEVELOPER';
  const firstPrice = priceHistory[0]?.newPriceUzs ?? listing.priceUzs;
  const delta = listing.priceUzs - firstPrice;
  const share = async () => { const payload = { title: `${listing.rooms}-комнатная квартира в ${complex.name}`, url: window.location.href }; if (navigator.share) await navigator.share(payload); else await navigator.clipboard.writeText(payload.url); };

  return <main className="listing-detail-page">
    <MarketplaceHeader active={secondary ? 'secondary' : 'primary'} />
    <div className="shell listing-detail-shell">
      <div className="listing-breadcrumbs"><Link href="/"><Home /></Link><span>/</span><Link href="/catalog">{complex.city}</Link><span>/</span><Link href={`/complex/${complex.slug}`}>{complex.name}</Link><span>/</span><strong>Квартира № {listing.unitNumber}</strong></div>
      <Link className="listing-back" href={`/complex/${complex.slug}`}><ArrowLeft/> Все квартиры в {complex.name}</Link>

      <section className="listing-detail-heading"><div><div>{listing.promoted && <Badge><Tag/> {listing.sponsoredLabel ?? 'Продвигается'}</Badge>}<Badge variant="secondary">{secondary ? 'Вторичный рынок' : 'Первичный рынок'}</Badge>{listing.sellerVerified && <Badge className="verified-listing-badge"><ShieldCheck/> Проверено</Badge>}</div><h1>{listing.rooms}-комнатная квартира, {listing.areaSqm} м²</h1><p><MapPin/> {complex.city}, {complex.district}, {complex.name} · {listing.buildingName} · № {listing.unitNumber}</p></div><div className="listing-heading-actions"><button className={isFavorite(complex.id) ? 'active' : ''} type="button" onClick={() => void toggleFavorite({ id: complex.id, slug: complex.slug, name: complex.name, image: complex.image, price_from: listing.priceUzs, available_units: 1, completion_label: complex.completionLabel })}><Heart/> {isFavorite(complex.id) ? 'В избранном' : 'В избранное'}</button><WatchlistDialog name={`квартирой № ${listing.unitNumber}`} subscription={watchlist.find('listing',listing.id)} processing={watchlist.processing} onSave={(settings)=>watchlist.save('listing',listing.id,settings)} onRemove={()=>watchlist.remove('listing',listing.id)} trigger={<button className={watchlist.find('listing',listing.id) ? 'watching' : ''} type="button"><BellRing/> {watchlist.find('listing',listing.id) ? 'Отслеживается' : 'Следить'}</button>}/><button type="button" onClick={() => void toggleComparison(listing.id)}><Scale/> {isCompared(listing.id) ? 'В сравнении' : 'Сравнить'}</button><button type="button" onClick={() => void share()} aria-label="Поделиться"><Share2/></button></div></section>

      <section className="listing-detail-gallery"><div className="listing-detail-main-image"><NextImage src={images[activeImage] ?? images[0]} width={1200} height={720} unoptimized alt={`${listing.rooms}-комнатная квартира в ${complex.name}`}/><span><Maximize2/> {images.length} фото</span></div><div>{images.slice(1,4).map((image,index)=><button type="button" onClick={()=>setActiveImage(index+1)} key={`${image}-${index}`}><NextImage src={image} width={420} height={260} unoptimized alt={`Фото квартиры ${index+2}`}/></button>)}{images.length === 1 && <div className="listing-gallery-placeholder"><Building2/><span>Официальная карточка ЖК</span></div>}</div></section>

      <section className="listing-detail-layout"><div className="listing-detail-main">
        <section className="listing-facts-card"><div><strong>{listing.rooms}</strong><span>комнаты</span></div><div><strong>{listing.areaSqm} м²</strong><span>площадь</span></div><div><strong>{listing.floorNumber} из {listing.totalFloors}</strong><span>этаж</span></div><div><strong>{listing.finish}</strong><span>состояние</span></div><div><strong>{complex.completionLabel}</strong><span>дом</span></div></section>
        <section className="listing-description-card"><span>Об объекте</span><h2>Квартира в {complex.name}</h2><p>{description}</p><div><CheckCircle2/> Объявление связано с официальной карточкой ЖК и не меняет данные комплекса.</div></section>

        <section className="real-price-history" id="price-history"><div className="real-price-heading"><div><span>Прозрачность цены</span><h2>История изменения цены</h2><p>Только фактические записи этого объявления из неизменяемого журнала.</p></div><aside><small>Изменение с первой записи</small><strong className={delta < 0 ? 'down' : delta > 0 ? 'up' : ''}>{delta === 0 ? 'Без изменений' : `${delta > 0 ? '+' : '−'}${formatPriceMillions(Math.abs(delta))} сум`}</strong></aside></div>
          <div className="real-price-chart"><div className="real-price-scale"><span>{formatPriceMillions(chartPoints.max)}</span><span>{formatPriceMillions(Math.round((chartPoints.min + chartPoints.max)/2))}</span><span>{formatPriceMillions(chartPoints.min)}</span></div><svg viewBox="0 0 620 170" role="img" aria-label={`История цены: ${chartPoints.values.map(formatPriceMillions).join(', ')}`}><defs><linearGradient id="realPriceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2765eb" stopOpacity=".23"/><stop offset="1" stopColor="#2765eb" stopOpacity="0"/></linearGradient></defs>{chartPoints.points.length > 1 && <><polygon points={`${chartPoints.polyline} 600,165 20,165`} fill="url(#realPriceFill)"/><polyline points={chartPoints.polyline} fill="none" stroke="#2765eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></>}{chartPoints.points.map((point,index)=><g key={`${point.x}-${index}`}><circle cx={point.x} cy={point.y} r="6" fill="white" stroke="#2765eb" strokeWidth="4"/><title>{formatPriceMillions(point.value)} сум</title></g>)}</svg></div>
          <div className="price-history-events">{priceHistory.length ? priceHistory.slice().reverse().map((entry,index)=><article key={entry.id}><span className={index === 0 ? 'current' : ''}/><div><strong>{reasonLabels[entry.reason] ?? 'Изменение цены'}</strong><small>{formatDate(entry.changedAt)}</small></div><p>{entry.oldPriceUzs ? <><s>{formatPriceMillions(entry.oldPriceUzs)}</s><ArrowRight/></> : null}<b>{formatPriceMillions(entry.newPriceUzs)} сум</b></p></article>) : <article><span className="current"/><div><strong>Текущая цена</strong><small>{formatDate(listing.publishedAt)}</small></div><p><b>{formatPriceMillions(listing.priceUzs)} сум</b></p></article>}</div>
        </section>
      </div>

      <aside className="listing-detail-rail"><section className="listing-purchase-card"><small>Цена квартиры</small><strong>{formatPriceMillions(listing.priceUzs)} сум</strong><span>{formatPricePerSqm(Math.round(listing.priceUzs/listing.areaSqm))}</span><div className="listing-registry-price"><Banknote/><p><b>Цена из реестра</b><em>Обновлена {formatDate(priceHistory.at(-1)?.changedAt ?? listing.publishedAt)}</em></p></div>{secondary ? <ChatDialog listingId={listing.id} complexName={complex.name} unitNumber={listing.unitNumber} seller={listing.seller} trigger={<Button className="listing-primary-action"><MessageCircle/> Написать продавцу</Button>}/> : <><LeadRequestDialog type="consultation" complexId={complex.id} complexName={complex.name} listingId={listing.id} unitNumber={listing.unitNumber} trigger={<Button className="listing-primary-action"><MessageCircle/> Получить консультацию</Button>}/><ChatDialog listingId={listing.id} complexName={complex.name} unitNumber={listing.unitNumber} seller={listing.seller} trigger={<Button variant="outline" className="listing-primary-action listing-message-action"><MessageCircle/> Написать застройщику</Button>}/></>} {!secondary && listing.reserveEnabled && <DemoReservationButton listingId={listing.id} />} {secondary && listing.contactPhone && <a className="listing-call-action" href={`tel:${listing.contactPhone}`}><Phone/> {listing.contactPhone}</a>}<p className="listing-flow-note">{secondary ? 'Условия просмотра и сделки согласуются с продавцом.' : 'Оставьте заявку — застройщик свяжется с вами для консультации.'}</p></section>
        <section className="listing-seller-card"><div><span>{listing.seller.split(/\s+/).map((part)=>part[0]).join('').slice(0,2).toUpperCase()}</span><p><small>{secondary ? 'Собственник' : 'Застройщик'}</small><strong>{listing.seller}</strong></p></div>{listing.sellerVerified && <Badge className="verified-seller"><BadgeCheck/> Проверенный продавец</Badge>}<ul><li><ShieldCheck/> Документы прошли проверку</li><li><Building2/> Объект связан с реестром ЖК</li><li><CalendarDays/> Опубликовано {formatDate(listing.publishedAt)}</li></ul></section>
        <section className="listing-complex-card"><NextImage src={complex.image} width={520} height={260} unoptimized alt={complex.name}/><div><small>Жилой комплекс</small><h3>{complex.name}</h3><p><MapPin/> {complex.district}, {complex.address}</p><Link href={`/complex/${complex.slug}`}>Открыть страницу ЖК <ArrowRight/></Link></div></section>
      </aside></section>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Мобильная навигация"><Link href="/"><Home/><span>Главная</span></Link><Link className="active" href="/catalog"><Search/><span>Поиск</span></Link><button type="button" onClick={()=>void toggleComparison(listing.id)}><Scale/><span>Сравнить</span></button><Link href="/profile"><MessageCircle/><span>Сообщения</span></Link><Link href="/profile"><UserRound/><span>Профиль</span></Link></nav>
  </main>;
}
