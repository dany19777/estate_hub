'use client';

import { useState } from 'react';
import {
  Bell,
  BookmarkCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Search,
  Scale,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  WalletCards,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InternalLink as Link } from '@/components/internal-link';
import { useFavorites } from '@/hooks/use-favorites';
import { useComparisons } from '@/hooks/use-comparisons';
import { useSavedSearches } from '@/hooks/use-saved-searches';
import { formatPriceMillions } from '@/lib/marketplace';

const sidebar = [
  { icon: Home, label: 'Обзор' },
  { icon: Heart, label: 'Избранное' },
  { icon: Scale, label: 'Сравнения' },
  { icon: BookmarkCheck, label: 'Сохранённые поиски' },
  { icon: CalendarDays, label: 'Мои просмотры' },
  { icon: WalletCards, label: 'Бронирования', count: 1 },
  { icon: MessageCircle, label: 'Сообщения', count: 3 },
  { icon: Bell, label: 'Уведомления', count: 5 },
  { icon: Settings, label: 'Профиль и безопасность' },
];

export default function BuyerProfile() {
  const [active, setActive] = useState('Обзор');
  const { favorites } = useFavorites();
  const { items: comparisons } = useComparisons();
  const { searches } = useSavedSearches();
  return (
    <main className="buyer-profile-page">
      <header className="profile-header"><Link className="catalog-brand" href="/"><span><Building2 /></span>Estate<em>Hub</em></Link><nav><Link href="/catalog?market=all">Купить</Link><Link href="/catalog?market=primary">Новостройки</Link><Link href="/catalog?market=secondary">Вторичный рынок</Link></nav><div><button type="button"><Bell /></button><span>ИИ</span><div><strong>Иван Иванов</strong><small>+998 90 123 45 67</small></div></div></header>
      <div className="profile-layout">
        <aside className="profile-sidebar"><div className="profile-person"><span>ИИ</span><div><strong>Иван Иванов</strong><small><ShieldCheck /> Телефон подтверждён</small></div></div><nav>{sidebar.map((item) => { const count = item.label === 'Избранное' ? favorites.length : item.label === 'Сравнения' ? comparisons.length : item.label === 'Сохранённые поиски' ? searches.length : item.count; return <button type="button" className={active === item.label ? 'active' : ''} onClick={() => setActive(item.label)} key={item.label}><item.icon /><span>{item.label}</span>{count ? <em>{count}</em> : null}</button>; })}</nav><button className="profile-logout" type="button"><LogOut /> Выйти</button></aside>
        <section className="profile-content">
          <div className="profile-welcome"><div><span>Личный кабинет</span><h1>Добрый день, Иван 👋</h1><p>Ваши объекты, встречи и бронирования — в одном месте.</p></div><Button variant="outline"><Settings /> Настроить профиль</Button></div>

          {active === 'Сравнения' && <section className="profile-feature-panel"><div><span><Scale /></span><div><small>Подбор квартир</small><h2>Сравнения</h2><p>{comparisons.length ? `В сравнении ${comparisons.length} из 4 квартир.` : 'Добавьте квартиры со страниц ЖК, чтобы увидеть их параметры рядом.'}</p></div></div>{comparisons.length ? <div className="profile-feature-list">{comparisons.map((item) => <Link key={item.id} href={`/complex/${item.slug}`}>{item.complex_name} · № {item.unit_number}<ChevronRight /></Link>)}</div> : null}<Button nativeButton={false} render={<Link href={comparisons.length ? '/compare' : '/catalog'} />}>{comparisons.length ? 'Открыть сравнение' : 'Перейти в каталог'}</Button></section>}
          {active === 'Сохранённые поиски' && <section className="profile-feature-panel"><div><span><BookmarkCheck /></span><div><small>Ваши предпочтения</small><h2>Сохранённые поиски</h2><p>{searches.length ? 'Откройте поиск — фильтры можно уточнить в каталоге.' : 'Сохраните текущие фильтры в каталоге, чтобы быстро вернуться к подборке.'}</p></div></div>{searches.length ? <div className="profile-feature-list">{searches.map((item) => <Link key={item.id} href={`/catalog?${new URLSearchParams(Object.entries(item.filters).map(([key, value]) => [key, String(value)])).toString()}`}>{item.name}<ChevronRight /></Link>)}</div> : null}<Button nativeButton={false} render={<Link href="/catalog" />}>Открыть каталог</Button></section>}

          <div className="profile-status-grid">
            <article><span className="profile-stat-icon blue"><Heart /></span><div><strong>{favorites.length}</strong><small>в избранном</small></div><a href="#favorites"><ChevronRight /></a></article>
            <article><span className="profile-stat-icon orange"><CalendarDays /></span><div><strong>2</strong><small>записи на просмотр</small></div><a href="#viewings"><ChevronRight /></a></article>
            <article><span className="profile-stat-icon green"><WalletCards /></span><div><strong>1</strong><small>активная бронь</small></div><a href="#reservation"><ChevronRight /></a></article>
            <article><span className="profile-stat-icon violet"><MessageCircle /></span><div><strong>3</strong><small>новых сообщения</small></div><a href="#messages"><ChevronRight /></a></article>
          </div>

          <div className="profile-main-grid">
            <div>
              <section className="active-reservation" id="reservation"><div className="profile-section-heading"><div><Badge><Clock3 /> Активная бронь</Badge><h2>Квартира № A-142</h2><p>Bog‘ishamol Residence · 2 комнаты · 72 м²</p></div><Link href="/complex/bogishamol">Открыть квартиру</Link></div><div className="reservation-summary"><img src="https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=500&q=82" alt="Интерьер квартиры A-142"/><div><div className="reservation-summary-top"><span>Цена зафиксирована</span><strong>685 млн сум</strong></div><div className="reservation-countdown"><span><Clock3 /> До окончания брони</span><strong>47:18:36</strong></div><Progress value={34} /><p>Вам нужно посетить офис продаж до <strong>31 августа, 18:00</strong>. Менеджер уже получил ваши данные.</p><div><Button><MessageCircle /> Написать менеджеру</Button><Button variant="outline">Детали брони</Button></div></div></div><div className="reservation-steps"><div className="done"><span><Check /></span><p><strong>Оплата брони</strong><small>2 500 000 сум</small></p></div><i/><div className="active"><span>2</span><p><strong>Визит в офис</strong><small>до 31 августа</small></p></div><i/><div><span>3</span><p><strong>Решение</strong><small>покупка или отказ</small></p></div></div></section>

              <section className="profile-card-section" id="favorites"><div className="profile-section-heading"><div><span>Сохранено для вас</span><h2>Избранные объекты</h2></div><Link href="/catalog">Смотреть каталог</Link></div>{favorites.length ? <div className="favorite-mini-grid">{favorites.slice(0, 4).map((favorite) => <Link key={favorite.id} href={`/complex/${favorite.slug}`}><img src={favorite.image} alt={favorite.name}/><div><strong>{favorite.name}</strong><span>от {formatPriceMillions(favorite.price_from)} сум</span><small>{favorite.available_units} квартир · {favorite.completion_label}</small></div><Heart /></Link>)}</div> : <p className="profile-empty">В избранном пока нет объектов. Сохраняйте понравившиеся ЖК из каталога.</p>}</section>
            </div>

            <aside className="profile-right-rail">
              <section className="verification-card"><div><span><ShieldCheck /></span><Badge variant="secondary">Базовый аккаунт</Badge></div><h2>Подтвердите личность заранее</h2><p>Усиленная проверка потребуется перед первой платной бронью.</p><div><span>Готовность профиля <strong>65%</strong></span><Progress value={65} /></div><Button>Пройти проверку</Button></section>
              <section className="profile-card-section" id="viewings"><div className="profile-section-heading"><div><span>Ближайшие события</span><h2>Мои просмотры</h2></div></div><article className="viewing-item"><div><strong>31</strong><span>авг</span></div><p><strong>Registan Gardens</strong><span>Суббота, 14:00</span><small>Менеджер подтвердил встречу</small></p><Badge>Подтверждено</Badge></article><article className="viewing-item"><div><strong>02</strong><span>сен</span></div><p><strong>Silk Road Avenue</strong><span>Понедельник, 11:30</span><small>Ожидает подтверждения</small></p><Badge variant="secondary">Ожидает</Badge></article></section>
              <section className="preference-card"><span>Ваш поиск</span><h2>2-комнатная в сданном ЖК</h2><p>Самарканд · до 900 млн · не первый этаж · онлайн-бронь</p><div><span><Bell /></span><p><strong>Уведомления включены</strong><small>Сообщим о новых совпадениях</small></p></div><Link href="/catalog">Показать 18 вариантов <ChevronRight /></Link></section>
            </aside>
          </div>
        </section>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация"><Link href="/"><Home /><span>Главная</span></Link><Link href="/catalog"><Search /><span>Поиск</span></Link><a href="#favorites"><Heart /><span>Избранное</span></a><a href="#messages"><MessageCircle /><span>Сообщения</span></a><Link className="active" href="/profile"><UserRound /><span>Профиль</span></Link></nav>
    </main>
  );
}
