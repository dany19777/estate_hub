'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Home,
  LoaderCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tag,
} from 'lucide-react';

import { InternalLink as Link } from '@/components/internal-link';
import { MarketplaceHeader } from '@/components/marketplace-header';
import { PhoneVerificationDialog } from '@/components/phone-verification-dialog';
import { Button } from '@/components/ui/button';
import { usePhoneVerification } from '@/hooks/use-phone-verification';
import { SellerListing, useSellerListings } from '@/hooks/use-seller-listings';
import { formatPriceMillions } from '@/lib/marketplace';

const statusMeta: Record<
  string,
  { label: string; tone: string; help: string }
> = {
  pending_verification: {
    label: 'Проверка документов',
    tone: 'amber',
    help: 'Специалист сверяет право собственности.',
  },
  pending_moderation: {
    label: 'Ожидает оплаты',
    tone: 'blue',
    help: 'Документы одобрены. Объявление откроется после подтверждения перевода.',
  },
  published: {
    label: 'Опубликовано',
    tone: 'green',
    help: 'Объявление видно покупателям.',
  },
  rejected: {
    label: 'Нужно исправить',
    tone: 'red',
    help: 'Исправьте данные и отправьте повторно.',
  },
  expired: {
    label: 'Срок закончился',
    tone: 'gray',
    help: 'Продлите размещение ещё на 30 дней.',
  },
  sold: {
    label: 'Продано',
    tone: 'gray',
    help: 'Объявление сохранено в истории.',
  },
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value.replace(' ', 'T')}Z`));
}

function ListingCard({
  listing,
  processing,
  onAction,
  paymentConfigured,
}: {
  listing: SellerListing;
  processing: string;
  onAction: (
    name: 'submit_payment' | 'price' | 'sold' | 'resubmit',
  ) => void;
  paymentConfigured: boolean;
}) {
  const meta = statusMeta[listing.status] ?? {
    label: listing.status,
    tone: 'gray',
    help: 'Статус объявления обновляется автоматически.',
  };
  const paid = Boolean(
    listing.paid_until &&
    new Date(`${listing.paid_until.replace(' ', 'T')}Z`) > new Date(),
  );
  return (
    <article className="seller-listing-card">
      <img src={listing.image} alt="" />
      <div className="seller-listing-main">
        <div className="seller-listing-title">
          <div>
            <span>{listing.complex_name}</span>
            <h3>Квартира № {listing.unit_number}</h3>
          </div>
          <strong>{formatPriceMillions(listing.price_uzs)} сум</strong>
        </div>
        <div className="seller-listing-facts">
          <span>{listing.rooms} комн.</span>
          <span>{listing.area_sqm} м²</span>
          <span>
            {listing.floor_number}/{listing.total_floors} этаж
          </span>
          <span>{listing.finish}</span>
        </div>
        <div className="seller-listing-state">
          <span className={meta.tone}>{meta.label}</span>
          <p>{listing.rejection_reason ?? (listing.payment_claim_status === 'pending' ? 'Номер перевода получен. Ожидается сверка банковской выписки.' : meta.help)}</p>
          {listing.payment_claim_status === 'failed' && <p>Перевод не подтверждён: {listing.payment_claim_reason ?? 'уточните данные и отправьте номер операции повторно'}.</p>}
          {listing.verification_status === 'approved' && !paid && !paymentConfigured && <p>Реквизиты для перевода пока настраиваются. Объявление остаётся скрытым.</p>}
        </div>
        <div className="seller-listing-footer">
          <div>
            <small>Размещение</small>
            <strong>
              {paid
                ? `оплачено до ${formatDate(listing.paid_until)}`
                : 'не оплачено'}
            </strong>
          </div>
          <div className="seller-listing-actions">
            {!paid && listing.verification_status === 'approved' && listing.payment_claim_status !== 'pending' && listing.status !== 'sold' && paymentConfigured && (
              <button
                type="button"
                onClick={() => onAction('submit_payment')}
                disabled={Boolean(processing)}
              >
                <CircleDollarSign /> Реквизиты для оплаты
              </button>
            )}
            {paid && ['published', 'expired'].includes(listing.status) && listing.payment_claim_status !== 'pending' && paymentConfigured && (
              <button
                type="button"
                onClick={() => onAction('submit_payment')}
                disabled={Boolean(processing)}
              >
                <RefreshCw /> Продлить переводом
              </button>
            )}
            {!['sold'].includes(listing.status) && (
              <button
                type="button"
                onClick={() => onAction('price')}
                disabled={Boolean(processing)}
              >
                <Pencil /> Цена
              </button>
            )}
            {listing.status === 'rejected' && (
              <button
                type="button"
                onClick={() => onAction('resubmit')}
                disabled={Boolean(processing)}
              >
                <FileCheck2 /> Отправить снова
              </button>
            )}
            {['published', 'expired'].includes(listing.status) && (
              <button
                className="sold"
                type="button"
                onClick={() => onAction('sold')}
                disabled={Boolean(processing)}
              >
                <Check /> Продано
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SellerPage() {
  const phone = usePhoneVerification();
  const seller = useSellerListings();
  const [form, setForm] = useState({
    complexId: '',
    buildingId: '',
    unitNumber: '',
    rooms: '2',
    areaSqm: '64',
    floorNumber: '4',
    finish: 'С ремонтом',
    priceMillions: '750',
    documentType: 'ownership_certificate' as
      | 'ownership_certificate'
      | 'power_of_attorney',
    documentReference: '',
  });
  const buildings = useMemo(
    () => seller.complexes.filter((item) => item.id === form.complexId),
    [seller.complexes, form.complexId],
  );
  const selectedBuilding = seller.complexes.find(
    (item) => item.building_id === form.buildingId,
  );

  useEffect(() => {
    if (!form.complexId && seller.complexes[0])
      setForm((current) => ({
        ...current,
        complexId: seller.complexes[0].id,
        buildingId: seller.complexes[0].building_id,
      }));
  }, [seller.complexes, form.complexId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBuilding) return;
    try {
      await seller.create({
        complexId: form.complexId,
        buildingId: form.buildingId,
        unitNumber: form.unitNumber,
        rooms: Number(form.rooms),
        areaSqm: Number(form.areaSqm),
        floorNumber: Number(form.floorNumber),
        totalFloors: Number(selectedBuilding.total_floors),
        finish: form.finish,
        priceUzs: Math.round(Number(form.priceMillions) * 1_000_000),
        documentType: form.documentType,
        documentReference: form.documentReference,
      });
      setForm((current) => ({
        ...current,
        unitNumber: '',
        documentReference: '',
      }));
    } catch {
      /* hook renders the error */
    }
  };

  const runAction = async (
    listing: SellerListing,
    action: 'submit_payment' | 'price' | 'sold' | 'resubmit',
  ) => {
    const extra: Record<string, unknown> = {};
    if (action === 'submit_payment') {
      const options = [seller.billing.bankAccount && `1 — банк: ${seller.billing.bankName}, счёт ${seller.billing.bankAccount}`, seller.billing.cardNumber && `2 — карта: ${seller.billing.cardNumber}, ${seller.billing.cardHolder}`].filter(Boolean).join('\n');
      const choice = window.prompt(`Стоимость: ${seller.billing.feeUzs.toLocaleString('ru-RU')} сум за ${seller.billing.periodDays} дней.\nПереведите точную сумму по реквизитам:\n${options}\n\nПосле перевода введите 1 или 2 для выбранного способа:`);
      if (!choice) return;
      const method = choice.trim() === '1' && seller.billing.bankAccount ? 'bank' : choice.trim() === '2' && seller.billing.cardNumber ? 'card' : '';
      if (!method) return;
      const reference = window.prompt('Укажите номер операции из банковского чека или выписки. Объявление опубликуют только после проверки поступления денег:')?.trim();
      if (!reference) return;
      extra.method = method;
      extra.reference = reference;
    }
    if (action === 'price') {
      const next = window.prompt(
        'Новая цена, млн сум',
        String(Math.round(listing.price_uzs / 1_000_000)),
      );
      if (!next) return;
      extra.priceUzs = Math.round(Number(next.replace(',', '.')) * 1_000_000);
    }
    if (action === 'resubmit' && listing.verification_status === 'rejected') {
      const reference = window.prompt(
        'Исправленный номер или референс документа',
        listing.document_reference,
      );
      if (!reference) return;
      extra.documentReference = reference;
    }
    if (
      action === 'sold' &&
      !window.confirm(
        'Отметить квартиру как проданную? Вернуть объявление в каталог после этого нельзя.',
      )
    )
      return;
    try {
      await seller.action(listing.id, action, extra);
    } catch {
      /* hook renders the error */
    }
  };

  const published = seller.listings.filter(
    (item) => item.status === 'published',
  ).length;
  const inProgress = seller.listings.filter((item) =>
    ['pending_verification', 'pending_moderation'].includes(item.status),
  ).length;
  return (
    <main className="seller-page">
      <MarketplaceHeader active="seller" />
      <section className="seller-hero">
        <div className="shell seller-hero-inner">
          <div>
            <span>
              <Tag /> Вторичный рынок
            </span>
            <h1>
              Продайте квартиру
              <br />
              <em>прозрачно и безопасно</em>
            </h1>
            <p>
              Выберите существующий ЖК, подтвердите право собственности и
              после одобрения оплатите размещение переводом. Объявление появится в каталоге только после проверки поступления денег.
            </p>
            <a href="#create-listing">
              Создать объявление <ArrowRight />
            </a>
          </div>
          <aside>
            <strong>30 дней</strong>
            <span>срок одного размещения</span>
            <div>
              <ShieldCheck /> Проверенные продавцы
            </div>
            <div>
              <Banknote /> Фиксированная стоимость
            </div>
            <div>
              <Clock3 /> Статусы в реальном времени
            </div>
          </aside>
        </div>
      </section>

      <section className="shell seller-progress">
        <div
          className={
            phone.verification.status === 'verified' ? 'done' : 'active'
          }
        >
          <span>
            {phone.verification.status === 'verified' ? <Check /> : <Phone />}
          </span>
          <p>
            <strong>Телефон</strong>
            <small>
              {phone.verification.status === 'verified'
                ? 'Подтверждён'
                : 'Нужно подтвердить'}
            </small>
          </p>
        </div>
        <i />
        <div>
          <span>
            <FileCheck2 />
          </span>
          <p>
            <strong>Документы</strong>
            <small>Проверка собственности</small>
          </p>
        </div>
        <i />
        <div>
          <span>
            <CircleDollarSign />
          </span>
          <p>
            <strong>Размещение</strong>
            <small>{seller.billing.feeUzs.toLocaleString('ru-RU')} сум</small>
          </p>
        </div>
        <i />
        <div>
          <span>
            <BadgeCheck />
          </span>
          <p>
            <strong>Модерация</strong>
            <small>И только потом публикация</small>
          </p>
        </div>
      </section>

      <section className="shell seller-dashboard">
        <div className="seller-dashboard-heading">
          <div>
            <span>Кабинет продавца</span>
            <h2>Мои объявления</h2>
            <p>Здесь видны проверка, оплата, срок публикации и история.</p>
          </div>
          <div>
            <article>
              <strong>{seller.listings.length}</strong>
              <small>всего</small>
            </article>
            <article>
              <strong>{published}</strong>
              <small>в каталоге</small>
            </article>
            <article>
              <strong>{inProgress}</strong>
              <small>на проверке</small>
            </article>
          </div>
        </div>
        {seller.error && phone.verification.status === 'verified' && (
          <div className="seller-alert error">{seller.error}</div>
        )}
        {seller.feedback && (
          <div className="seller-alert success">{seller.feedback}</div>
        )}
        {seller.loading ? (
          <div className="seller-loading">
            <LoaderCircle /> Загружаем кабинет…
          </div>
        ) : phone.verification.status !== 'verified' ? (
          <div className="seller-phone-gate">
            <span>
              <Phone />
            </span>
            <div>
              <small>Шаг 1 из 4</small>
              <h2>Подтвердите номер телефона</h2>
              <p>
                Номер станет контактом продавца и нужен перед отправкой
                документов.
              </p>
            </div>
            <PhoneVerificationDialog
              onVerified={() => window.location.reload()}
              trigger={<Button>Подтвердить номер</Button>}
            />
          </div>
        ) : seller.listings.length ? (
          <div className="seller-listing-stack">
            {seller.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                processing={seller.processing}
                paymentConfigured={Boolean(seller.billing.bankAccount || seller.billing.cardNumber)}
                onAction={(action) => void runAction(listing, action)}
              />
            ))}
          </div>
        ) : (
          <div className="seller-empty">
            <Building2 />
            <h3>Объявлений пока нет</h3>
            <p>
              Заполните форму ниже — заявка сразу попадёт на проверку
              документов.
            </p>
            <a href="#create-listing">
              Добавить первую квартиру <ArrowRight />
            </a>
          </div>
        )}
      </section>

      <section className="seller-create-section" id="create-listing">
        <div className="shell seller-create-grid">
          <div>
            <span>Новое объявление</span>
            <h2>Данные квартиры</h2>
            <p>
              ЖК и корпус выбираются из справочника EstateHub. Продавец не может
              изменять официальные данные комплекса.
            </p>
            <div className="seller-rules">
              <div>
                <ShieldCheck />
                <p>
                  <strong>Сначала проверка</strong>
                  <small>Документ проверяет специалист платформы.</small>
                </p>
              </div>
              <div>
                <CircleDollarSign />
                <p>
                  <strong>Оплата отдельно</strong>
                  <small>
                    Оплата запускает срок, но не гарантирует одобрение.
                  </small>
                </p>
              </div>
              <div>
                <Clock3 />
                <p>
                  <strong>{seller.billing.periodDays} дней в каталоге</strong>
                  <small>После окончания объявление можно продлить.</small>
                </p>
              </div>
            </div>
          </div>
          <form className="seller-form" onSubmit={submit}>
            <div className="seller-form-heading">
              <span>
                <Plus />
              </span>
              <div>
                <strong>Добавить квартиру</strong>
                <small>Все поля обязательны</small>
              </div>
            </div>
            <label>
              Жилой комплекс
              <select
                value={form.complexId}
                onChange={(event) => {
                  const next = seller.complexes.find(
                    (item) => item.id === event.target.value,
                  );
                  setForm({
                    ...form,
                    complexId: event.target.value,
                    buildingId: next?.building_id ?? '',
                  });
                }}
              >
                {[
                  ...new Map(
                    seller.complexes.map((item) => [item.id, item]),
                  ).values(),
                ].map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · {item.district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Корпус
              <select
                value={form.buildingId}
                onChange={(event) =>
                  setForm({ ...form, buildingId: event.target.value })
                }
              >
                {buildings.map((item) => (
                  <option value={item.building_id} key={item.building_id}>
                    {item.building_name} · {item.total_floors} этажей
                  </option>
                ))}
              </select>
            </label>
            <div className="seller-form-row">
              <label>
                № квартиры
                <input
                  required
                  maxLength={30}
                  value={form.unitNumber}
                  onChange={(event) =>
                    setForm({ ...form, unitNumber: event.target.value })
                  }
                  placeholder="Например, 72"
                />
              </label>
              <label>
                Комнат
                <input
                  required
                  type="number"
                  min="1"
                  max="10"
                  value={form.rooms}
                  onChange={(event) =>
                    setForm({ ...form, rooms: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="seller-form-row three">
              <label>
                Площадь, м²
                <input
                  required
                  type="number"
                  min="10"
                  max="1000"
                  step="0.1"
                  value={form.areaSqm}
                  onChange={(event) =>
                    setForm({ ...form, areaSqm: event.target.value })
                  }
                />
              </label>
              <label>
                Этаж
                <input
                  required
                  type="number"
                  min="1"
                  max={selectedBuilding?.total_floors ?? 100}
                  value={form.floorNumber}
                  onChange={(event) =>
                    setForm({ ...form, floorNumber: event.target.value })
                  }
                />
              </label>
              <label>
                Этажей
                <input disabled value={selectedBuilding?.total_floors ?? ''} />
              </label>
            </div>
            <label>
              Состояние
              <select
                value={form.finish}
                onChange={(event) =>
                  setForm({ ...form, finish: event.target.value })
                }
              >
                <option>С ремонтом</option>
                <option>Чистовая</option>
                <option>Предчистовая</option>
                <option>Без отделки</option>
              </select>
            </label>
            <label>
              Цена, млн сум
              <input
                required
                type="number"
                min="1"
                step="1"
                value={form.priceMillions}
                onChange={(event) =>
                  setForm({ ...form, priceMillions: event.target.value })
                }
              />
            </label>
            <label>
              Основание
              <select
                value={form.documentType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    documentType: event.target
                      .value as typeof form.documentType,
                  })
                }
              >
                <option value="ownership_certificate">
                  Право собственности
                </option>
                <option value="power_of_attorney">Доверенность</option>
              </select>
            </label>
            <label>
              Номер или референс документа
              <input
                required
                minLength={5}
                maxLength={120}
                value={form.documentReference}
                onChange={(event) =>
                  setForm({ ...form, documentReference: event.target.value })
                }
                placeholder="Например, 14:16:01:02:1234"
              />
              <small>
                На этом закрытом стенде сохраняется только референс документа,
                без файла.
              </small>
            </label>
            <button
              className="seller-submit"
              type="submit"
              disabled={
                seller.processing === 'create' ||
                phone.verification.status !== 'verified'
              }
            >
              {seller.processing === 'create' ? (
                <LoaderCircle className="spinning" />
              ) : (
                <FileCheck2 />
              )}{' '}
              Отправить на проверку
            </button>
            <p className="seller-payment-note">
              <Banknote /> Реквизиты для перевода станут доступны после одобрения объявления. Наличные не принимаются.
            </p>
          </form>
        </div>
      </section>
      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
        <Link href="/">
          <Home />
          <span>Главная</span>
        </Link>
        <Link href="/catalog">
          <Building2 />
          <span>Каталог</span>
        </Link>
        <Link className="active" href="/seller">
          <Tag />
          <span>Продать</span>
        </Link>
        <Link href="/profile">
          <ShieldCheck />
          <span>Профиль</span>
        </Link>
        <a href="#create-listing">
          <Plus />
          <span>Добавить</span>
        </a>
      </nav>
    </main>
  );
}
