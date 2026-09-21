'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  Heart,
  Home,
  Map,
  MapPin,
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
import { MarketplaceHeader } from '@/components/marketplace-header';
import { useComplexes } from '@/hooks/use-complexes';
import type { ComplexSummary } from '@/lib/marketplace';
import { formatPriceMillions, marketLabel } from '@/lib/marketplace';

function ComplexCard({
  complex,
  favorite,
  onFavorite,
}: {
  complex: ComplexSummary;
  favorite: boolean;
  onFavorite: () => void;
}) {
  return (
    <article className="complex-card">
      <div className="card-image-wrap">
        <img src={complex.image} alt={`Жилой комплекс ${complex.name}`} />
        <div className="image-badges">
          {complex.sponsored ? (
            <Badge className="sponsored-badge">
              <Sparkles /> {complex.sponsoredLabel}
            </Badge>
          ) : (
            complex.featured && (
              <Badge className="featured-badge">
                <Sparkles /> Выбор EstateHub
              </Badge>
            )
          )}
          <Badge className="market-badge" variant="secondary">
            {marketLabel(complex.marketTypes)}
          </Badge>
        </div>
        <button
          type="button"
          className={`favorite-button ${favorite ? 'is-favorite' : ''}`}
          aria-label={
            favorite ? 'Удалить из избранного' : 'Добавить в избранное'
          }
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
            <p>
              <MapPin /> {complex.city}, {complex.district}
            </p>
          </div>
          <span className="rating">
            4.8 <span>★</span>
          </span>
        </div>
        <div className="developer-line">
          <ShieldCheck />
          <span>{complex.developer}</span>
          <small>проверен</small>
        </div>
        <div className="card-meta">
          <span>{complex.completionLabel}</span>
          <span>{complex.availableUnits} квартир</span>
          {complex.reservable && (
            <span className="reserve-meta">
              <Check /> Онлайн-бронь
            </span>
          )}
        </div>
        <div className="card-bottom">
          <strong>от {formatPriceMillions(complex.priceFrom)} сум</strong>
          <Link
            href={`/complex/${complex.slug}`}
            aria-label={`Открыть ${complex.name}`}
          >
            <ArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}

function MobileNavigation() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
      <a className="active" href="#top">
        <Home />
        <span>Главная</span>
      </a>
      <Link href="/catalog">
        <Search />
        <span>Поиск</span>
      </Link>
      <Link href="/profile?section=favorites">
        <Heart />
        <span>Избранное</span>
      </Link>
      <Link href="/profile?section=messages">
        <MessageCircle />
        <span>Сообщения</span>
      </Link>
      <Link href="/profile">
        <UserRound />
        <span>Профиль</span>
      </Link>
    </nav>
  );
}

export default function HomePage() {
  const [market, setMarket] = useState<'all' | 'primary' | 'secondary'>('all');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['complex-bogishamol']);

  const {
    data: catalog,
    loading,
    error,
    retry,
  } = useComplexes({ market, verified: true, surface: 'homepage', limit: 4 });
  const visibleComplexes = catalog.items;

  const handleSearch = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const params = new URLSearchParams({
      market,
      q: query.trim() || 'Квартиры в Самарканде',
    });
    window.location.assign(`/catalog?${params.toString()}`);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <main id="top">
      <MarketplaceHeader />

      <section className="hero-section">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="shell hero-content">
          <Badge className="hero-kicker">
            <ShieldCheck /> Проверенные квартиры и застройщики
          </Badge>
          <h1>
            Дом, который подходит
            <br />
            <span>именно вам</span>
          </h1>
          <p>
            Сравнивайте реальные предложения, проверяйте историю цены и
            бронируйте квартиру онлайн до визита в офис продаж.
          </p>

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
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/catalog?market=${market}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''}`}
                  />
                }
                variant="outline"
                className="filter-button"
              >
                <SlidersHorizontal /> Фильтры
              </Button>
              <Button type="submit" size="lg" className="search-button">
                Найти <ArrowRight />
              </Button>
            </form>
            <div className="ai-suggestion">
              <span>
                <Bot /> AI-поиск понимает обычный язык
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuery(
                    'Ищу двушку до 900 млн в сданном ЖК, не на первом этаже',
                  )
                }
              >
                Попробовать пример
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" id="how-it-works">
        <div className="shell trust-grid">
          <div>
            <span>
              <ShieldCheck />
            </span>
            <p>
              <strong>Проверенные продавцы</strong>Документы и права проходят
              проверку
            </p>
          </div>
          <div>
            <span>
              <Check />
            </span>
            <p>
              <strong>Актуальная цена</strong>История изменений без фиктивных
              скидок
            </p>
          </div>
          <div>
            <span>
              <Sparkles />
            </span>
            <p>
              <strong>Умный подбор</strong>AI превращает запрос в точные фильтры
            </p>
          </div>
          <div>
            <span>
              <Building2 />
            </span>
            <p>
              <strong>Онлайн-бронирование</strong>5 минут на оплату и 72 часа
              резерва
            </p>
          </div>
        </div>
      </section>

      <section className="complexes-section shell" id="complexes">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Актуально в Самарканде</span>
            <h2>Жилые комплексы для вашей жизни</h2>
            <p>
              Сначала выберите комплекс — внутри собраны все доступные квартиры
              от застройщиков, владельцев и агентств.
            </p>
          </div>
          <div className="view-switcher" aria-label="Вид результатов">
            <span className="active" aria-current="true">
              <Building2 /> Каталог
            </span>
            <Link href="/catalog">
              <Map /> Карта
            </Link>
          </div>
        </div>

        {loading ? (
          <output className="catalog-state">
            <span className="catalog-loader" />
            <span>
              <strong>Загружаем проверенные комплексы</strong>
              <small>Получаем актуальные цены и доступность квартир.</small>
            </span>
          </output>
        ) : error ? (
          <div className="catalog-state error-state">
            <div>
              <strong>Каталог временно недоступен</strong>
              <p>{error}</p>
            </div>
            <Button variant="outline" onClick={retry}>
              Попробовать снова
            </Button>
          </div>
        ) : visibleComplexes.length === 0 ? (
          <div className="catalog-state">
            <div>
              <strong>Подходящих комплексов пока нет</strong>
              <p>Измените тип рынка или перейдите в полный каталог.</p>
            </div>
          </div>
        ) : (
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
        )}

        <div className="section-cta">
          <p>
            <strong>{catalog.total} жилых комплексов</strong>
            <span>с актуальными предложениями в Самарканде</span>
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/catalog" />}
            className="all-complexes-button"
            size="lg"
          >
            Смотреть все комплексы <ArrowRight />
          </Button>
        </div>
      </section>

      <MobileNavigation />
    </main>
  );
}
