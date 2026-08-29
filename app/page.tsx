'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Bot,
  Building2,
  Check,
  ChevronDown,
  Heart,
  Home,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InternalLink as Link } from '@/components/internal-link';

const complexes = [
  {
    id: 1,
    name: 'Bog‘ishamol Residence',
    district: 'Самарканд, Боғишамол',
    developer: 'Samarkand Development',
    price: 'от 620 млн сум',
    units: 28,
    readiness: 'Сдан',
    market: 'Первичный',
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=88',
    featured: true,
    reservable: true,
  },
  {
    id: 2,
    name: 'Registan Gardens',
    district: 'Самарканд, Регистан',
    developer: 'Zarafshan Group',
    price: 'от 745 млн сум',
    units: 16,
    readiness: 'IV кв. 2026',
    market: 'Первичный',
    image:
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=88',
    featured: false,
    reservable: true,
  },
  {
    id: 3,
    name: 'Silk Road Avenue',
    district: 'Самарканд, Сиёб',
    developer: 'Orient House',
    price: 'от 540 млн сум',
    units: 41,
    readiness: 'II кв. 2027',
    market: 'Первичный + вторичный',
    image:
      'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=88',
    featured: true,
    reservable: false,
  },
  {
    id: 4,
    name: 'Afrasiyob Park',
    district: 'Самарканд, Саттепо',
    developer: 'Imorat Invest',
    price: 'от 810 млн сум',
    units: 12,
    readiness: 'Сдан',
    market: 'Первичный',
    image:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=88',
    featured: false,
    reservable: true,
  },
];

const quickFilters = ['2 комнаты', 'до 900 млн', 'не первый этаж', 'сдан', 'онлайн-бронь'];

function BrandMark() {
  return (
    <a href="#top" className="brand" aria-label="EstateHub — главная">
      <span className="brand-mark" aria-hidden="true">
        <Building2 />
      </span>
      <span>Estate<span>Hub</span></span>
    </a>
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <BrandMark />
        <nav className="desktop-nav" aria-label="Основная навигация">
          <Link className="active" href="/catalog?market=all">Купить</Link>
          <Link href="/catalog?market=primary">Новостройки</Link>
          <Link href="/catalog?market=secondary">Вторичный рынок</Link>
          <a href="#how-it-works">Как это работает</a>
          <Link href="/developer">Для застройщиков</Link>
        </nav>
        <div className="header-actions">
          <button className="locale-button" type="button">RU <ChevronDown /></button>
          <button className="currency-button" type="button">UZS <ChevronDown /></button>
          <button className="icon-button desktop-only" type="button" aria-label="Избранное"><Heart /></button>
          <button className="icon-button desktop-only notification-button" type="button" aria-label="Уведомления"><Bell /><span /></button>
          <Link className="profile-button" href="/profile" aria-label="Личный кабинет"><UserRound /></Link>
          <button className="icon-button mobile-menu" type="button" aria-label="Открыть меню"><Menu /></button>
        </div>
      </div>
    </header>
  );
}

function ComplexCard({ complex, favorite, onFavorite }: {
  complex: (typeof complexes)[number];
  favorite: boolean;
  onFavorite: () => void;
}) {
  return (
    <article className="complex-card">
      <div className="card-image-wrap">
        <img src={complex.image} alt={`Жилой комплекс ${complex.name}`} />
        <div className="image-badges">
          {complex.featured && <Badge className="featured-badge"><Sparkles /> Выбор EstateHub</Badge>}
          <Badge className="market-badge" variant="secondary">{complex.market}</Badge>
        </div>
        <button
          type="button"
          className={`favorite-button ${favorite ? 'is-favorite' : ''}`}
          aria-label={favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Heart />
        </button>
        <div className="image-count">1 / 8</div>
      </div>
      <div className="card-content">
        <div className="card-heading-row">
          <div>
            <h3>{complex.name}</h3>
            <p><MapPin /> {complex.district}</p>
          </div>
          <span className="rating">4.8 <span>★</span></span>
        </div>
        <div className="developer-line">
          <ShieldCheck />
          <span>{complex.developer}</span>
          <small>проверен</small>
        </div>
        <div className="card-meta">
          <span>{complex.readiness}</span>
          <span>{complex.units} квартир</span>
          {complex.reservable && <span className="reserve-meta"><Check /> Онлайн-бронь</span>}
        </div>
        <div className="card-bottom">
          <strong>{complex.price}</strong>
          <Link href="/complex/bogishamol" aria-label={`Открыть ${complex.name}`}><ArrowRight /></Link>
        </div>
      </div>
    </article>
  );
}

function MobileNavigation() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
      <a className="active" href="#top"><Home /><span>Главная</span></a>
      <Link href="/catalog"><Search /><span>Поиск</span></Link>
      <a href="#complexes"><Heart /><span>Избранное</span></a>
      <a href="#how-it-works"><MessageCircle /><span>Сообщения</span></a>
      <Link href="/profile"><UserRound /><span>Профиль</span></Link>
    </nav>
  );
}

export default function HomePage() {
  const [market, setMarket] = useState<'all' | 'primary' | 'secondary'>('all');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([1]);

  const visibleComplexes = useMemo(() => {
    if (market === 'primary') return complexes.filter((item) => item.market.includes('Первичный'));
    if (market === 'secondary') return complexes.filter((item) => item.market.includes('вторичный'));
    return complexes;
  }, [market]);

  const handleSearch = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setSubmittedQuery(query.trim() || 'Квартиры в Самарканде');
  };

  const toggleFavorite = (id: number) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <main id="top">
      <Header />

      <section className="hero-section">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="shell hero-content">
          <Badge className="hero-kicker"><ShieldCheck /> Проверенные квартиры и застройщики</Badge>
          <h1>Дом, который подходит<br /><span>именно вам</span></h1>
          <p>Сравнивайте реальные предложения, проверяйте историю цены и бронируйте квартиру онлайн до визита в офис продаж.</p>

          <div className="search-panel">
            <div className="market-tabs" role="tablist" aria-label="Тип рынка">
              {[
                ['all', 'Все предложения'],
                ['primary', 'Новостройки'],
                ['secondary', 'Вторичный рынок'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={market === id}
                  className={market === id ? 'active' : ''}
                  onClick={() => setMarket(id as typeof market)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <form className="search-form" onSubmit={handleSearch}>
              <Search aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="hero-search-input"
                aria-label="Поиск по описанию"
                placeholder="Например: двушка до 900 млн в сданном ЖК"
              />
              <Button type="button" variant="outline" className="filter-button">
                <SlidersHorizontal /> Фильтры
              </Button>
              <Button type="submit" size="lg" className="search-button">Найти <ArrowRight /></Button>
            </form>
            <div className="ai-suggestion">
              <span><Bot /> AI-поиск понимает обычный язык</span>
              <button type="button" onClick={() => setQuery('Ищу двушку до 900 млн в сданном ЖК, не на первом этаже')}>Попробовать пример</button>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" id="how-it-works">
        <div className="shell trust-grid">
          <div><span><ShieldCheck /></span><p><strong>Проверенные продавцы</strong>Документы и права проходят проверку</p></div>
          <div><span><Check /></span><p><strong>Актуальная цена</strong>История изменений без фиктивных скидок</p></div>
          <div><span><Sparkles /></span><p><strong>Умный подбор</strong>AI превращает запрос в точные фильтры</p></div>
          <div><span><Building2 /></span><p><strong>Онлайн-бронирование</strong>5 минут на оплату и 72 часа резерва</p></div>
        </div>
      </section>

      <section className="complexes-section shell" id="complexes">
        {submittedQuery && (
          <output className="interpreted-query">
            <div><Bot /><span>Мы поняли ваш запрос:</span></div>
            <button type="button" onClick={() => setSubmittedQuery('')} aria-label="Закрыть интерпретацию">×</button>
            <strong>{submittedQuery}</strong>
            <div className="query-chips">
              {quickFilters.map((filter) => <span key={filter}>{filter} <button type="button" aria-label={`Удалить фильтр ${filter}`}>×</button></span>)}
            </div>
          </output>
        )}
        <div className="section-heading">
          <div>
            <span className="eyebrow">Актуально в Самарканде</span>
            <h2>Жилые комплексы для вашей жизни</h2>
            <p>Сначала выберите комплекс — внутри собраны все доступные квартиры от застройщиков, владельцев и агентств.</p>
          </div>
          <div className="view-switcher" aria-label="Вид результатов">
            <button className="active" type="button"><Building2 /> Каталог</button>
            <Link href="/catalog"><Map /> Карта</Link>
          </div>
        </div>

        <div className="complex-grid">
          {visibleComplexes.map((complex) => (
            <ComplexCard
              key={complex.id}
              complex={complex}
              favorite={favorites.includes(complex.id)}
              onFavorite={() => toggleFavorite(complex.id)}
            />
          ))}
        </div>

        <div className="section-cta">
          <p><strong>42 жилых комплекса</strong><span>и 347 проверенных квартир в Самарканде</span></p>
          <Button nativeButton={false} render={<Link href="/catalog" />} className="all-complexes-button" size="lg">Смотреть все комплексы <ArrowRight /></Button>
        </div>
      </section>

      <MobileNavigation />
    </main>
  );
}
