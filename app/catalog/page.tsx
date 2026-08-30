'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  Heart,
  Home,
  ListFilter,
  Map,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InternalLink as Link } from '@/components/internal-link';
import { MarketplaceHeader } from '@/components/marketplace-header';
import { useComplexes } from '@/hooks/use-complexes';
import { useFavorites } from '@/hooks/use-favorites';
import type { ComplexSummary, SellerType } from '@/lib/marketplace';
import { formatPriceMillions, marketLabel } from '@/lib/marketplace';

const marketContext = {
  'Все': {
    label: 'Купить',
    title: 'Все варианты покупки в одном каталоге',
    description: 'Новостройки от проверенных застройщиков и квартиры собственников на вторичном рынке.',
  },
  'Первичный': {
    label: 'Новостройки',
    title: 'Квартиры напрямую от застройщиков',
    description: 'Смотрите готовые и строящиеся комплексы, сроки сдачи и возможность онлайн-бронирования.',
  },
  'Вторичный': {
    label: 'Вторичный рынок',
    title: 'Готовые квартиры от владельцев и агентств',
    description: 'Сравнивайте предложения в сданных домах, состояние квартиры и историю актуальной цены.',
  },
} as const;

const marketValue = (market: string): 'all' | 'primary' | 'secondary' => market === 'Первичный' ? 'primary' : market === 'Вторичный' ? 'secondary' : 'all';

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const initialMarket = searchParams.get('market');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [activeMarket, setActiveMarket] = useState(() => initialMarket === 'primary' ? 'Первичный' : initialMarket === 'secondary' ? 'Вторичный' : 'Все');
  const { has: isFavorite, toggle: toggleFavorite } = useFavorites();
  const [selected, setSelected] = useState<ComplexSummary | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [rooms, setRooms] = useState<number | undefined>();
  const [status, setStatus] = useState<'completed' | 'under_construction' | undefined>();
  const [seller, setSeller] = useState<SellerType | undefined>();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [minFloor, setMinFloor] = useState('');
  const [maxFloor, setMaxFloor] = useState('');
  const [district, setDistrict] = useState('');
  const [finish, setFinish] = useState('');
  const [removedAiFilters, setRemovedAiFilters] = useState<string[]>([]);
  const [verified, setVerified] = useState(true);
  const [reservable, setReservable] = useState(false);
  const [sort, setSort] = useState<'recommended' | 'price_asc' | 'price_desc' | 'newest'>('recommended');
  const [saveMessage, setSaveMessage] = useState('');

  const request = useMemo(() => ({
    market: marketValue(activeMarket),
    q: search.trim() || undefined,
    rooms,
    status,
    seller,
    minPrice: minPrice ? Number(minPrice) * 1_000_000 : undefined,
    maxPrice: maxPrice ? Number(maxPrice) * 1_000_000 : undefined,
    minArea: minArea ? Number(minArea) : undefined,
    maxArea: maxArea ? Number(maxArea) : undefined,
    minFloor: minFloor ? Number(minFloor) : undefined,
    maxFloor: maxFloor ? Number(maxFloor) : undefined,
    district: district || undefined,
    finish: finish || undefined,
    excludeParsed: removedAiFilters.join(',') || undefined,
    verified,
    reservable,
    sort,
    surface: 'search',
  }), [activeMarket, district, finish, maxArea, maxFloor, maxPrice, minArea, minFloor, minPrice, removedAiFilters, reservable, rooms, search, seller, sort, status, verified]);
  const { data: catalog, loading, error, retry } = useComplexes(request);
  const filtered = catalog.items;

  const activeSelection = filtered.find((item) => item.id === selected?.id) ?? filtered[0] ?? null;

  const selectMarket = (nextMarket: string) => {
    setActiveMarket(nextMarket);
    const params = new URLSearchParams(window.location.search);
    params.set('market', marketValue(nextMarket));
    if (search.trim()) params.set('q', search.trim()); else params.delete('q');
    window.history.replaceState({}, '', `/catalog?${params.toString()}`);
  };

  const saveSearch = async () => {
    setSaveMessage('Сохраняем…');
    const name = search.trim() || `${activeMarket}: ${rooms ? `${rooms} комн.` : 'все квартиры'}`;
    const response = await fetch('/api/buyer/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, filters: request }) });
    const payload = await response.json() as { message?: string };
    setSaveMessage(response.ok ? 'Поиск сохранён' : (payload.message ?? 'Не удалось сохранить'));
  };

  const resetFilters = () => {
    setRooms(undefined);
    setStatus(undefined);
    setSeller(undefined);
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setMinFloor('');
    setMaxFloor('');
    setDistrict('');
    setFinish('');
    setRemovedAiFilters([]);
    setVerified(true);
    setReservable(false);
    setSort('recommended');
  };

  const context = marketContext[activeMarket as keyof typeof marketContext];
  const examples = filtered.slice(0, 2);
  const activeHeaderSection = marketValue(activeMarket);

  return (
    <main className="catalog-page">
      <MarketplaceHeader active={activeHeaderSection} />

      <section className="catalog-toolbar">
        <div className="catalog-search">
          <Search />
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setRemovedAiFilters([]); }} placeholder="ЖК, район или запрос на обычном языке" aria-label="Поиск по каталогу" />
          <span><Bot /> AI</span>
        </div>
        <div className="market-quick-tabs" aria-label="Тип рынка">
          {['Все', 'Первичный', 'Вторичный'].map((item) => <button type="button" className={activeMarket === item ? 'active' : ''} key={item} onClick={() => selectMarket(item)}>{item}</button>)}
        </div>
        <button className="mobile-filter-trigger" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal /> Фильтры</button>
        <div className="catalog-view-switcher">
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><Building2 /> Каталог</button>
          <button type="button" className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}><Map /> Карта</button>
        </div>
      </section>

      <div className="catalog-layout">
        <aside className={`filter-sidebar ${filtersOpen ? 'mobile-open' : ''}`}>
          <div className="filter-sidebar-heading">
            <div><ListFilter /><strong>Фильтры</strong></div>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Закрыть фильтры"><X /></button>
          </div>
          <div className="active-ai-filter"><Bot /><div><span>{search ? 'AI понял ваш запрос' : 'AI-поиск готов'}</span>{search ? <div className="ai-filter-chips">{catalog.parsedFilters.length ? catalog.parsedFilters.map((filter) => <button type="button" key={filter.key} onClick={() => setRemovedAiFilters((current) => [...current, filter.key])}>{filter.label}<X /></button>) : <strong>Поиск: {search}</strong>}</div> : <strong>Опишите квартиру обычным языком</strong>}{catalog.unsupportedCriteria.length > 0 && <small>Пока не учитываем: {catalog.unsupportedCriteria.join(', ')}</small>}{catalog.validationWarnings.map((warning) => <small className="ai-validation-warning" key={warning}>{warning}</small>)}</div></div>
          <div className="price-filter">
            <span className="price-filter-label">Цена, сум</span>
            <div><Input inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ''))} placeholder="от 450 млн" aria-label="Минимальная цена в миллионах сум" /><Input inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ''))} placeholder="до 900 млн" aria-label="Максимальная цена в миллионах сум" /></div>
            <span><i /><i /></span>
          </div>
          <fieldset className="filter-group">
            <legend>Комнаты</legend>
            <div><button className={rooms === undefined ? 'active' : ''} type="button" onClick={() => setRooms(undefined)}>Все</button>{[1, 2, 3, 4].map((option) => <button className={rooms === option ? 'active' : ''} type="button" key={option} onClick={() => setRooms(option)}>{option === 4 ? '4+' : option}</button>)}</div>
          </fieldset>
          <fieldset className="filter-group">
            <legend>Состояние</legend>
            <div><button className={status === undefined ? 'active' : ''} type="button" onClick={() => setStatus(undefined)}>Все</button><button className={status === 'completed' ? 'active' : ''} type="button" onClick={() => setStatus('completed')}>Сдан</button><button className={status === 'under_construction' ? 'active' : ''} type="button" onClick={() => setStatus('under_construction')}>Строится</button></div>
          </fieldset>
          <fieldset className="filter-group">
            <legend>Продавец</legend>
            <div><button className={seller === undefined ? 'active' : ''} type="button" onClick={() => setSeller(undefined)}>Все</button><button className={seller === 'developer' ? 'active' : ''} type="button" onClick={() => setSeller('developer')}>Застройщик</button><button className={seller === 'owner' ? 'active' : ''} type="button" onClick={() => setSeller('owner')}>Владелец</button><button className={seller === 'agency' ? 'active' : ''} type="button" onClick={() => setSeller('agency')}>Агентство</button></div>
          </fieldset>
          <fieldset className="filter-group filter-input-group">
            <legend>Район и отделка</legend>
            <select value={district} onChange={(event) => setDistrict(event.target.value)} aria-label="Район"><option value="">Все районы</option>{['Боғишамол', 'Регистан', 'Сиёб', 'Саттепо', 'Центр', 'Конигил'].map((item) => <option key={item}>{item}</option>)}</select>
            <select value={finish} onChange={(event) => setFinish(event.target.value)} aria-label="Отделка"><option value="">Любая отделка</option><option>С ремонтом</option><option>Чистовая</option><option>Предчистовая</option></select>
          </fieldset>
          <fieldset className="filter-group filter-input-group">
            <legend>Площадь, м²</legend><div><Input inputMode="decimal" value={minArea} onChange={(event) => setMinArea(event.target.value.replace(/[^\d.]/g, ''))} placeholder="от" /><Input inputMode="decimal" value={maxArea} onChange={(event) => setMaxArea(event.target.value.replace(/[^\d.]/g, ''))} placeholder="до" /></div>
          </fieldset>
          <fieldset className="filter-group filter-input-group">
            <legend>Этаж</legend><div><Input inputMode="numeric" value={minFloor} onChange={(event) => setMinFloor(event.target.value.replace(/\D/g, ''))} placeholder="от" /><Input inputMode="numeric" value={maxFloor} onChange={(event) => setMaxFloor(event.target.value.replace(/\D/g, ''))} placeholder="до" /></div>
          </fieldset>
          <label className="filter-check"><input checked={verified} onChange={(event) => setVerified(event.target.checked)} type="checkbox" /><span><Check /></span> Только проверенные</label>
          <label className="filter-check"><input checked={reservable} onChange={(event) => setReservable(event.target.checked)} type="checkbox" /><span><Check /></span> Онлайн-бронирование</label>
          <Button className="apply-filters" onClick={() => setFiltersOpen(false)}>Показать {catalog.total} комплексов</Button>
          <button className="clear-filters" type="button" onClick={resetFilters}>Сбросить фильтры</button>
        </aside>

        <section className="catalog-results">
          <div className="catalog-results-heading">
            <div><span>Самарканд</span><h1>{loading ? 'Ищем предложения…' : `${catalog.total} жилых комплексов`}</h1>{saveMessage && <small className="saved-search-message">{saveMessage}</small>}</div>
            <Button variant="outline" size="sm" onClick={saveSearch}>Сохранить поиск</Button>
            <label className="catalog-sort"><span className="sr-only">Сортировка</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recommended">Сначала рекомендуемые</option><option value="price_asc">Сначала дешевле</option><option value="price_desc">Сначала дороже</option><option value="newest">Сначала новые</option></select></label>
          </div>

          <section className="market-context-card" aria-label={`Примеры раздела ${context.label}`}>
            <div>
              <Badge variant="secondary">Раздел: {context.label}</Badge>
              <h2>{context.title}</h2>
              <p>{context.description}</p>
            </div>
            <div className="market-context-examples">
              {examples.map((item, index) => (
                <article key={item.id}>
                  <img src={item.image} alt="" />
                  <div><small>Пример {index + 1}</small><strong>{item.name}</strong><span>{marketLabel(item.marketTypes)} · от {formatPriceMillions(item.priceFrom)} сум</span></div>
                </article>
              ))}
            </div>
          </section>

          {loading ? <output className="catalog-state"><span className="catalog-loader" /><span><strong>Проверяем актуальные объявления</strong><small>Применяем выбранные фильтры к опубликованным квартирам.</small></span></output> : error ? <div className="catalog-state error-state"><div><strong>Не удалось загрузить результаты</strong><p>{error}</p></div><Button variant="outline" onClick={retry}>Попробовать снова</Button></div> : filtered.length === 0 ? <section className="ai-alternatives"><div className="ai-alternatives-heading"><span><Sparkles /></span><div><strong>Точных совпадений нет</strong><p>{catalog.alternativeReason ?? 'Сбросьте часть фильтров или измените формулировку запроса.'}</p></div><Button variant="outline" size="sm" onClick={resetFilters}>Сбросить</Button></div>{catalog.alternatives.length > 0 && <div>{catalog.alternatives.map((item) => <Link href={`/complex/${item.slug}`} key={item.id}><img src={item.image} alt=""/><span><strong>{item.name}</strong><small>{item.district} · от {formatPriceMillions(item.priceFrom)} сум</small></span><ArrowRight /></Link>)}</div>}</section> : view === 'list' ? (
            <div className="result-grid">
              {filtered.map((item) => (
                <article className="result-card" key={item.id}>
                  <div className="result-card-image">
                    <img src={item.image} alt={item.name} />
                    {item.sponsored ? <Badge className="sponsored-badge"><Sparkles /> {item.sponsoredLabel}</Badge> : <Badge>{marketLabel(item.marketTypes)}</Badge>}
                    <button className={isFavorite(item.id) ? 'active' : ''} onClick={() => void toggleFavorite({ id: item.id, slug: item.slug, name: item.name, image: item.image, price_from: item.priceFrom, available_units: item.availableUnits, completion_label: item.completionLabel })} type="button" aria-label="Добавить в избранное"><Heart /></button>
                  </div>
                  <div className="result-card-body">
                    <div className="result-title-row"><div><h2>{item.name}</h2><p><MapPin /> {item.city}, {item.district}</p></div><span>{item.rating.toFixed(1)} ★</span></div>
                    <p className="verified-line"><ShieldCheck /> Проверенный застройщик</p>
                    <div className="result-facts"><span>{item.minRooms === item.maxRooms ? item.minRooms : `${item.minRooms}–${item.maxRooms}`} комн.</span><span>{item.availableUnits} квартир</span><span>{item.completionLabel}</span></div>
                    {item.reservable && <p className="reservation-available"><Check /> Доступно онлайн-бронирование</p>}
                    <div className="result-card-footer"><strong>от {formatPriceMillions(item.priceFrom)} сум</strong><Link href={`/complex/${item.slug}`}>Подробнее <ArrowRight /></Link></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="map-surface">
              <div className="map-label map-label-1">САМАРКАНД</div>
              <div className="map-road road-1" /><div className="map-road road-2" /><div className="map-road road-3" /><div className="map-river" />
              {filtered.map((item) => <button key={item.id} type="button" className={`price-marker ${activeSelection?.id === item.id ? 'selected' : ''}`} style={{ left: `${item.mapX}%`, top: `${item.mapY}%` }} onClick={() => setSelected(item)}>{formatPriceMillions(item.priceFrom)}</button>)}
              {activeSelection && <div className="map-card">
                <img src={activeSelection.image} alt={activeSelection.name} />
                <div><Badge>{marketLabel(activeSelection.marketTypes)}</Badge><h2>{activeSelection.name}</h2><p><MapPin /> {activeSelection.district}</p><strong>от {formatPriceMillions(activeSelection.priceFrom)} сум</strong><Link href={`/complex/${activeSelection.slug}`}>Открыть комплекс <ArrowRight /></Link></div>
              </div>}
              <div className="map-controls"><button type="button">+</button><button type="button">−</button></div>
            </div>
          )}
        </section>
      </div>

      {filtersOpen && <button type="button" className="filter-backdrop" aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)} />}
      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
        <Link href="/"><Home /><span>Главная</span></Link><Link className="active" href="/catalog"><Search /><span>Поиск</span></Link><Link href="/profile"><Heart /><span>Избранное</span></Link><Link href="/profile"><MessageCircle /><span>Сообщения</span></Link><Link href="/profile"><UserRound /><span>Профиль</span></Link>
      </nav>
    </main>
  );
}
