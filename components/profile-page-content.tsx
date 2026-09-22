'use client';

import { LogoutButton } from '@/components/logout-button';

import NextImage from 'next/image';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  BookmarkCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  Inbox,
  MessageCircle,
  Search,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChatDialog } from '@/components/chat-dialog';
import { BuyerVerificationDialog } from '@/components/buyer-verification-dialog';
import { ReservationDisputeDialog } from '@/components/reservation-dispute-dialog';
import { PhoneVerificationDialog } from '@/components/phone-verification-dialog';
import { NotificationCenter } from '@/components/notification-center';
import { BuyerWatchlistPanel } from '@/components/buyer-watchlist-panel';
import { InternalLink as Link } from '@/components/internal-link';
import { MarketplaceHeader } from '@/components/marketplace-header';
import { useFavorites } from '@/hooks/use-favorites';
import { useComparisons } from '@/hooks/use-comparisons';
import { useSavedSearches } from '@/hooks/use-saved-searches';
import { useReservations } from '@/hooks/use-reservations';
import { useViewings } from '@/hooks/use-viewings';
import { useMessages } from '@/hooks/use-messages';
import { useBuyerVerification } from '@/hooks/use-buyer-verification';
import { useBuyerDisputes } from '@/hooks/use-buyer-disputes';
import { useBuyerInquiries } from '@/hooks/use-buyer-inquiries';
import { useRecommendations } from '@/hooks/use-recommendations';
import { usePhoneVerification } from '@/hooks/use-phone-verification';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useNotifications } from '@/hooks/use-notifications';
import { useWatchlist } from '@/hooks/use-watchlist';
import { useSession } from '@/hooks/use-session';
import { formatPriceMillions } from '@/lib/marketplace';

const sidebar = [
  { icon: Home, label: 'Обзор' },
  { icon: Heart, label: 'Избранное' },
  { icon: Scale, label: 'Сравнения' },
  { icon: BookmarkCheck, label: 'Сохранённые поиски' },
  { icon: Sparkles, label: 'Рекомендации' },
  { icon: CalendarDays, label: 'Мои просмотры' },
  { icon: WalletCards, label: 'Бронирования' },
  { icon: Inbox, label: 'Мои обращения' },
  { icon: Clock3, label: 'Недавно просмотрено' },
  { icon: AlertTriangle, label: 'Споры' },
  { icon: MessageCircle, label: 'Сообщения' },
  { icon: Bell, label: 'Уведомления' },
  { icon: BellRing, label: 'Подписки' },
  { icon: Settings, label: 'Профиль и безопасность' },
];

const profileAnchors: Record<string, string> = {
  Избранное: 'favorites',
  'Мои просмотры': 'viewings',
  Бронирования: 'reservation',
  'Профиль и безопасность': 'security',
};

const inquiryTypeLabels = {
  consultation: 'Консультация',
  viewing: 'Просмотр',
  reservation: 'Бронирование',
  chat: 'Сообщение',
  manual: 'Обращение',
} as const;
const inquiryStatusLabels: Record<string, string> = {
  new: 'Новое',
  contact_required: 'Ждёт звонка',
  contacted: 'Связались',
  consultation: 'Консультация',
  selection: 'Подбор',
  viewing_scheduled: 'Просмотр назначен',
  viewing_completed: 'Просмотр состоялся',
  reservation: 'Бронирование',
  deal_in_progress: 'Сделка в работе',
  won: 'Завершено',
  lost: 'Закрыто',
};

function profileDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(`${value.replace(' ', 'T')}Z`))
    .replace('.', '');
}

export default function BuyerProfile() {
  const [active, setActive] = useState('Обзор');
  const { favorites } = useFavorites();
  const { items: comparisons } = useComparisons();
  const { searches, setNotifications: setSearchNotifications } =
    useSavedSearches();
  const recommendations = useRecommendations();
  const phone = usePhoneVerification();
  const notifications = useNotifications();
  const watchlist = useWatchlist();
  const { session } = useSession();
  const { reservations } = useReservations();
  const {
    disputes,
    loading: disputesLoading,
    error: disputesError,
    reload: reloadDisputes,
  } = useBuyerDisputes();
  const {
    inquiries,
    loading: inquiriesLoading,
    error: inquiriesError,
  } = useBuyerInquiries();
  const recentViews = useRecentlyViewed();
  const { viewings } = useViewings();
  const { conversations, reload: reloadMessages } = useMessages();
  const {
    verification,
    loading: verificationLoading,
    reload: reloadVerification,
  } = useBuyerVerification();
  const unreadMessages = conversations.reduce(
    (total, conversation) => total + Number(conversation.unread_count),
    0,
  );
  const verificationProgress =
    verification?.status === 'verified' ? 100 : verification ? 82 : 65;
  const verificationLabel =
    verification?.status === 'verified'
      ? 'Проверенный покупатель'
      : verification?.status === 'rejected'
        ? 'Нужны новые данные'
        : verification
          ? 'На проверке'
          : 'Базовый аккаунт';
  const activeReservation = reservations[0];
  const activeDispute = disputes.find(
    (item) =>
      item.reservation_id === activeReservation?.id &&
      ['open', 'in_review'].includes(item.status),
  );
  const reservationDate =
    activeReservation?.reservation_expires_at ??
    activeReservation?.hold_expires_at;
  const profileName = session?.user.fullName || 'Пользователь EstateHub';
  const profileInitials =
    profileName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'EH';
  const firstName = profileName.split(/\s+/)[0] || 'покупатель';
  const canOpenAdmin = session?.permissions.includes('VIEW_ADMIN');
  const canOpenDeveloper = session?.permissions.includes(
    'VIEW_DEVELOPER_DASHBOARD',
  );

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get('section');
    const sections: Record<string, string> = {
      favorites: 'Избранное',
      notifications: 'Уведомления',
      messages: 'Сообщения',
      reservations: 'Бронирования',
    };
    if (section && sections[section]) setActive(sections[section]);
  }, []);
  const selectSection = (label: string) => {
    setActive(label);
    if (label === 'Обзор') window.scrollTo({ top: 0, behavior: 'smooth' });
    const anchor = profileAnchors[label];
    if (anchor)
      window.setTimeout(
        () =>
          document
            .getElementById(anchor)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        0,
      );
  };
  return (
    <main className="buyer-profile-page">
      <MarketplaceHeader />
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-person">
            <span>{profileInitials}</span>
            <div>
              <strong>{profileName}</strong>
              <small
                className={
                  phone.verification.status === 'verified' ? '' : 'pending'
                }
              >
                <ShieldCheck />{' '}
                {phone.loading
                  ? 'Проверяем телефон…'
                  : phone.verification.status === 'verified'
                    ? 'Телефон подтверждён'
                    : 'Нужно подтвердить телефон'}
              </small>
            </div>
          </div>
          {(canOpenAdmin || canOpenDeveloper) && (
            <div className="profile-role-links">
              {canOpenAdmin && (
                <Link href="/admin">
                  <ShieldCheck /> Панель администратора
                </Link>
              )}
              {canOpenDeveloper && (
                <Link href="/developer">
                  <Building2 /> Кабинет компании
                </Link>
              )}
            </div>
          )}
          <nav>
            {sidebar.map((item) => {
              const count =
                item.label === 'Избранное'
                  ? favorites.length
                  : item.label === 'Сравнения'
                    ? comparisons.length
                    : item.label === 'Сохранённые поиски'
                      ? searches.length
                      : item.label === 'Мои просмотры'
                        ? viewings.length
                        : item.label === 'Бронирования'
                          ? reservations.length
                          : item.label === 'Мои обращения'
                            ? inquiries.length
                            : item.label === 'Недавно просмотрено'
                              ? recentViews.items.length
                              : item.label === 'Споры'
                                ? disputes.filter((dispute) =>
                                    ['open', 'in_review'].includes(
                                      dispute.status,
                                    ),
                                  ).length
                                : item.label === 'Сообщения'
                                  ? unreadMessages || conversations.length
                                  : item.label === 'Уведомления'
                                    ? notifications.unreadCount
                                    : item.label === 'Подписки'
                                      ? watchlist.subscriptions.length +
                                        searches.filter((search) =>
                                          Boolean(search.notifications_enabled),
                                        ).length
                                      : 0;
              return (
                <button
                  type="button"
                  className={active === item.label ? 'active' : ''}
                  onClick={() => selectSection(item.label)}
                  key={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                  {count ? <em>{count}</em> : null}
                </button>
              );
            })}
          </nav>
          <LogoutButton className="profile-logout" />
        </aside>
        <section className="profile-content">
          <div className="profile-welcome">
            <div>
              <span>Личный кабинет</span>
              <h1>Добрый день, {firstName} 👋</h1>
              <p>Ваши объекты, встречи и бронирования — в одном месте.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => selectSection('Профиль и безопасность')}
            >
              <Settings /> Настроить профиль
            </Button>
          </div>
          <nav
            className="profile-mobile-tabs"
            aria-label="Разделы личного кабинета"
          >
            {sidebar.map((item) => (
              <button
                type="button"
                className={active === item.label ? 'active' : ''}
                onClick={() => selectSection(item.label)}
                key={item.label}
              >
                <item.icon />
                {item.label}
              </button>
            ))}
            <LogoutButton className="profile-mobile-logout" />
          </nav>

          {active === 'Сравнения' && (
            <section className="profile-feature-panel">
              <div>
                <span>
                  <Scale />
                </span>
                <div>
                  <small>Подбор квартир</small>
                  <h2>Сравнения</h2>
                  <p>
                    {comparisons.length
                      ? `В сравнении ${comparisons.length} из 4 квартир.`
                      : 'Добавьте квартиры со страниц ЖК, чтобы увидеть их параметры рядом.'}
                  </p>
                </div>
              </div>
              {comparisons.length ? (
                <div className="profile-feature-list">
                  {comparisons.map((item) => (
                    <Link key={item.id} href={`/complex/${item.slug}`}>
                      {item.complex_name} · № {item.unit_number}
                      <ChevronRight />
                    </Link>
                  ))}
                </div>
              ) : null}
              <Button
                nativeButton={false}
                render={
                  <Link href={comparisons.length ? '/compare' : '/catalog'} />
                }
              >
                {comparisons.length ? 'Открыть сравнение' : 'Перейти в каталог'}
              </Button>
            </section>
          )}
          {active === 'Сохранённые поиски' && (
            <section className="profile-feature-panel">
              <div>
                <span>
                  <BookmarkCheck />
                </span>
                <div>
                  <small>Ваши предпочтения</small>
                  <h2>Сохранённые поиски</h2>
                  <p>
                    {searches.length
                      ? 'Откройте поиск — фильтры можно уточнить в каталоге.'
                      : 'Сохраните текущие фильтры в каталоге, чтобы быстро вернуться к подборке.'}
                  </p>
                </div>
              </div>
              {searches.length ? (
                <div className="profile-feature-list">
                  {searches.map((item) => (
                    <Link
                      key={item.id}
                      href={`/catalog?${new URLSearchParams(Object.entries(item.filters).map(([key, value]) => [key, String(value)])).toString()}`}
                    >
                      {item.name}
                      <ChevronRight />
                    </Link>
                  ))}
                </div>
              ) : null}
              <Button nativeButton={false} render={<Link href="/catalog" />}>
                Открыть каталог
              </Button>
            </section>
          )}
          {active === 'Рекомендации' && (
            <section className="profile-feature-panel recommendation-panel">
              <div>
                <span>
                  <Sparkles />
                </span>
                <div>
                  <small>Персональная подборка</small>
                  <h2>Рекомендации для вас</h2>
                  <p>
                    {recommendations.loading
                      ? 'Сопоставляем сохранённые критерии с актуальным каталогом…'
                      : recommendations.basis
                        ? `Основа: ${recommendations.basis.label}.`
                        : 'Показываем проверенные предложения из каталога.'}
                  </p>
                </div>
              </div>
              {recommendations.error && (
                <p className="profile-empty">{recommendations.error}</p>
              )}
              {recommendations.recommendations.length > 0 && (
                <div className="recommendation-grid">
                  {recommendations.recommendations.map((item) => (
                    <Link href={`/complex/${item.slug}`} key={item.id}>
                      <img src={item.image} alt="" />
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          от {formatPriceMillions(item.priceFrom)} сум
                        </span>
                        <small>{item.reasons.join(' · ')}</small>
                      </div>
                      <ChevronRight />
                    </Link>
                  ))}
                </div>
              )}
              <p className="recommendation-disclosure">
                {recommendations.disclosure}
              </p>
            </section>
          )}
          {active === 'Сообщения' && (
            <section
              className="profile-feature-panel profile-messages-panel"
              id="messages"
            >
              <div>
                <span>
                  <MessageCircle />
                </span>
                <div>
                  <small>Прямой контакт</small>
                  <h2>Сообщения продавцам</h2>
                  <p>
                    {conversations.length
                      ? `${conversations.length} ${conversations.length === 1 ? 'диалог' : 'диалога'} с контекстом квартиры и продавца.`
                      : 'Напишите продавцу со страницы квартиры — диалог сохранится здесь.'}
                  </p>
                </div>
              </div>
              {conversations.length ? (
                <div className="profile-message-list">
                  {conversations.map((conversation) => (
                    <ChatDialog
                      key={conversation.id}
                      listingId={conversation.listing_id}
                      complexName={conversation.complex_name}
                      unitNumber={conversation.unit_number}
                      seller={conversation.seller}
                      onMessageSent={() => void reloadMessages()}
                      trigger={
                        <button type="button">
                          <img
                            src={conversation.image}
                            alt={conversation.complex_name}
                          />
                          <span>
                            <strong>{conversation.seller}</strong>
                            <small>
                              {conversation.complex_name} · №{' '}
                              {conversation.unit_number}
                            </small>
                            <em>
                              {conversation.last_message ?? 'Диалог создан'}
                            </em>
                          </span>
                          {Number(conversation.unread_count) > 0 ? (
                            <b>{conversation.unread_count}</b>
                          ) : (
                            <ChevronRight />
                          )}
                        </button>
                      }
                    />
                  ))}
                </div>
              ) : (
                <Button nativeButton={false} render={<Link href="/catalog" />}>
                  Найти квартиру
                </Button>
              )}
            </section>
          )}
          {active === 'Споры' && (
            <section className="profile-feature-panel profile-disputes-panel">
              <div>
                <span>
                  <AlertTriangle />
                </span>
                <div>
                  <small>Защита покупателя</small>
                  <h2>Споры по бронированиям</h2>
                  <p>
                    {disputesLoading
                      ? 'Загружаем обращения…'
                      : disputes.length
                        ? 'Здесь видны статус, решение и комментарий финансового специалиста.'
                        : 'Если застройщик не соблюдает условия оплаченной брони, откройте спор из карточки бронирования.'}
                  </p>
                </div>
              </div>
              {disputesError && (
                <p className="profile-empty">{disputesError}</p>
              )}
              {disputes.length ? (
                <div className="buyer-dispute-list">
                  {disputes.map((dispute) => (
                    <article key={dispute.id}>
                      <span className={`buyer-dispute-state ${dispute.status}`}>
                        <AlertTriangle />
                      </span>
                      <div>
                        <strong>
                          {dispute.complex_name} · № {dispute.unit_number}
                        </strong>
                        <small>
                          {dispute.status === 'open'
                            ? 'Новое обращение'
                            : dispute.status === 'in_review'
                              ? 'Финансовый специалист рассматривает спор'
                              : dispute.status === 'resolved_refund'
                                ? 'Полный возврат одобрен'
                                : 'Спор закрыт без возврата'}
                        </small>
                        {dispute.resolution_note && (
                          <p>{dispute.resolution_note}</p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {dispute.priority === 'high'
                          ? 'Высокий приоритет'
                          : 'Обычный'}
                      </Badge>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          )}
          {active === 'Уведомления' && (
            <NotificationCenter
              notifications={notifications.notifications}
              unreadCount={notifications.unreadCount}
              preferences={notifications.preferences}
              channelStatus={notifications.channelStatus}
              loading={notifications.loading}
              processing={notifications.processing}
              error={notifications.error}
              feedback={notifications.feedback}
              onRead={notifications.markRead}
              onReadAll={notifications.markAllRead}
              onPreferences={notifications.savePreferences}
            />
          )}
          {active === 'Подписки' && (
            <BuyerWatchlistPanel
              subscriptions={watchlist.subscriptions}
              savedSearches={searches}
              loading={watchlist.loading}
              processing={watchlist.processing}
              error={watchlist.error}
              feedback={watchlist.feedback}
              onRemove={watchlist.remove}
              onToggleSearch={setSearchNotifications}
            />
          )}
          {active === 'Мои обращения' && (
            <section className="profile-feature-panel buyer-inquiries-panel">
              <div>
                <span>
                  <Inbox />
                </span>
                <div>
                  <small>История контактов</small>
                  <h2>Мои обращения</h2>
                  <p>
                    Консультации, просмотры и бронирования с актуальным статусом
                    из CRM.
                  </p>
                </div>
              </div>
              {inquiriesError && (
                <p className="profile-empty">{inquiriesError}</p>
              )}
              {inquiriesLoading ? (
                <div className="profile-panel-loading">
                  <span className="catalog-loader" /> Загружаем обращения…
                </div>
              ) : inquiries.length ? (
                <div className="buyer-inquiry-list">
                  {inquiries.map((inquiry) => (
                    <Link
                      href={
                        inquiry.listing_id
                          ? `/listing/${inquiry.listing_id}`
                          : `/complex/${inquiry.slug}`
                      }
                      key={inquiry.id}
                    >
                      <NextImage
                        src={inquiry.image}
                        width={104}
                        height={78}
                        unoptimized
                        alt={inquiry.complex_name}
                      />
                      <div>
                        <span>{inquiryTypeLabels[inquiry.lead_type]}</span>
                        <strong>
                          {inquiry.complex_name}
                          {inquiry.unit_number
                            ? ` · № ${inquiry.unit_number}`
                            : ''}
                        </strong>
                        <small>
                          {inquiry.message ||
                            'Заявка передана ответственному менеджеру'}
                        </small>
                        <em>Обновлено {profileDate(inquiry.updated_at)}</em>
                      </div>
                      <Badge variant="secondary">
                        {inquiryStatusLabels[inquiry.status] ?? inquiry.status}
                      </Badge>
                      <ChevronRight />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="profile-panel-empty">
                  <Inbox />
                  <strong>Обращений пока нет</strong>
                  <p>
                    Запросите консультацию или просмотр на странице квартиры —
                    статус появится здесь.
                  </p>
                  <Button
                    nativeButton={false}
                    render={<Link href="/catalog" />}
                  >
                    Найти квартиру
                  </Button>
                </div>
              )}
            </section>
          )}
          {active === 'Недавно просмотрено' && (
            <section className="profile-feature-panel recently-viewed-panel">
              <div>
                <span>
                  <Clock3 />
                </span>
                <div>
                  <small>История выбора</small>
                  <h2>Недавно просмотрено</h2>
                  <p>
                    Последние открытые жилые комплексы и квартиры, сохранённые в
                    вашем аккаунте.
                  </p>
                </div>
              </div>
              {recentViews.error && (
                <p className="profile-empty">{recentViews.error}</p>
              )}
              {recentViews.loading ? (
                <div className="profile-panel-loading">
                  <span className="catalog-loader" /> Загружаем историю…
                </div>
              ) : recentViews.items.length ? (
                <div className="recently-viewed-grid">
                  {recentViews.items.map((item) => (
                    <Link
                      href={
                        item.listing_id
                          ? `/listing/${item.listing_id}`
                          : `/complex/${item.slug}`
                      }
                      key={item.id}
                    >
                      <NextImage
                        src={item.image}
                        width={300}
                        height={180}
                        unoptimized
                        alt={item.complex_name}
                      />
                      <div>
                        <span>
                          {item.target_type === 'listing'
                            ? `Квартира № ${item.unit_number}`
                            : 'Жилой комплекс'}
                        </span>
                        <strong>{item.complex_name}</strong>
                        <small>
                          {item.listing_id
                            ? `${item.rooms}-комнатная · ${item.area_sqm} м²`
                            : item.completion_label}
                        </small>
                        {item.price_uzs ? (
                          <b>{formatPriceMillions(item.price_uzs)} сум</b>
                        ) : null}
                        <em>{profileDate(item.viewed_at)}</em>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="profile-panel-empty">
                  <Clock3 />
                  <strong>История пока пуста</strong>
                  <p>
                    Откройте несколько ЖК или квартир — они появятся здесь
                    автоматически.
                  </p>
                  <Button
                    nativeButton={false}
                    render={<Link href="/catalog" />}
                  >
                    Открыть каталог
                  </Button>
                </div>
              )}
            </section>
          )}

          <div className="profile-status-grid">
            <article>
              <span className="profile-stat-icon blue">
                <Heart />
              </span>
              <div>
                <strong>{favorites.length}</strong>
                <small>в избранном</small>
              </div>
              <a href="#favorites">
                <ChevronRight />
              </a>
            </article>
            <article>
              <span className="profile-stat-icon orange">
                <CalendarDays />
              </span>
              <div>
                <strong>{viewings.length}</strong>
                <small>записей на просмотр</small>
              </div>
              <a href="#viewings">
                <ChevronRight />
              </a>
            </article>
            <article>
              <span className="profile-stat-icon green">
                <WalletCards />
              </span>
              <div>
                <strong>{reservations.length}</strong>
                <small>активных броней</small>
              </div>
              <a href="#reservation">
                <ChevronRight />
              </a>
            </article>
            <article>
              <span className="profile-stat-icon violet">
                <MessageCircle />
              </span>
              <div>
                <strong>{conversations.length}</strong>
                <small>диалогов с продавцами</small>
              </div>
              <button
                type="button"
                aria-label="Открыть сообщения"
                onClick={() => setActive('Сообщения')}
              >
                <ChevronRight />
              </button>
            </article>
          </div>

          <div className="profile-main-grid">
            <div>
              <section className="active-reservation" id="reservation">
                {activeReservation ? (
                  <>
                    <div className="profile-section-heading">
                      <div>
                        <Badge>
                          <Clock3 />{' '}
                          {activeReservation.status === 'confirmed'
                            ? 'Активная бронь'
                            : 'Ожидает оплаты'}
                        </Badge>
                        {activeDispute && (
                          <Badge variant="secondary">
                            <AlertTriangle /> Спор{' '}
                            {activeDispute.status === 'in_review'
                              ? 'в работе'
                              : 'открыт'}
                          </Badge>
                        )}
                        <h2>Квартира № {activeReservation.unit_number}</h2>
                        <p>
                          {activeReservation.complex_name} ·{' '}
                          {activeReservation.rooms} комнаты ·{' '}
                          {activeReservation.area_sqm} м²
                        </p>
                      </div>
                      <Link href={`/complex/${activeReservation.slug}`}>
                        Открыть квартиру
                      </Link>
                    </div>
                    <div className="reservation-summary">
                      <img
                        src={activeReservation.image}
                        alt={`Квартира ${activeReservation.unit_number}`}
                      />
                      <div>
                        <div className="reservation-summary-top">
                          <span>Цена зафиксирована</span>
                          <strong>
                            {formatPriceMillions(activeReservation.price_uzs)}{' '}
                            сум
                          </strong>
                        </div>
                        <div className="reservation-countdown">
                          <span>
                            <Clock3 />{' '}
                            {activeReservation.status === 'confirmed'
                              ? 'Бронь действует до'
                              : 'Оплатить до'}
                          </span>
                          <strong>
                            {reservationDate
                              ? new Intl.DateTimeFormat('ru-RU', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                }).format(
                                  new Date(
                                    `${reservationDate.replace(' ', 'T')}Z`,
                                  ),
                                )
                              : '—'}
                          </strong>
                        </div>
                        <Progress
                          value={
                            activeReservation.status === 'confirmed' ? 66 : 25
                          }
                        />
                        <p>
                          {activeReservation.status === 'confirmed'
                            ? 'Оплата зарегистрирована. Посетите офис продаж до окончания срока брони.'
                            : `Квартира удержана. Завершите оплату бронирования: ${formatPriceMillions(activeReservation.reservation_fee_uzs)} сум.`}
                        </p>
                        <div>
                          <ChatDialog
                            listingId={activeReservation.listing_id}
                            complexName={activeReservation.complex_name}
                            unitNumber={activeReservation.unit_number}
                            seller={activeReservation.seller}
                            onMessageSent={() => void reloadMessages()}
                            trigger={
                              <Button>
                                <MessageCircle /> Написать менеджеру
                              </Button>
                            }
                          />
                          {activeReservation.status === 'confirmed' &&
                          activeReservation.payment_status === 'paid' ? (
                            activeDispute ? (
                              <Button variant="outline" disabled>
                                <AlertTriangle /> Спор рассматривается
                              </Button>
                            ) : (
                              <ReservationDisputeDialog
                                reservationId={activeReservation.id}
                                complexName={activeReservation.complex_name}
                                unitNumber={activeReservation.unit_number}
                                onSubmitted={() => void reloadDisputes()}
                                trigger={
                                  <Button variant="outline">
                                    <AlertTriangle /> Сообщить о проблеме
                                  </Button>
                                }
                              />
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="reservation-steps">
                      <div
                        className={
                          activeReservation.payment_status === 'paid'
                            ? 'done'
                            : 'active'
                        }
                      >
                        <span>
                          {activeReservation.payment_status === 'paid' ? (
                            <Check />
                          ) : (
                            '1'
                          )}
                        </span>
                        <p>
                          <strong>Оплата брони</strong>
                          <small>
                            {formatPriceMillions(
                              activeReservation.reservation_fee_uzs,
                            )}{' '}
                            сум
                          </small>
                        </p>
                      </div>
                      <i />
                      <div
                        className={
                          activeReservation.status === 'confirmed'
                            ? 'active'
                            : ''
                        }
                      >
                        <span>2</span>
                        <p>
                          <strong>Визит в офис</strong>
                          <small>в течение 72 часов</small>
                        </p>
                      </div>
                      <i />
                      <div>
                        <span>3</span>
                        <p>
                          <strong>Решение</strong>
                          <small>покупка или отказ</small>
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="reservation-empty">
                    <WalletCards />
                    <div>
                      <h2>Активных броней нет</h2>
                      <p>
                        Когда вы оплатите онлайн-бронь, здесь появятся
                        зафиксированная цена и срок визита.
                      </p>
                    </div>
                    <Button
                      nativeButton={false}
                      render={<Link href="/catalog?market=primary" />}
                    >
                      Выбрать квартиру
                    </Button>
                  </div>
                )}
              </section>

              <section className="profile-card-section" id="favorites">
                <div className="profile-section-heading">
                  <div>
                    <span>Сохранено для вас</span>
                    <h2>Избранные объекты</h2>
                  </div>
                  <Link href="/catalog">Смотреть каталог</Link>
                </div>
                {favorites.length ? (
                  <div className="favorite-mini-grid">
                    {favorites.slice(0, 4).map((favorite) => (
                      <Link
                        key={favorite.id}
                        href={`/complex/${favorite.slug}`}
                      >
                        <img src={favorite.image} alt={favorite.name} />
                        <div>
                          <strong>{favorite.name}</strong>
                          <span>
                            от {formatPriceMillions(favorite.price_from)} сум
                          </span>
                          <small>
                            {favorite.available_units} квартир ·{' '}
                            {favorite.completion_label}
                          </small>
                        </div>
                        <Heart />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="profile-empty">
                    В избранном пока нет объектов. Сохраняйте понравившиеся ЖК
                    из каталога.
                  </p>
                )}
              </section>
            </div>

            <aside className="profile-right-rail">
              <section
                className={`phone-status-card ${phone.verification.status}`}
                id="security"
              >
                <div>
                  <span>
                    <ShieldCheck />
                  </span>
                  <Badge variant="secondary">
                    {phone.loading
                      ? 'Проверяем…'
                      : phone.verification.status === 'verified'
                        ? 'Базовый аккаунт'
                        : 'Требуется OTP'}
                  </Badge>
                </div>
                <h2>
                  {phone.verification.status === 'verified'
                    ? 'Телефон подтверждён'
                    : 'Подтвердите телефон'}
                </h2>
                <p>
                  {phone.verification.status === 'verified'
                    ? `${phone.verification.phone} · персональные функции доступны.`
                    : 'Это требуется для избранного, сообщений, сравнений, просмотров и сохранённых поисков.'}
                </p>
                {phone.error && <small>{phone.error}</small>}
                {phone.verification.status === 'verified' ? (
                  <Button disabled>
                    <Check /> Подтверждено
                  </Button>
                ) : (
                  <PhoneVerificationDialog
                    onVerified={() => window.location.reload()}
                    trigger={<Button>Подтвердить номер</Button>}
                  />
                )}
              </section>
              <section
                className={`verification-card verification-${verification?.status ?? 'new'}`}
              >
                <div>
                  <span>
                    <ShieldCheck />
                  </span>
                  <Badge variant="secondary">
                    {verificationLoading ? 'Загружаем…' : verificationLabel}
                  </Badge>
                </div>
                <h2>
                  {verification?.status === 'verified'
                    ? 'Личность подтверждена'
                    : verification?.status === 'rejected'
                      ? 'Проверка не пройдена'
                      : verification
                        ? 'Проверяем ваши данные'
                        : 'Подтвердите личность заранее'}
                </h2>
                <p>
                  {verification?.status === 'verified'
                    ? 'Вы можете пользоваться платным онлайн-бронированием.'
                    : verification?.status === 'rejected'
                      ? (verification.rejection_reason ??
                        'Исправьте данные и отправьте заявку повторно.')
                      : verification
                        ? 'Решение специалиста появится здесь. Обычно это занимает до одного рабочего дня.'
                        : 'Проверка обязательна перед первой платной бронью.'}
                </p>
                <div>
                  <span>
                    Готовность профиля <strong>{verificationProgress}%</strong>
                  </span>
                  <Progress value={verificationProgress} />
                </div>
                {phone.verification.status !== 'verified' ? (
                  <Button disabled>Сначала подтвердите телефон</Button>
                ) : verificationLoading ? (
                  <Button disabled>Загружаем статус…</Button>
                ) : verification?.status === 'verified' ? (
                  <Button disabled>
                    <Check /> Подтверждено
                  </Button>
                ) : verification &&
                  ['submitted', 'in_review'].includes(verification.status) ? (
                  <Button disabled>Заявка на проверке</Button>
                ) : (
                  <BuyerVerificationDialog
                    onSubmitted={() => void reloadVerification()}
                    trigger={
                      <Button>
                        {verification?.status === 'rejected'
                          ? 'Подать заново'
                          : 'Пройти проверку'}
                      </Button>
                    }
                  />
                )}
              </section>
              <section className="profile-card-section" id="viewings">
                <div className="profile-section-heading">
                  <div>
                    <span>Ближайшие события</span>
                    <h2>Мои просмотры</h2>
                  </div>
                </div>
                {viewings.length ? (
                  viewings.slice(0, 3).map((viewing) => {
                    const date = new Date(
                      `${viewing.requested_date}T00:00:00Z`,
                    );
                    return (
                      <article className="viewing-item" key={viewing.id}>
                        <div>
                          <strong>
                            {new Intl.DateTimeFormat('ru-RU', {
                              day: '2-digit',
                            }).format(date)}
                          </strong>
                          <span>
                            {new Intl.DateTimeFormat('ru-RU', {
                              month: 'short',
                            })
                              .format(date)
                              .replace('.', '')}
                          </span>
                        </div>
                        <p>
                          <strong>
                            {viewing.complex_name}
                            {viewing.unit_number
                              ? ` · № ${viewing.unit_number}`
                              : ''}
                          </strong>
                          <span>
                            {viewing.requested_date} · {viewing.time_slot}
                          </span>
                          <small>
                            {viewing.status === 'confirmed'
                              ? 'Менеджер подтвердил встречу'
                              : viewing.status === 'rescheduled'
                                ? 'Требуется согласовать новое время'
                                : 'Ожидает подтверждения'}
                          </small>
                        </p>
                        <Badge
                          variant={
                            viewing.status === 'confirmed'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {viewing.status === 'confirmed'
                            ? 'Подтверждено'
                            : viewing.status === 'rescheduled'
                              ? 'Перенос'
                              : 'Ожидает'}
                        </Badge>
                      </article>
                    );
                  })
                ) : (
                  <p className="profile-empty">
                    Запишитесь на просмотр на странице ЖК — здесь появятся время
                    и статус подтверждения.
                  </p>
                )}
              </section>
              <section className="preference-card">
                <span>Ваша AI-подборка</span>
                <h2>
                  {recommendations.basis?.label ?? 'Проверенные предложения'}
                </h2>
                <p>
                  {recommendations.loading
                    ? 'Обновляем по актуальному каталогу…'
                    : `${recommendations.recommendations.length} подходящих ЖК по вашим критериям`}
                </p>
                <div>
                  <span>
                    <Sparkles />
                  </span>
                  <p>
                    <strong>Критерии прозрачны</strong>
                    <small>Причины показаны у каждого объекта</small>
                  </p>
                </div>
                <button type="button" onClick={() => setActive('Рекомендации')}>
                  Открыть рекомендации <ChevronRight />
                </button>
              </section>
            </aside>
          </div>
        </section>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
        <Link href="/">
          <Home />
          <span>Главная</span>
        </Link>
        <Link href="/catalog">
          <Search />
          <span>Поиск</span>
        </Link>
        <a href="#favorites">
          <Heart />
          <span>Избранное</span>
        </a>
        <a href="#messages">
          <MessageCircle />
          <span>Сообщения</span>
        </a>
        <Link className="active" href="/profile">
          <UserRound />
          <span>Профиль</span>
        </Link>
      </nav>
    </main>
  );
}
