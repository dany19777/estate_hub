'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  Heart,
  Home,
  MapPin,
  Maximize2,
  MessageCircle,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InternalLink as Link } from '@/components/internal-link';

const gallery = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1000&q=88',
];

const listings = [
  { id: 'A-142', rooms: 2, area: '72 м²', floor: '14 / 24', finish: 'Чистовая', price: '685 млн сум', meter: '9,51 млн / м²', type: 'Первичный', seller: 'Samarkand Development', reserve: true },
  { id: 'B-081', rooms: 3, area: '91 м²', floor: '8 / 24', finish: 'Предчистовая', price: '840 млн сум', meter: '9,23 млн / м²', type: 'Первичный', seller: 'Samarkand Development', reserve: true },
  { id: 'A-097', rooms: 2, area: '69 м²', floor: '9 / 24', finish: 'С ремонтом', price: '730 млн сум', meter: '10,58 млн / м²', type: 'Вторичный', seller: 'Проверенный собственник', reserve: false },
];

export default function ComplexPage() {
  const [activeImage, setActiveImage] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<'Все' | 'Первичный' | 'Вторичный'>('Все');
  const [reservationStarted, setReservationStarted] = useState(false);

  const inventory = listings.filter((item) => inventoryTab === 'Все' || item.type === inventoryTab);

  return (
    <main className="complex-page">
      <header className="detail-header">
        <Link className="catalog-brand" href="/"><span><Building2 /></span>Estate<em>Hub</em></Link>
        <nav><Link href="/catalog?market=all">Купить</Link><Link href="/catalog?market=primary">Новостройки</Link><Link href="/catalog?market=secondary">Вторичный рынок</Link></nav>
        <div><button type="button"><Bell /></button><button type="button"><UserRound /></button></div>
      </header>

      <div className="detail-shell">
        <div className="breadcrumbs"><Link href="/"><Home /></Link><span>/</span><Link href="/catalog">Самарканд</Link><span>/</span><Link href="/catalog">Боғишамол</Link><span>/</span><strong>Bog‘ishamol Residence</strong></div>
        <Link className="mobile-detail-back" href="/catalog"><ArrowLeft /> Вернуться к поиску</Link>

        <section className="detail-title">
          <div>
            <div className="detail-badges"><Badge><Sparkles /> Выбор EstateHub</Badge><Badge variant="secondary"><ShieldCheck /> Проверенный ЖК</Badge></div>
            <h1>Bog‘ishamol Residence</h1>
            <p><MapPin /> Самарканд, Боғишамол, ул. Амир Темура · <a href="#location">Показать на карте</a></p>
          </div>
          <div className="detail-title-actions"><button className={favorite ? 'active' : ''} type="button" onClick={() => setFavorite(!favorite)}><Heart /> <span>{favorite ? 'В избранном' : 'В избранное'}</span></button><button type="button"><Share2 /> <span>Поделиться</span></button></div>
        </section>

        <section className="detail-gallery">
          <div className="gallery-main"><img src={gallery[activeImage]} alt="Bog‘ishamol Residence" /><button type="button"><Maximize2 /> Смотреть все фото</button></div>
          <div className="gallery-side">{gallery.slice(1).map((image, index) => <button type="button" key={image} onClick={() => setActiveImage(index + 1)}><img src={image} alt={`Bog‘ishamol Residence — фото ${index + 2}`} />{index === 2 && <span>+18 фото</span>}</button>)}</div>
        </section>

        <section className="detail-overview-grid">
          <div className="detail-main-column">
            <div className="overview-card">
              <div className="overview-header"><div><span>О жилом комплексе</span><h2>Современный дом рядом с центром</h2></div><Badge variant="secondary">Сдан в 2024</Badge></div>
              <p>Камерный жилой комплекс с закрытым двором, продуманными планировками и панорамными окнами. Каноническая страница объединяет предложения застройщика и проверенные квартиры вторичного рынка.</p>
              <div className="overview-facts"><div><strong>24</strong><span>этажа</span></div><div><strong>3</strong><span>корпуса</span></div><div><strong>248</strong><span>квартир</span></div><div><strong>3,1 м</strong><span>потолки</span></div><div><strong>2024</strong><span>год сдачи</span></div></div>
            </div>

            <div className="inventory-section" id="inventory">
              <div className="inventory-heading"><div><span>Доступно сейчас</span><h2>Квартиры в комплексе</h2><p>{listings.length} предложения от проверенных продавцов</p></div><Link href="/catalog">Все фильтры <ArrowRight /></Link></div>
              <div className="inventory-tabs">{(['Все', 'Первичный', 'Вторичный'] as const).map((tab) => <button type="button" className={inventoryTab === tab ? 'active' : ''} onClick={() => setInventoryTab(tab)} key={tab}>{tab}{tab === 'Все' ? ' 28' : tab === 'Первичный' ? ' 21' : ' 7'}</button>)}</div>
              <div className="listing-stack">
                {inventory.map((listing) => (
                  <article className="listing-row" key={listing.id}>
                    <div className="plan-preview"><div><span>{listing.rooms}</span><i /><i /><i /></div><small>№ {listing.id}</small></div>
                    <div className="listing-info"><Badge variant={listing.type === 'Первичный' ? 'default' : 'secondary'}>{listing.type}</Badge><h3>{listing.rooms}-комнатная квартира, {listing.area}</h3><p>{listing.floor} этаж · {listing.finish}</p><span><ShieldCheck /> {listing.seller}</span></div>
                    <div className="listing-price"><strong>{listing.price}</strong><span>{listing.meter}</span><small>Цена обновлена сегодня</small></div>
                    <div className="listing-actions"><Button variant="outline" size="sm"><Eye /> Подробнее</Button>{listing.reserve ? (
                      <Dialog>
                        <DialogTrigger render={<Button size="sm" />}>Забронировать</DialogTrigger>
                        <DialogContent className="reservation-dialog">
                          <DialogHeader><Badge><Clock3 /> Защищённая бронь</Badge><DialogTitle>Забронировать квартиру № {listing.id}</DialogTitle><DialogDescription>После проверки данных квартира будет удерживаться 5 минут на время оплаты. Подтверждённая бронь действует 72 часа.</DialogDescription></DialogHeader>
                          {!reservationStarted ? <div className="reservation-form"><label htmlFor={`reservation-name-${listing.id}`}>Имя и фамилия<Input id={`reservation-name-${listing.id}`} defaultValue="Иван Иванов" /></label><label htmlFor={`reservation-phone-${listing.id}`}>Телефон<Input id={`reservation-phone-${listing.id}`} defaultValue="+998 90 123 45 67" /></label><label className="consent-row"><input defaultChecked type="checkbox" /> Я принимаю условия онлайн-бронирования</label><div><span>Стоимость бронирования</span><strong>2 500 000 сум</strong></div></div> : <div className="reservation-success"><span><Check /></span><h3>Квартира удерживается за вами</h3><p>Осталось 04:59 для завершения оплаты. Цена {listing.price} зафиксирована.</p></div>}
                          <DialogFooter>{reservationStarted ? <DialogClose render={<Button />}>Перейти к оплате</DialogClose> : <><DialogClose render={<Button variant="outline" />}>Отмена</DialogClose><Button onClick={() => setReservationStarted(true)}>Начать бронь</Button></>}</DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : <Button size="sm"><MessageCircle /> Написать продавцу</Button>}</div>
                  </article>
                ))}
              </div>
            </div>

            <section className="price-history-card">
              <div><span>Прозрачность цены</span><h2>Динамика стоимости за м²</h2><p>Средняя цена по активным объявлениям · 23 предложения</p></div>
              <div className="price-chart" aria-label="Средняя цена выросла с 8,7 до 9,5 млн сум за квадратный метр">
                <div className="chart-y-labels"><span>10 млн</span><span>9 млн</span><span>8 млн</span></div>
                <svg viewBox="0 0 600 170" role="img" aria-label="График истории цены"><defs><linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a66ed" stopOpacity=".25"/><stop offset="1" stopColor="#2a66ed" stopOpacity="0"/></linearGradient></defs><path d="M8 139 C75 130 86 113 139 119 S230 91 288 99 S380 67 441 74 S525 40 592 49 L592 166 L8 166 Z" fill="url(#lineFill)"/><path d="M8 139 C75 130 86 113 139 119 S230 91 288 99 S380 67 441 74 S525 40 592 49" fill="none" stroke="#2a66ed" strokeWidth="4" strokeLinecap="round"/></svg>
                <div className="chart-x-labels"><span>Сен</span><span>Ноя</span><span>Янв</span><span>Мар</span><span>Май</span><span>Авг</span></div>
              </div>
            </section>
          </div>

          <aside className="detail-rail">
            <div className="price-card"><span>Квартиры</span><strong>от 620 млн сум</strong><p>от 8,9 млн сум / м²</p><a href="#inventory">Выбрать квартиру <ArrowRight /></a></div>
            <div className="developer-card"><div className="developer-card-head"><span>SD</span><div><h3>Samarkand Development</h3><p><ShieldCheck /> Проверенный застройщик</p></div></div><div className="developer-stats"><span><strong>12</strong>проектов</span><span><strong>8 лет</strong>на рынке</span><span><strong>4.8</strong>рейтинг</span></div><Button className="developer-message" variant="outline"><MessageCircle /> Написать</Button></div>
            <div className="viewing-card"><span><CalendarDays /></span><h3>Записаться на просмотр</h3><p>Выберите удобное время — менеджер подтвердит визит.</p><div><button type="button">30 авг<br/><strong>Сегодня</strong></button><button type="button" className="active">31 авг<br/><strong>Суббота</strong></button><button type="button">1 сен<br/><strong>Воскресенье</strong></button></div><Button>Выбрать время</Button></div>
            <div className="rating-card"><div><strong>4.8</strong><span><Star/><Star/><Star/><Star/><Star/></span><small>128 отзывов</small></div><p>Качество строительства <span>4.7</span></p><p>Расположение <span>4.9</span></p><p>Инфраструктура <span>4.8</span></p><a href="#reviews">Читать все отзывы</a></div>
          </aside>
        </section>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация"><Link href="/"><Home /><span>Главная</span></Link><Link className="active" href="/catalog"><Search /><span>Поиск</span></Link><Link href="/profile"><Heart /><span>Избранное</span></Link><Link href="/profile"><MessageCircle /><span>Сообщения</span></Link><Link href="/profile"><UserRound /><span>Профиль</span></Link></nav>
    </main>
  );
}
