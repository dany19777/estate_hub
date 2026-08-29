'use client';

import { useParams } from 'next/navigation';
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
import { useComplexDetail } from '@/hooks/use-complex-detail';
import { formatPriceMillions, formatPricePerSqm } from '@/lib/marketplace';

export default function ComplexPage() {
  const params = useParams();
  const rawSlug = params.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug ?? '';
  const { data, loading, error, retry } = useComplexDetail(slug);
  const [activeImage, setActiveImage] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<'Все' | 'Первичный' | 'Вторичный'>('Все');
  const [reservationStarted, setReservationStarted] = useState<string | null>(null);

  const shareComplex = async () => {
    const shareData = { title: data?.summary.name ?? 'EstateHub', url: window.location.href };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(window.location.href);
  };

  const renderHeader = () => (
    <header className="detail-header">
      <Link className="catalog-brand" href="/"><span><Building2 /></span>Estate<em>Hub</em></Link>
      <nav><Link href="/catalog?market=all">Купить</Link><Link href="/catalog?market=primary">Новостройки</Link><Link href="/catalog?market=secondary">Вторичный рынок</Link></nav>
      <div><button type="button" aria-label="Уведомления"><Bell /></button><Link href="/profile" aria-label="Личный кабинет"><UserRound /></Link></div>
    </header>
  );

  if (loading) return <main className="complex-page">{renderHeader()}<div className="detail-shell"><output className="catalog-state detail-state"><span className="catalog-loader" /><span><strong>Загружаем жилой комплекс</strong><small>Проверяем квартиры, цены и продавцов.</small></span></output></div></main>;
  if (error || !data) return <main className="complex-page">{renderHeader()}<div className="detail-shell"><div className="catalog-state detail-state error-state"><div><strong>Жилой комплекс недоступен</strong><p>{error ?? 'Объект не найден.'}</p></div><Button variant="outline" onClick={retry}>Попробовать снова</Button><Button nativeButton={false} render={<Link href="/catalog" />}>Вернуться в каталог</Button></div></div></main>;

  const { summary, description, listings, gallery } = data;
  const images = gallery.length > 0 ? gallery : [summary.image];
  const inventory = listings.filter((item) => inventoryTab === 'Все' || (inventoryTab === 'Первичный' ? item.marketType === 'PRIMARY_DEVELOPER' : item.marketType !== 'PRIMARY_DEVELOPER'));
  const primaryCount = listings.filter((item) => item.marketType === 'PRIMARY_DEVELOPER').length;
  const secondaryCount = listings.length - primaryCount;
  const totalFloors = Math.max(...listings.map((listing) => listing.totalFloors), 1);

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
          <div className="detail-title-actions"><button className={favorite ? 'active' : ''} type="button" onClick={() => setFavorite(!favorite)}><Heart /> <span>{favorite ? 'В избранном' : 'В избранное'}</span></button><button type="button" onClick={shareComplex}><Share2 /> <span>Поделиться</span></button></div>
        </section>

        <section className="detail-gallery">
          <div className="gallery-main"><img src={images[activeImage] ?? images[0]} alt={summary.name} /><button type="button"><Maximize2 /> {images.length} фото</button></div>
          <div className="gallery-side">{images.slice(1, 4).map((image, index) => <button type="button" key={image} onClick={() => setActiveImage(index + 1)}><img src={image} alt={`${summary.name} — фото ${index + 2}`} />{index === 2 && images.length > 4 && <span>+{images.length - 4} фото</span>}</button>)}</div>
        </section>

        <section className="detail-overview-grid">
          <div className="detail-main-column">
            <div className="overview-card">
              <div className="overview-header"><div><span>О жилом комплексе</span><h2>{summary.completionStatus === 'completed' ? 'Готовый дом с проверенными предложениями' : 'Современный жилой проект в Самарканде'}</h2></div><Badge variant="secondary">{summary.completionLabel}</Badge></div>
              <p>{description} Каноническая страница объединяет предложения застройщика, владельцев и агентств без дублирования самого жилого комплекса.</p>
              <div className="overview-facts"><div><strong>{totalFloors}</strong><span>этажей</span></div><div><strong>1</strong><span>корпус</span></div><div><strong>{summary.availableUnits}</strong><span>доступно</span></div><div><strong>{summary.minRooms}–{summary.maxRooms}</strong><span>комнат</span></div><div><strong>{summary.rating.toFixed(1)}</strong><span>рейтинг</span></div></div>
            </div>

            <div className="inventory-section" id="inventory">
              <div className="inventory-heading"><div><span>Доступно сейчас</span><h2>Квартиры в комплексе</h2><p>{listings.length} предложения от проверенных продавцов</p></div><Link href={`/catalog?q=${encodeURIComponent(summary.name)}`}>Все фильтры <ArrowRight /></Link></div>
              <div className="inventory-tabs">{(['Все', 'Первичный', 'Вторичный'] as const).map((tab) => <button type="button" className={inventoryTab === tab ? 'active' : ''} onClick={() => setInventoryTab(tab)} key={tab}>{tab} {tab === 'Все' ? listings.length : tab === 'Первичный' ? primaryCount : secondaryCount}</button>)}</div>
              <div className="listing-stack">
                {inventory.map((listing) => (
                  <article className="listing-row" key={listing.id}>
                    <div className="plan-preview"><div><span>{listing.rooms}</span><i /><i /><i /></div><small>№ {listing.unitNumber}</small></div>
                    <div className="listing-info"><Badge variant={listing.marketType === 'PRIMARY_DEVELOPER' ? 'default' : 'secondary'}>{listing.marketType === 'PRIMARY_DEVELOPER' ? 'Первичный' : 'Вторичный'}</Badge><h3>{listing.rooms}-комнатная квартира, {listing.areaSqm} м²</h3><p>{listing.floorNumber} / {listing.totalFloors} этаж · {listing.finish}</p><span><ShieldCheck /> {listing.seller}</span></div>
                    <div className="listing-price"><strong>{formatPriceMillions(listing.priceUzs)} сум</strong><span>{formatPricePerSqm(Math.round(listing.priceUzs / listing.areaSqm))}</span><small>Цена из реестра объявлений</small></div>
                    <div className="listing-actions"><Button variant="outline" size="sm"><Eye /> Подробнее</Button>{listing.reserveEnabled ? (
                      <Dialog>
                        <DialogTrigger render={<Button size="sm" />}>Забронировать</DialogTrigger>
                        <DialogContent className="reservation-dialog">
                          <DialogHeader><Badge><Clock3 /> Онлайн-бронь</Badge><DialogTitle>Квартира № {listing.unitNumber}</DialogTitle><DialogDescription>Это следующий MVP-сценарий: после проверки покупателя сервер атомарно удержит квартиру на 5 минут для оплаты брони.</DialogDescription></DialogHeader>
                          {reservationStarted !== listing.id ? <div className="reservation-form"><label htmlFor={`reservation-name-${listing.id}`}>Имя и фамилия<Input id={`reservation-name-${listing.id}`} defaultValue="Иван Иванов" /></label><label htmlFor={`reservation-phone-${listing.id}`}>Телефон<Input id={`reservation-phone-${listing.id}`} defaultValue="+998 90 123 45 67" /></label><label className="consent-row"><input defaultChecked type="checkbox" /> Я принимаю условия онлайн-бронирования</label><div><span>Стоимость бронирования</span><strong>2 500 000 сум</strong></div></div> : <div className="reservation-success"><span><Check /></span><h3>Демо-заявка подготовлена</h3><p>Платёж и удержание квартиры будут подключены отдельным защищённым этапом.</p></div>}
                          <DialogFooter>{reservationStarted === listing.id ? <DialogClose render={<Button />}>Понятно</DialogClose> : <><DialogClose render={<Button variant="outline" />}>Отмена</DialogClose><Button onClick={() => setReservationStarted(listing.id)}>Продолжить</Button></>}</DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : <Button size="sm"><MessageCircle /> Написать продавцу</Button>}</div>
                  </article>
                ))}
              </div>
            </div>

            <section className="price-history-card">
              <div><span>Прозрачность цены</span><h2>Текущая стоимость за м²</h2><p>Минимальная цена по активным объявлениям · {listings.length} предложений</p></div>
              <div className="price-chart" aria-label={`Стоимость начинается от ${formatPricePerSqm(summary.pricePerSqmFrom)}`}>
                <div className="chart-y-labels"><span>12 млн</span><span>10 млн</span><span>8 млн</span></div>
                <svg viewBox="0 0 600 170" aria-label="Демонстрация будущего графика истории цены"><defs><linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a66ed" stopOpacity=".25"/><stop offset="1" stopColor="#2a66ed" stopOpacity="0"/></linearGradient></defs><path d="M8 139 C75 130 86 113 139 119 S230 91 288 99 S380 67 441 74 S525 40 592 49 L592 166 L8 166 Z" fill="url(#lineFill)"/><path d="M8 139 C75 130 86 113 139 119 S230 91 288 99 S380 67 441 74 S525 40 592 49" fill="none" stroke="#2a66ed" strokeWidth="4" strokeLinecap="round"/></svg>
                <div className="chart-x-labels"><span>Сен</span><span>Ноя</span><span>Янв</span><span>Мар</span><span>Май</span><span>Авг</span></div>
              </div>
            </section>
          </div>

          <aside className="detail-rail">
            <div className="price-card"><span>Квартиры</span><strong>от {formatPriceMillions(summary.priceFrom)} сум</strong><p>от {formatPricePerSqm(summary.pricePerSqmFrom)}</p><a href="#inventory">Выбрать квартиру <ArrowRight /></a></div>
            <div className="developer-card"><div className="developer-card-head"><span>{summary.developer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><h3>{summary.developer}</h3><p><ShieldCheck /> Проверенный застройщик</p></div></div><div className="developer-stats"><span><strong>Проверен</strong>статус</span><span><strong>{summary.availableUnits}</strong>квартир</span><span><strong>{summary.rating.toFixed(1)}</strong>рейтинг</span></div><Button className="developer-message" variant="outline"><MessageCircle /> Написать</Button></div>
            <div className="viewing-card"><span><CalendarDays /></span><h3>Записаться на просмотр</h3><p>Выберите удобное время — менеджер подтвердит визит.</p><div><button type="button">30 авг<br/><strong>Сегодня</strong></button><button type="button" className="active">31 авг<br/><strong>Суббота</strong></button><button type="button">1 сен<br/><strong>Воскресенье</strong></button></div><Button>Выбрать время</Button></div>
            <div className="rating-card"><div><strong>{summary.rating.toFixed(1)}</strong><span><Star/><Star/><Star/><Star/><Star/></span><small>Проверенный рейтинг</small></div><p>Качество строительства <span>{Math.max(summary.rating - 0.1, 0).toFixed(1)}</span></p><p>Расположение <span>{Math.min(summary.rating + 0.1, 5).toFixed(1)}</span></p><p>Инфраструктура <span>{summary.rating.toFixed(1)}</span></p><a href="#reviews">Отзывы появятся после модерации</a></div>
          </aside>
        </section>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация"><Link href="/"><Home /><span>Главная</span></Link><Link className="active" href="/catalog"><Search /><span>Поиск</span></Link><Link href="/profile"><Heart /><span>Избранное</span></Link><Link href="/profile"><MessageCircle /><span>Сообщения</span></Link><Link href="/profile"><UserRound /><span>Профиль</span></Link></nav>
    </main>
  );
}
