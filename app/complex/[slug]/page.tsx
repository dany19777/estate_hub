'use client';

import NextImage from 'next/image';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bell, BellRing, Building2, CalendarDays, Car, CheckCircle2,
  Eye, FileText, Heart, Home, MapPin, Maximize2, MessageCircle, RotateCcw, Scale,
  School, Search, Share2, ShieldCheck, SlidersHorizontal, Sparkles, Star, Trees, UserRound,
} from 'lucide-react';

import { ChatDialog } from '@/components/chat-dialog';
import { ComplexMap } from '@/components/complex-map';
import { ComplexReviews } from '@/components/complex-reviews';
import { InternalLink as Link } from '@/components/internal-link';
import { LeadRequestDialog } from '@/components/lead-request-dialog';
import { ReservationDialog } from '@/components/reservation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WatchlistDialog } from '@/components/watchlist-dialog';
import { useComparisons } from '@/hooks/use-comparisons';
import { useComplexDetail } from '@/hooks/use-complex-detail';
import { useFavorites } from '@/hooks/use-favorites';
import { useTrackRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useWatchlist } from '@/hooks/use-watchlist';
import { formatPriceMillions, formatPricePerSqm } from '@/lib/marketplace';
import type { ComplexSummary, SellerType } from '@/lib/marketplace';

type InventoryTab = 'Все' | 'Первичный' | 'Вторичный';

const ignoreMapSelection = (_complex: ComplexSummary) => undefined;
const sellerLabels: Record<SellerType, string> = { developer: 'Застройщик', owner: 'Собственник', agency: 'Агентство' };

function optionalNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

function formatPeriod(period: string) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(`${period}-01T00:00:00Z`))
    .replace('.', '');
}

export default function ComplexPage() {
  const params = useParams();
  const rawSlug = params.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug ?? '';
  const { data, loading, error, retry } = useComplexDetail(slug);
  const [activeImage, setActiveImage] = useState(0);
  const { has: isFavorite, toggle: toggleFavorite } = useFavorites();
  const { items: comparisonItems, has: isCompared, toggle: toggleComparison } = useComparisons();
  const watchlist = useWatchlist();
  useTrackRecentlyViewed('complex', data?.summary.id);
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>('Все');
  const [sellerFilter, setSellerFilter] = useState<'all' | SellerType>('all');
  const [roomsFilter, setRoomsFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [minFloor, setMinFloor] = useState('');
  const [maxFloor, setMaxFloor] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const inventory = useMemo(() => {
    const listings = data?.listings ?? [];
    const priceFrom = optionalNumber(minPrice);
    const priceTo = optionalNumber(maxPrice);
    const areaFrom = optionalNumber(minArea);
    const areaTo = optionalNumber(maxArea);
    const floorFrom = optionalNumber(minFloor);
    const floorTo = optionalNumber(maxFloor);
    return listings.filter((item) => {
      if (inventoryTab === 'Первичный' && item.marketType !== 'PRIMARY_DEVELOPER') return false;
      if (inventoryTab === 'Вторичный' && item.marketType === 'PRIMARY_DEVELOPER') return false;
      if (sellerFilter !== 'all' && item.sellerType !== sellerFilter) return false;
      if (roomsFilter !== 'all' && item.rooms !== Number(roomsFilter)) return false;
      if (priceFrom !== null && item.priceUzs < priceFrom * 1_000_000) return false;
      if (priceTo !== null && item.priceUzs > priceTo * 1_000_000) return false;
      if (areaFrom !== null && item.areaSqm < areaFrom) return false;
      if (areaTo !== null && item.areaSqm > areaTo) return false;
      if (floorFrom !== null && item.floorNumber < floorFrom) return false;
      if (floorTo !== null && item.floorNumber > floorTo) return false;
      if (verifiedOnly && !item.sellerVerified) return false;
      return true;
    });
  }, [data?.listings, inventoryTab, sellerFilter, roomsFilter, minPrice, maxPrice, minArea, maxArea, minFloor, maxFloor, verifiedOnly]);

  const priceChart = useMemo(() => {
    const history = data?.priceHistory ?? [];
    if (history.length === 0) return null;
    const values = history.map((item) => item.pricePerSqm);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = Math.max(maximum - minimum, maximum * 0.04, 1);
    const points = history.map((item, index) => ({
      ...item,
      x: history.length === 1 ? 300 : 18 + (index / (history.length - 1)) * 564,
      y: 150 - ((item.pricePerSqm - minimum) / range) * 118,
    }));
    const change = history.length > 1 ? ((values.at(-1)! - values[0]) / values[0]) * 100 : 0;
    return { points, minimum, maximum, change, line: points.map((point) => `${point.x},${point.y}`).join(' ') };
  }, [data?.priceHistory]);

  const resetInventoryFilters = () => {
    setSellerFilter('all'); setRoomsFilter('all'); setMinPrice(''); setMaxPrice('');
    setMinArea(''); setMaxArea(''); setMinFloor(''); setMaxFloor(''); setVerifiedOnly(false);
  };

  const shareComplex = async () => {
    const shareData = { title: data?.summary.name ?? 'EstateHub', url: window.location.href };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(window.location.href);
  };

  const renderHeader = () => (
    <header className="detail-header">
      <Link className="catalog-brand" href="/"><span><Building2 /></span>Estate<em>Hub</em></Link>
      <nav><Link href="/catalog?market=all">Купить</Link><Link href="/catalog?market=primary">Новостройки</Link><Link href="/catalog?market=secondary">Вторичный рынок</Link></nav>
      <div><Link href="/profile" aria-label="Уведомления"><Bell /></Link><Link href="/profile" aria-label="Личный кабинет"><UserRound /></Link></div>
    </header>
  );

  if (loading) return <main className="complex-page">{renderHeader()}<div className="detail-shell"><output className="catalog-state detail-state"><span className="catalog-loader" /><span><strong>Загружаем жилой комплекс</strong><small>Проверяем квартиры, цены и продавцов.</small></span></output></div></main>;
  if (error || !data) return <main className="complex-page">{renderHeader()}<div className="detail-shell"><div className="catalog-state detail-state error-state"><div><strong>Жилой комплекс недоступен</strong><p>{error ?? 'Объект не найден.'}</p></div><Button variant="outline" onClick={retry}>Попробовать снова</Button><Button nativeButton={false} render={<Link href="/catalog" />}>Вернуться в каталог</Button></div></div></main>;

  const { summary, description, listings, gallery, buildings, features, documents, similarComplexes } = data;
  const images = gallery.length > 0 ? gallery : [summary.image];
  const primaryCount = listings.filter((item) => item.marketType === 'PRIMARY_DEVELOPER').length;
  const secondaryCount = listings.length - primaryCount;
  const firstPrimaryListing = listings.find((listing) => listing.marketType === 'PRIMARY_DEVELOPER');
  const totalFloors = Math.max(...buildings.map((building) => building.totalFloors), ...listings.map((listing) => listing.totalFloors), 1);
  const amenities = features.filter((feature) => feature.category === 'amenity');
  const infrastructure = features.filter((feature) => feature.category === 'infrastructure');

  return (
    <main className="complex-page">
      {renderHeader()}
      <div className="detail-shell">
        <div className="breadcrumbs"><Link href="/"><Home /></Link><span>/</span><Link href="/catalog">{summary.city}</Link><span>/</span><Link href={`/catalog?q=${encodeURIComponent(summary.district)}`}>{summary.district}</Link><span>/</span><strong>{summary.name}</strong></div>
        <Link className="mobile-detail-back" href="/catalog"><ArrowLeft /> Вернуться к поиску</Link>

        <section className="detail-title">
          <div>
            <div className="detail-badges">{summary.featured && <Badge><Sparkles /> Выбор EstateHub</Badge>}<Badge variant="secondary"><ShieldCheck /> Проверенный ЖК</Badge></div>
            <h1>{summary.name}</h1>
            <p><MapPin /> {summary.city}, {summary.district}, {summary.address} · <a href="#location">Показать на карте</a></p>
          </div>
          <div className="detail-title-actions"><button className={isFavorite(summary.id) ? 'active' : ''} type="button" onClick={() => void toggleFavorite({ id: summary.id, slug: summary.slug, name: summary.name, image: summary.image, price_from: summary.priceFrom, available_units: summary.availableUnits, completion_label: summary.completionLabel })}><Heart /> <span>{isFavorite(summary.id) ? 'В избранном' : 'В избранное'}</span></button><WatchlistDialog name={summary.name} subscription={watchlist.find('complex', summary.id)} processing={watchlist.processing} onSave={(settings) => watchlist.save('complex', summary.id, settings)} onRemove={() => watchlist.remove('complex', summary.id)} trigger={<button className={watchlist.find('complex', summary.id) ? 'watching' : ''} type="button"><BellRing /> <span>{watchlist.find('complex', summary.id) ? 'Подписка активна' : 'Следить'}</span></button>} /><button type="button" onClick={shareComplex}><Share2 /> <span>Поделиться</span></button></div>
        </section>

        <section className="detail-gallery">
          <div className="gallery-main"><NextImage src={images[activeImage] ?? images[0]} width={1200} height={700} unoptimized alt={`${summary.name} — основное фото`} priority /><button type="button" onClick={() => setActiveImage((current) => (current + 1) % images.length)}><Maximize2 /> Следующее фото · {activeImage + 1}/{images.length}</button></div>
          <div className="gallery-side">{images.slice(1, 4).map((image, index) => <button type="button" onClick={() => setActiveImage(index + 1)} key={image}><NextImage src={image} width={480} height={300} unoptimized alt={`${summary.name} — фото ${index + 2}`} />{index === 2 && images.length > 4 ? <span>+{images.length - 4}</span> : null}</button>)}</div>
        </section>

        <section className="detail-overview-grid">
          <div className="detail-main-column">
            <section className="overview-card">
              <div className="overview-header"><div><span>О жилом комплексе</span><h2>Главное о проекте</h2></div><Badge variant="secondary"><CheckCircle2 /> {summary.completionLabel}</Badge></div>
              <p>{description}</p>
              <div className="overview-facts"><div><strong>{buildings.length}</strong><span>корпуса</span></div><div><strong>{totalFloors}</strong><span>этажей максимум</span></div><div><strong>{summary.complexVerified ? 'Да' : 'Нет'}</strong><span>проверен EstateHub</span></div><div><strong>{summary.availableUnits}</strong><span>в продаже</span></div><div><strong>{primaryCount}/{secondaryCount}</strong><span>первичка / вторичка</span></div></div>
            </section>

            <section className="detail-section-card complex-buildings-section">
              <div className="complex-section-heading"><div><span>Состав проекта</span><h2>Корпуса и сроки сдачи</h2></div><small>Данные застройщика и реестра предложений</small></div>
              <div className="complex-building-grid">{buildings.map((building) => <article key={building.id}><span><Building2 /></span><div><strong>{building.name}</strong><p>{building.totalFloors} этажей · {building.sectionsCount} секция</p><small>{building.availableUnits > 0 ? `${building.availableUnits} квартир в наличии` : 'Предложений сейчас нет'}</small></div><Badge variant="secondary">{building.completionStatus === 'completed' ? 'Сдан' : 'Строится'}</Badge></article>)}</div>
            </section>

            <section className="detail-section-card complex-location-section" id="location">
              <div className="complex-location-copy"><span>Расположение</span><h2>{summary.district}, {summary.city}</h2><p><MapPin /> {summary.address}</p><small>Метка показывает точное положение жилого комплекса. Масштаб карты можно менять.</small></div>
              <div className="complex-location-map"><ComplexMap items={[summary]} selectedId={summary.id} onSelect={ignoreMapSelection} /></div>
            </section>

            <section className="complex-feature-grid">
              <article className="detail-section-card"><div className="complex-section-heading"><div><span>На территории</span><h2>Удобства</h2></div><Car /></div><div className="complex-feature-list">{amenities.map((feature) => <div key={feature.id}><span><CheckCircle2 /></span><div><strong>{feature.name}</strong><small>{feature.detail}</small></div></div>)}</div></article>
              <article className="detail-section-card"><div className="complex-section-heading"><div><span>Рядом с домом</span><h2>Инфраструктура</h2></div><School /></div><div className="complex-feature-list">{infrastructure.map((feature, index) => <div key={feature.id}><span>{index === infrastructure.length - 1 ? <Trees /> : <MapPin />}</span><div><strong>{feature.name}</strong><small>{feature.detail}</small></div></div>)}</div></article>
            </section>

            <section className="detail-section-card complex-documents-section">
              <div className="complex-section-heading"><div><span>Юридическая прозрачность</span><h2>Документы проекта</h2></div><ShieldCheck /></div>
              <div className="complex-document-list">{documents.map((document) => <article key={document.id}><span><FileText /></span><div><strong>{document.title}</strong><small>{document.url ? 'Официальная копия' : 'Копия доступна по запросу'}</small></div>{document.url ? <a href={document.url} target="_blank" rel="noreferrer">Открыть</a> : <em><CheckCircle2 /> Проверено</em>}</article>)}</div>
            </section>

            <section className="inventory-section" id="inventory">
              <div className="inventory-heading"><div><span>Доступные предложения</span><h2>Квартиры в {summary.name}</h2><p>{inventory.length} из {listings.length} предложений подходят под условия</p></div><a href="#inventory-filters"><SlidersHorizontal /> Фильтры квартир</a></div>
              <div className="inventory-tabs">{(['Все', 'Первичный', 'Вторичный'] as const).map((tab) => <button type="button" className={inventoryTab === tab ? 'active' : ''} onClick={() => setInventoryTab(tab)} key={tab}>{tab} {tab === 'Все' ? listings.length : tab === 'Первичный' ? primaryCount : secondaryCount}</button>)}</div>
              <div className="inventory-filter-panel" id="inventory-filters">
                <div className="inventory-filter-title"><span><SlidersHorizontal /> Уточнить выбор</span><button type="button" onClick={resetInventoryFilters}><RotateCcw /> Сбросить</button></div>
                <div className="inventory-filter-grid">
                  <label><span>Продавец</span><select value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value as 'all' | SellerType)}><option value="all">Любой</option><option value="developer">Застройщик</option><option value="owner">Собственник</option><option value="agency">Агентство</option></select></label>
                  <label><span>Комнат</span><select value={roomsFilter} onChange={(event) => setRoomsFilter(event.target.value)}><option value="all">Любое</option>{[1, 2, 3, 4].map((rooms) => <option value={rooms} key={rooms}>{rooms}</option>)}</select></label>
                  <div><span>Цена, млн сум</span><div><input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} inputMode="decimal" placeholder="от" aria-label="Минимальная цена, млн сум" /><input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} inputMode="decimal" placeholder="до" aria-label="Максимальная цена, млн сум" /></div></div>
                  <div><span>Площадь, м²</span><div><input value={minArea} onChange={(event) => setMinArea(event.target.value)} inputMode="decimal" placeholder="от" aria-label="Минимальная площадь" /><input value={maxArea} onChange={(event) => setMaxArea(event.target.value)} inputMode="decimal" placeholder="до" aria-label="Максимальная площадь" /></div></div>
                  <div><span>Этаж</span><div><input value={minFloor} onChange={(event) => setMinFloor(event.target.value)} inputMode="numeric" placeholder="от" aria-label="Минимальный этаж" /><input value={maxFloor} onChange={(event) => setMaxFloor(event.target.value)} inputMode="numeric" placeholder="до" aria-label="Максимальный этаж" /></div></div>
                  <label className="verified-filter"><input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} /><span><ShieldCheck /> Только проверенные продавцы</span></label>
                </div>
              </div>
              {inventory.length > 0 ? <div className="listing-stack">{inventory.map((listing) => (
                <article className="listing-row" key={listing.id}>
                  <div className="plan-preview"><div><span>{listing.rooms}</span><i /><i /><i /></div><small>№ {listing.unitNumber}</small></div>
                  <div className="listing-info"><div>{listing.promoted && <Badge className="sponsored-badge"><Sparkles /> {listing.sponsoredLabel}</Badge>}<Badge variant={listing.marketType === 'PRIMARY_DEVELOPER' ? 'default' : 'secondary'}>{listing.marketType === 'PRIMARY_DEVELOPER' ? 'Первичный' : 'Вторичный'}</Badge></div><h3><Link href={`/listing/${listing.id}`}>{listing.rooms}-комнатная квартира, {listing.areaSqm} м²</Link></h3><p>{listing.floorNumber} / {listing.totalFloors} этаж · {listing.finish}</p><span><ShieldCheck /> {sellerLabels[listing.sellerType]} · {listing.seller}</span></div>
                  <div className="listing-price"><strong>{formatPriceMillions(listing.priceUzs)} сум</strong><span>{formatPricePerSqm(Math.round(listing.priceUzs / listing.areaSqm))}</span><small>В наличии · цена из реестра</small></div>
                  <div className="listing-actions"><Link className="listing-details-link" href={`/listing/${listing.id}`}>Подробнее <ArrowRight /></Link><Button variant="outline" size="sm" onClick={() => void toggleComparison(listing.id)}><Scale /> {isCompared(listing.id) ? 'В сравнении' : 'Сравнить'}</Button>{listing.reserveEnabled ? <ReservationDialog listingId={listing.id} unitNumber={listing.unitNumber} trigger={<Button size="sm" />} /> : listing.marketType === 'PRIMARY_DEVELOPER' ? <LeadRequestDialog type="consultation" complexId={summary.id} complexName={summary.name} listingId={listing.id} unitNumber={listing.unitNumber} trigger={<Button variant="outline" size="sm"><Eye /> Консультация</Button>} /> : <ChatDialog listingId={listing.id} complexName={summary.name} unitNumber={listing.unitNumber} seller={listing.seller} trigger={<Button variant="outline" size="sm"><MessageCircle /> Продавцу</Button>} />}</div>
                </article>
              ))}</div> : <div className="inventory-empty"><Search /><strong>Нет квартир по этим условиям</strong><p>Измените диапазон или сбросьте фильтры — исходные предложения останутся на странице.</p><Button variant="outline" onClick={resetInventoryFilters}>Сбросить фильтры</Button></div>}
            </section>

            {comparisonItems.length > 0 && <Link className="compare-mini-bar" href="/compare"><Scale /> В сравнении: {comparisonItems.length} из 4 квартир <span>Открыть</span></Link>}
            <section className="price-history-card">
              <div><span>Прозрачность цены</span><h2>История стоимости за м²</h2><p>Средняя цена активных объявлений по данным реестра EstateHub</p></div>
              {priceChart ? <><div className="complex-chart-summary"><div><small>Сейчас</small><strong>{formatPricePerSqm(priceChart.points.at(-1)!.pricePerSqm)}</strong></div><span className={priceChart.change >= 0 ? 'up' : 'down'}>{priceChart.change >= 0 ? '+' : ''}{priceChart.change.toFixed(1)}% за период</span></div><div className="price-chart complex-price-chart" aria-label={`История стоимости: сейчас ${formatPricePerSqm(priceChart.points.at(-1)!.pricePerSqm)}`}><div className="chart-y-labels"><span>{formatPriceMillions(priceChart.maximum)}</span><span>{formatPriceMillions((priceChart.maximum + priceChart.minimum) / 2)}</span><span>{formatPriceMillions(priceChart.minimum)}</span></div><svg viewBox="0 0 600 170" aria-label="График истории средней цены за квадратный метр"><title>История средней цены за квадратный метр</title><defs><linearGradient id="complexLineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a66ed" stopOpacity=".24" /><stop offset="1" stopColor="#2a66ed" stopOpacity="0" /></linearGradient></defs><polygon points={`${priceChart.line} 582,166 18,166`} fill="url(#complexLineFill)" /><polyline points={priceChart.line} fill="none" stroke="#2a66ed" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{priceChart.points.map((point) => <circle key={point.period} cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#2a66ed" strokeWidth="3"><title>{formatPeriod(point.period)}: {formatPricePerSqm(point.pricePerSqm)}</title></circle>)}</svg><div className="chart-x-labels">{priceChart.points.map((point) => <span key={point.period}>{formatPeriod(point.period)}</span>)}</div></div></> : <div className="inventory-empty"><FileText /><strong>История пока формируется</strong><p>График появится после первого подтверждённого изменения цены.</p></div>}
            </section>

            <ComplexReviews complexId={summary.id} complexName={summary.name} />
            {similarComplexes.length > 0 && <section className="detail-section-card similar-complexes-section"><div className="complex-section-heading"><div><span>Можно сравнить</span><h2>Похожие жилые комплексы</h2></div><Link href="/catalog">Все ЖК <ArrowRight /></Link></div><div className="similar-complex-grid">{similarComplexes.map((complex) => <Link href={`/complex/${complex.slug}`} key={complex.id}><NextImage src={complex.image} width={420} height={250} unoptimized alt={complex.name} /><div><span>{complex.completionLabel}</span><h3>{complex.name}</h3><p>{complex.district} · {complex.availableUnits} квартир</p><strong>от {formatPriceMillions(complex.priceFrom)} сум</strong></div></Link>)}</div></section>}
          </div>

          <aside className="detail-rail">
            <div className="price-card"><span>Квартиры</span><strong>от {formatPriceMillions(summary.priceFrom)} сум</strong><p>от {formatPricePerSqm(summary.pricePerSqmFrom)}</p><a href="#inventory">Выбрать квартиру <ArrowRight /></a></div>
            <div className="developer-card"><div className="developer-card-head"><span>{summary.developer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><h3>{summary.developer}</h3><p><ShieldCheck /> Проверенный застройщик</p></div></div><div className="developer-stats"><span><strong>Проверен</strong>статус</span><span><strong>{summary.availableUnits}</strong>квартир</span><span><strong>{summary.rating.toFixed(1)}</strong>рейтинг</span></div><LeadRequestDialog type="consultation" complexId={summary.id} complexName={summary.name} trigger={<Button className="developer-message" variant="outline"><MessageCircle /> Получить консультацию</Button>} /></div>
            <div className="viewing-card"><span><CalendarDays /></span><h3>Записаться на просмотр</h3><p>Выберите дату и время — менеджер подтвердит визит.</p><div aria-label="Доступность записи"><span>1 день<br /><strong>Ближайший</strong></span><span className="active">30 дней<br /><strong>Доступно</strong></span><span>5 слотов<br /><strong>В день</strong></span></div>{firstPrimaryListing ? <LeadRequestDialog type="viewing" complexId={summary.id} complexName={summary.name} listingId={firstPrimaryListing.id} unitNumber={firstPrimaryListing.unitNumber} trigger={<Button>Выбрать время</Button>} /> : <Button disabled>Нет первичных квартир</Button>}</div>
            <div className="rating-card"><div><strong>{summary.rating.toFixed(1)}</strong><span><Star /><Star /><Star /><Star /><Star /></span><small>Проверенный рейтинг</small></div><p>Качество строительства <span>{Math.max(summary.rating - 0.1, 0).toFixed(1)}</span></p><p>Расположение <span>{Math.min(summary.rating + 0.1, 5).toFixed(1)}</span></p><p>Инфраструктура <span>{summary.rating.toFixed(1)}</span></p><a href="#reviews">Читать отзывы и оценки</a></div>
          </aside>
        </section>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация"><Link href="/"><Home /><span>Главная</span></Link><Link className="active" href="/catalog"><Search /><span>Поиск</span></Link><Link href="/profile"><Heart /><span>Избранное</span></Link><Link href="/profile"><MessageCircle /><span>Сообщения</span></Link><Link href="/profile"><UserRound /><span>Профиль</span></Link></nav>
    </main>
  );
}
