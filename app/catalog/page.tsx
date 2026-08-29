'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  Building2,
  Check,
  ChevronDown,
  Heart,
  Home,
  ListFilter,
  Map,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const results = [
  { id: 1, name: 'Bog‘ishamol Residence', location: 'Боғишамол', price: 'от 620 млн', units: 28, rooms: '1–4', status: 'Сдан', type: 'Первичный', verified: true, reserve: true, x: 54, y: 44, image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=86' },
  { id: 2, name: 'Registan Gardens', location: 'Регистан', price: 'от 745 млн', units: 16, rooms: '2–4', status: 'IV кв. 2026', type: 'Первичный', verified: true, reserve: true, x: 37, y: 55, image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=86' },
  { id: 3, name: 'Silk Road Avenue', location: 'Сиёб', price: 'от 540 млн', units: 41, rooms: '1–3', status: 'II кв. 2027', type: 'Оба рынка', verified: true, reserve: false, x: 68, y: 27, image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=900&q=86' },
  { id: 4, name: 'Afrasiyob Park', location: 'Саттепо', price: 'от 810 млн', units: 12, rooms: '2–5', status: 'Сдан', type: 'Первичный', verified: true, reserve: true, x: 24, y: 34, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=86' },
  { id: 5, name: 'Samarkand City', location: 'Центр', price: 'от 930 млн', units: 19, rooms: '2–4', status: 'I кв. 2026', type: 'Оба рынка', verified: true, reserve: true, x: 47, y: 69, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=86' },
  { id: 6, name: 'Zarafshan Riverside', location: 'Конигил', price: 'от 575 млн', units: 22, rooms: '1–4', status: 'III кв. 2026', type: 'Вторичный', verified: true, reserve: false, x: 78, y: 62, image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=86' },
];

const filterGroups = [
  { title: 'Тип рынка', options: ['Все', 'Первичный', 'Вторичный'] },
  { title: 'Комнаты', options: ['1', '2', '3', '4+'] },
  { title: 'Состояние', options: ['Сдан', 'Строится'] },
  { title: 'Продавец', options: ['Застройщик', 'Владелец', 'Агентство'] },
];

export default function CatalogPage() {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [activeMarket, setActiveMarket] = useState('Все');
  const [favorites, setFavorites] = useState<number[]>([3]);
  const [selected, setSelected] = useState(results[0]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return results.filter((item) => {
      const marketMatch = activeMarket === 'Все' || item.type.includes(activeMarket) || item.type === 'Оба рынка';
      const queryMatch = !search || `${item.name} ${item.location}`.toLowerCase().includes(search.toLowerCase());
      return marketMatch && queryMatch;
    });
  }, [activeMarket, search]);

  const toggleFavorite = (id: number) => {
    setFavorites((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <Link className="catalog-back" href="/"><ArrowLeft /> На главную</Link>
        <Link className="catalog-brand" href="/"><span><Building2 /></span>Estate<em>Hub</em></Link>
        <div className="catalog-header-actions">
          <button type="button">RU <ChevronDown /></button>
          <button type="button" aria-label="Уведомления"><Bell /></button>
          <button type="button" aria-label="Профиль"><UserRound /></button>
        </div>
      </header>

      <section className="catalog-toolbar">
        <div className="catalog-search">
          <Search />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ЖК, район или запрос на обычном языке" aria-label="Поиск по каталогу" />
          <span><Bot /> AI</span>
        </div>
        <div className="market-quick-tabs" aria-label="Тип рынка">
          {['Все', 'Первичный', 'Вторичный'].map((item) => <button type="button" className={activeMarket === item ? 'active' : ''} key={item} onClick={() => setActiveMarket(item)}>{item}</button>)}
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
          <div className="active-ai-filter"><Bot /><div><span>AI понял ваш запрос</span><strong>до 900 млн · сдан · онлайн-бронь</strong></div></div>
          <div className="price-filter">
            <span className="price-filter-label">Цена, сум</span>
            <div><Input defaultValue="450 млн" aria-label="Минимальная цена" /><Input defaultValue="900 млн" aria-label="Максимальная цена" /></div>
            <span><i /><i /></span>
          </div>
          {filterGroups.map((group) => (
            <fieldset className="filter-group" key={group.title}>
              <legend>{group.title}</legend>
              <div>
                {group.options.map((option, index) => <button className={index === 0 && group.title !== 'Продавец' ? 'active' : ''} type="button" key={option}>{option}</button>)}
              </div>
            </fieldset>
          ))}
          <label className="filter-check"><input defaultChecked type="checkbox" /><span><Check /></span> Только проверенные</label>
          <label className="filter-check"><input defaultChecked type="checkbox" /><span><Check /></span> Онлайн-бронирование</label>
          <Button className="apply-filters" onClick={() => setFiltersOpen(false)}>Показать {filtered.length} комплексов</Button>
          <button className="clear-filters" type="button">Сбросить фильтры</button>
        </aside>

        <section className="catalog-results">
          <div className="catalog-results-heading">
            <div><span>Самарканд</span><h1>{filtered.length} жилых комплексов</h1></div>
            <button type="button">Сначала рекомендуемые <ChevronDown /></button>
          </div>

          {view === 'list' ? (
            <div className="result-grid">
              {filtered.map((item) => (
                <article className="result-card" key={item.id}>
                  <div className="result-card-image">
                    <img src={item.image} alt={item.name} />
                    <Badge>{item.type}</Badge>
                    <button className={favorites.includes(item.id) ? 'active' : ''} onClick={() => toggleFavorite(item.id)} type="button" aria-label="Добавить в избранное"><Heart /></button>
                  </div>
                  <div className="result-card-body">
                    <div className="result-title-row"><div><h2>{item.name}</h2><p><MapPin /> Самарканд, {item.location}</p></div><span>4.8 ★</span></div>
                    <p className="verified-line"><ShieldCheck /> Проверенный застройщик</p>
                    <div className="result-facts"><span>{item.rooms} комн.</span><span>{item.units} квартир</span><span>{item.status}</span></div>
                    {item.reserve && <p className="reservation-available"><Check /> Доступно онлайн-бронирование</p>}
                    <div className="result-card-footer"><strong>{item.price} сум</strong><Link href="/complex/bogishamol">Подробнее <ArrowRight /></Link></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="map-surface">
              <div className="map-label map-label-1">САМАРКАНД</div>
              <div className="map-road road-1" /><div className="map-road road-2" /><div className="map-road road-3" /><div className="map-river" />
              {filtered.map((item) => <button key={item.id} type="button" className={`price-marker ${selected.id === item.id ? 'selected' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setSelected(item)}>{item.price.replace('от ', '')}</button>)}
              <div className="map-card">
                <img src={selected.image} alt={selected.name} />
                <div><Badge>{selected.type}</Badge><h2>{selected.name}</h2><p><MapPin /> {selected.location}</p><strong>{selected.price} сум</strong><Link href="/complex/bogishamol">Открыть комплекс <ArrowRight /></Link></div>
              </div>
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
