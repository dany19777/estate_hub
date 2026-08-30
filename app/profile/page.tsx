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
import { ChatDialog } from '@/components/chat-dialog';
import { InternalLink as Link } from '@/components/internal-link';
import { useFavorites } from '@/hooks/use-favorites';
import { useComparisons } from '@/hooks/use-comparisons';
import { useSavedSearches } from '@/hooks/use-saved-searches';
import { useReservations } from '@/hooks/use-reservations';
import { useViewings } from '@/hooks/use-viewings';
import { useMessages } from '@/hooks/use-messages';
import { formatPriceMillions } from '@/lib/marketplace';

const sidebar = [
  { icon: Home, label: 'Обзор' },
  { icon: Heart, label: 'Избранное' },
  { icon: Scale, label: 'Сравнения' },
  { icon: BookmarkCheck, label: 'Сохранённые поиски' },
  { icon: CalendarDays, label: 'Мои просмотры' },
  { icon: WalletCards, label: 'Бронирования' },
  { icon: MessageCircle, label: 'Сообщения' },
  { icon: Bell, label: 'Уведомления', count: 5 },
  { icon: Settings, label: 'Профиль и безопасность' },
];

export default function BuyerProfile() {
  const [active, setActive] = useState('Обзор');
  const { favorites } = useFavorites();
  const { items: comparisons } = useComparisons();
  const { searches } = useSavedSearches();
  const { reservations } = useReservations();
  const { viewings } = useViewings();
  const { conversations, reload: reloadMessages } = useMessages();
  const unreadMessages = conversations.reduce((total, conversation) => total + Number(conversation.unread_count), 0);
  const activeReservation = reservations[0];
  const reservationDate = activeReservation?.reservation_expires_at ?? activeReservation?.hold_expires_at;
  return (
    <main className="buyer-profile-page">
      <header className="profile-header"><Link className="catalog-brand" href="/"><span><Building2 /></span>Estate<em>Hub</em></Link><nav><Link href="/catalog?market=all">Купить</Link><Link href="/catalog?market=primary">Новостройки</Link><Link href="/catalog?market=secondary">Вторичный рынок</Link></nav><div><button type="button"><Bell /></button><span>ИИ</span><div><strong>Иван Иванов</strong><small>+998 90 123 45 67</small></div></div></header>
      <div className="profile-layout">
        <aside className="profile-sidebar"><div className="profile-person"><span>ИИ</span><div><strong>Иван Иванов</strong><small><ShieldCheck /> Телефон подтверждён</small></div></div><nav>{sidebar.map((item) => { const count = item.label === 'Избранное' ? favorites.length : item.label === 'Сравнения' ? comparisons.length : item.label === 'Сохранённые поиски' ? searches.length : item.label === 'Мои просмотры' ? viewings.length : item.label === 'Бронирования' ? reservations.length : item.label === 'Сообщения' ? (unreadMessages || conversations.length) : item.count; return <button type="button" className={active === item.label ? 'active' : ''} onClick={() => setActive(item.label)} key={item.label}><item.icon /><span>{item.label}</span>{count ? <em>{count}</em> : null}</button>; })}</nav><button className="profile-logout" type="button"><LogOut /> Выйти</button></aside>
        <section className="profile-content">
          <div className="profile-welcome"><div><span>Личный кабинет</span><h1>Добрый день, Иван 👋</h1><p>Ваши объекты, встречи и бронирования — в одном месте.</p></div><Button variant="outline"><Settings /> Настроить профиль</Button></div>

          {active === 'Сравнения' && <section className="profile-feature-panel"><div><span><Scale /></span><div><small>Подбор квартир</small><h2>Сравнения</h2><p>{comparisons.length ? `В сравнении ${comparisons.length} из 4 квартир.` : 'Добавьте квартиры со страниц ЖК, чтобы увидеть их параметры рядом.'}</p></div></div>{comparisons.length ? <div className="profile-feature-list">{comparisons.map((item) => <Link key={item.id} href={`/complex/${item.slug}`}>{item.complex_name} · № {item.unit_number}<ChevronRight /></Link>)}</div> : null}<Button nativeButton={false} render={<Link href={comparisons.length ? '/compare' : '/catalog'} />}>{comparisons.length ? 'Открыть сравнение' : 'Перейти в каталог'}</Button></section>}
          {active === 'Сохранённые поиски' && <section className="profile-feature-panel"><div><span><BookmarkCheck /></span><div><small>Ваши предпочтения</small><h2>Сохранённые поиски</h2><p>{searches.length ? 'Откройте поиск — фильтры можно уточнить в каталоге.' : 'Сохраните текущие фильтры в каталоге, чтобы быстро вернуться к подборке.'}</p></div></div>{searches.length ? <div className="profile-feature-list">{searches.map((item) => <Link key={item.id} href={`/catalog?${new URLSearchParams(Object.entries(item.filters).map(([key, value]) => [key, String(value)])).toString()}`}>{item.name}<ChevronRight /></Link>)}</div> : null}<Button nativeButton={false} render={<Link href="/catalog" />}>Открыть каталог</Button></section>}
          {active === 'Сообщения' && <section className="profile-feature-panel profile-messages-panel" id="messages"><div><span><MessageCircle /></span><div><small>Прямой контакт</small><h2>Сообщения продавцам</h2><p>{conversations.length ? `${conversations.length} ${conversations.length === 1 ? 'диалог' : 'диалога'} с контекстом квартиры и продавца.` : 'Напишите продавцу со страницы квартиры — диалог сохранится здесь.'}</p></div></div>{conversations.length ? <div className="profile-message-list">{conversations.map((conversation) => <ChatDialog key={conversation.id} listingId={conversation.listing_id} complexName={conversation.complex_name} unitNumber={conversation.unit_number} seller={conversation.seller} onMessageSent={() => void reloadMessages()} trigger={<button type="button"><img src={conversation.image} alt={conversation.complex_name}/><span><strong>{conversation.seller}</strong><small>{conversation.complex_name} · № {conversation.unit_number}</small><em>{conversation.last_message ?? 'Диалог создан'}</em></span>{Number(conversation.unread_count) > 0 ? <b>{conversation.unread_count}</b> : <ChevronRight />}</button>} />)}</div> : <Button nativeButton={false} render={<Link href="/catalog" />}>Найти квартиру</Button>}</section>}

          <div className="profile-status-grid">
            <article><span className="profile-stat-icon blue"><Heart /></span><div><strong>{favorites.length}</strong><small>в избранном</small></div><a href="#favorites"><ChevronRight /></a></article>
            <article><span className="profile-stat-icon orange"><CalendarDays /></span><div><strong>{viewings.length}</strong><small>записей на просмотр</small></div><a href="#viewings"><ChevronRight /></a></article>
            <article><span className="profile-stat-icon green"><WalletCards /></span><div><strong>{reservations.length}</strong><small>активных броней</small></div><a href="#reservation"><ChevronRight /></a></article>
            <article><span className="profile-stat-icon violet"><MessageCircle /></span><div><strong>{conversations.length}</strong><small>диалогов с продавцами</small></div><button type="button" aria-label="Открыть сообщения" onClick={() => setActive('Сообщения')}><ChevronRight /></button></article>
          </div>

          <div className="profile-main-grid">
            <div>
              <section className="active-reservation" id="reservation">{activeReservation ? <><div className="profile-section-heading"><div><Badge><Clock3 /> {activeReservation.status === 'confirmed' ? 'Активная бронь' : 'Ожидает оплаты'}</Badge><h2>Квартира № {activeReservation.unit_number}</h2><p>{activeReservation.complex_name} · {activeReservation.rooms} комнаты · {activeReservation.area_sqm} м²</p></div><Link href={`/complex/${activeReservation.slug}`}>Открыть квартиру</Link></div><div className="reservation-summary"><img src={activeReservation.image} alt={`Квартира ${activeReservation.unit_number}`}/><div><div className="reservation-summary-top"><span>Цена зафиксирована</span><strong>{formatPriceMillions(activeReservation.price_uzs)} сум</strong></div><div className="reservation-countdown"><span><Clock3 /> {activeReservation.status === 'confirmed' ? 'Бронь действует до' : 'Оплатить до'}</span><strong>{reservationDate ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${reservationDate.replace(' ', 'T')}Z`)) : '—'}</strong></div><Progress value={activeReservation.status === 'confirmed' ? 66 : 25} /><p>{activeReservation.status === 'confirmed' ? 'Оплата зарегистрирована. Посетите офис продаж до окончания срока брони.' : `Квартира удержана. Завершите оплату бронирования: ${formatPriceMillions(activeReservation.reservation_fee_uzs)} сум.`}</p><div><Button><MessageCircle /> Написать менеджеру</Button><Button variant="outline">Детали брони</Button></div></div></div><div className="reservation-steps"><div className={activeReservation.payment_status === 'paid' ? 'done' : 'active'}><span>{activeReservation.payment_status === 'paid' ? <Check /> : '1'}</span><p><strong>Оплата брони</strong><small>{formatPriceMillions(activeReservation.reservation_fee_uzs)} сум</small></p></div><i/><div className={activeReservation.status === 'confirmed' ? 'active' : ''}><span>2</span><p><strong>Визит в офис</strong><small>в течение 72 часов</small></p></div><i/><div><span>3</span><p><strong>Решение</strong><small>покупка или отказ</small></p></div></div></> : <div className="reservation-empty"><WalletCards /><div><h2>Активных броней нет</h2><p>Когда вы оплатите онлайн-бронь, здесь появятся зафиксированная цена и срок визита.</p></div><Button nativeButton={false} render={<Link href="/catalog?market=primary" />}>Выбрать квартиру</Button></div>}</section>

              <section className="profile-card-section" id="favorites"><div className="profile-section-heading"><div><span>Сохранено для вас</span><h2>Избранные объекты</h2></div><Link href="/catalog">Смотреть каталог</Link></div>{favorites.length ? <div className="favorite-mini-grid">{favorites.slice(0, 4).map((favorite) => <Link key={favorite.id} href={`/complex/${favorite.slug}`}><img src={favorite.image} alt={favorite.name}/><div><strong>{favorite.name}</strong><span>от {formatPriceMillions(favorite.price_from)} сум</span><small>{favorite.available_units} квартир · {favorite.completion_label}</small></div><Heart /></Link>)}</div> : <p className="profile-empty">В избранном пока нет объектов. Сохраняйте понравившиеся ЖК из каталога.</p>}</section>
            </div>

            <aside className="profile-right-rail">
              <section className="verification-card"><div><span><ShieldCheck /></span><Badge variant="secondary">Базовый аккаунт</Badge></div><h2>Подтвердите личность заранее</h2><p>Усиленная проверка потребуется перед первой платной бронью.</p><div><span>Готовность профиля <strong>65%</strong></span><Progress value={65} /></div><Button>Пройти проверку</Button></section>
              <section className="profile-card-section" id="viewings"><div className="profile-section-heading"><div><span>Ближайшие события</span><h2>Мои просмотры</h2></div></div>{viewings.length ? viewings.slice(0, 3).map((viewing) => { const date = new Date(`${viewing.requested_date}T00:00:00Z`); return <article className="viewing-item" key={viewing.id}><div><strong>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit' }).format(date)}</strong><span>{new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date).replace('.', '')}</span></div><p><strong>{viewing.complex_name}{viewing.unit_number ? ` · № ${viewing.unit_number}` : ''}</strong><span>{viewing.requested_date} · {viewing.time_slot}</span><small>{viewing.status === 'confirmed' ? 'Менеджер подтвердил встречу' : viewing.status === 'rescheduled' ? 'Требуется согласовать новое время' : 'Ожидает подтверждения'}</small></p><Badge variant={viewing.status === 'confirmed' ? 'default' : 'secondary'}>{viewing.status === 'confirmed' ? 'Подтверждено' : viewing.status === 'rescheduled' ? 'Перенос' : 'Ожидает'}</Badge></article>; }) : <p className="profile-empty">Запишитесь на просмотр на странице ЖК — здесь появятся время и статус подтверждения.</p>}</section>
              <section className="preference-card"><span>Ваш поиск</span><h2>2-комнатная в сданном ЖК</h2><p>Самарканд · до 900 млн · не первый этаж · онлайн-бронь</p><div><span><Bell /></span><p><strong>Уведомления включены</strong><small>Сообщим о новых совпадениях</small></p></div><Link href="/catalog">Показать 18 вариантов <ChevronRight /></Link></section>
            </aside>
          </div>
        </section>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация"><Link href="/"><Home /><span>Главная</span></Link><Link href="/catalog"><Search /><span>Поиск</span></Link><a href="#favorites"><Heart /><span>Избранное</span></a><a href="#messages"><MessageCircle /><span>Сообщения</span></a><Link className="active" href="/profile"><UserRound /><span>Профиль</span></Link></nav>
    </main>
  );
}
