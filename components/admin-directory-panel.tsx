'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Ban,
  Building2,
  Check,
  ExternalLink,
  House,
  Landmark,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Organization = {
  id: string;
  slug: string;
  name: string;
  organization_type: 'developer' | 'agency';
  verification_status: string;
  members_count: number;
  complexes_count: number;
  listings_count: number;
  created_at: string;
};

type Complex = {
  id: string;
  slug: string;
  name: string;
  address: string;
  developer: string;
  verification_status: string;
  workflow_status: string;
  completion_label: string;
  listings_count: number;
  published_listings: number;
  created_at: string;
};

type Listing = {
  id: string;
  unit_number: string;
  complex_name: string;
  complex_slug: string;
  seller_name: string | null;
  market_type: string;
  price_uzs: number;
  status: string;
  expires_at: string | null;
  created_at: string;
};

type Directory = {
  organizations: Organization[];
  complexes: Complex[];
  listings: Listing[];
};

type DirectoryFocus = 'developers' | 'agencies' | 'complexes' | 'listings';
type DirectoryTab = 'organizations' | 'complexes' | 'listings';

const statusLabels: Record<string, string> = {
  pending: 'Ожидает проверки',
  verified: 'Проверено',
  rejected: 'Отклонено',
  suspended: 'Приостановлено',
  draft: 'Черновик',
  submitted: 'Отправлено',
  in_verification: 'На проверке',
  pending_moderation: 'На модерации',
  published: 'Опубликовано',
  paused: 'На паузе',
  reserved: 'Забронировано',
  sold: 'Продано',
  expired: 'Истекло',
  archived: 'В архиве',
};

const marketLabels: Record<string, string> = {
  PRIMARY_DEVELOPER: 'Новостройка',
  SECONDARY_OWNER: 'Вторичка · собственник',
  SECONDARY_AGENCY: 'Вторичка · агентство',
};

function statusClass(status: string) {
  if (['verified', 'published'].includes(status)) return 'success';
  if (['rejected', 'suspended', 'expired'].includes(status)) return 'danger';
  if (
    [
      'pending',
      'submitted',
      'in_verification',
      'pending_moderation',
      'paused',
    ].includes(status)
  )
    return 'warning';
  return 'neutral';
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} сум`;
}

export function AdminDirectoryPanel({
  query = '',
  focus,
}: {
  query?: string;
  focus?: DirectoryFocus;
}) {
  const [directory, setDirectory] = useState<Directory>({
    organizations: [],
    complexes: [],
    listings: [],
  });
  const [tab, setTab] = useState<DirectoryTab>('organizations');
  const [organizationType, setOrganizationType] = useState<
    'all' | 'developer' | 'agency'
  >('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/directory', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as Partial<Directory> & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? 'Не удалось загрузить справочник.');
      setDirectory({
        organizations: payload.organizations ?? [],
        complexes: payload.complexes ?? [],
        listings: payload.listings ?? [],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось загрузить справочник.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focus) return;
    if (focus === 'developers') {
      setTab('organizations');
      setOrganizationType('developer');
    } else if (focus === 'agencies') {
      setTab('organizations');
      setOrganizationType('agency');
    } else {
      setTab(focus);
    }
  }, [focus]);

  const normalizedQuery = query.trim().toLowerCase();
  const organizations = useMemo(
    () =>
      directory.organizations.filter(
        (item) =>
          (organizationType === 'all' ||
            item.organization_type === organizationType) &&
          (!normalizedQuery ||
            `${item.name} ${item.slug}`
              .toLowerCase()
              .includes(normalizedQuery)),
      ),
    [directory.organizations, normalizedQuery, organizationType],
  );
  const complexes = useMemo(
    () =>
      directory.complexes.filter(
        (item) =>
          !normalizedQuery ||
          `${item.name} ${item.address} ${item.developer}`
            .toLowerCase()
            .includes(normalizedQuery),
      ),
    [directory.complexes, normalizedQuery],
  );
  const listings = useMemo(
    () =>
      directory.listings.filter(
        (item) =>
          !normalizedQuery ||
          `${item.id} ${item.unit_number} ${item.complex_name} ${item.seller_name ?? ''}`
            .toLowerCase()
            .includes(normalizedQuery),
      ),
    [directory.listings, normalizedQuery],
  );

  async function update(
    entityType: 'organization' | 'complex' | 'listing',
    entityId: string,
    action: 'suspend' | 'restore' | 'archive' | 'pause' | 'resume',
  ) {
    const destructive =
      action === 'suspend' || action === 'archive' || action === 'pause';
    const reason = destructive
      ? (window
          .prompt(
            'Укажите причину изменения статуса. Она будет сохранена в журнале аудита.',
          )
          ?.trim() ?? '')
      : '';
    if (destructive && reason.length < 3) return;
    setProcessing(`${entityType}:${entityId}`);
    setFeedback('');
    setError('');
    try {
      const response = await fetch('/api/admin/directory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, action, reason }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message ?? 'Не удалось изменить статус.');
      setFeedback(payload.message ?? 'Статус обновлён.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось изменить статус.',
      );
    } finally {
      setProcessing('');
    }
  }

  return (
    <section className="admin-panel admin-directory-panel" id="directory">
      <div className="admin-panel-heading">
        <div>
          <h2>Компании и объекты</h2>
          <p>Единый реестр продавцов, жилых комплексов и объявлений</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw /> Обновить
        </Button>
      </div>
      <div
        className="admin-directory-tabs"
        role="tablist"
        aria-label="Раздел справочника"
      >
        <button
          type="button"
          className={tab === 'organizations' ? 'active' : ''}
          onClick={() => setTab('organizations')}
        >
          <Landmark /> Компании <span>{directory.organizations.length}</span>
        </button>
        <button
          type="button"
          className={tab === 'complexes' ? 'active' : ''}
          onClick={() => setTab('complexes')}
        >
          <Building2 /> ЖК <span>{directory.complexes.length}</span>
        </button>
        <button
          type="button"
          className={tab === 'listings' ? 'active' : ''}
          onClick={() => setTab('listings')}
        >
          <House /> Объявления <span>{directory.listings.length}</span>
        </button>
      </div>
      {tab === 'organizations' && (
        <div className="admin-directory-filters">
          {(['all', 'developer', 'agency'] as const).map((type) => (
            <button
              type="button"
              className={organizationType === type ? 'active' : ''}
              onClick={() => setOrganizationType(type)}
              key={type}
            >
              {type === 'all'
                ? 'Все'
                : type === 'developer'
                  ? 'Застройщики'
                  : 'Агентства'}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div className="admin-operation-state error">
          <Ban />
          <span>{error}</span>
        </div>
      )}
      {feedback && (
        <div className="admin-operation-state success">
          <Check />
          <span>{feedback}</span>
        </div>
      )}
      {loading ? (
        <div className="table-empty-state">Загружаем справочник…</div>
      ) : tab === 'organizations' ? (
        <div className="admin-entity-directory">
          {organizations.length === 0 && (
            <div className="table-empty-state">Компании не найдены.</div>
          )}
          {organizations.map((organization) => (
            <article key={organization.id}>
              <span className="admin-directory-avatar">
                <Landmark />
              </span>
              <div className="admin-directory-identity">
                <strong>{organization.name}</strong>
                <small>
                  {organization.organization_type === 'developer'
                    ? 'Застройщик'
                    : 'Агентство'}{' '}
                  · {organization.slug}
                </small>
                <em>
                  {organization.members_count} сотрудников ·{' '}
                  {organization.complexes_count} ЖК ·{' '}
                  {organization.listings_count} объявлений
                </em>
              </div>
              <Badge
                className={`admin-entity-status ${statusClass(organization.verification_status)}`}
              >
                {statusLabels[organization.verification_status] ??
                  organization.verification_status}
              </Badge>
              <button
                className={
                  organization.verification_status === 'suspended'
                    ? 'restore'
                    : 'danger'
                }
                type="button"
                disabled={Boolean(processing)}
                onClick={() =>
                  void update(
                    'organization',
                    organization.id,
                    organization.verification_status === 'suspended'
                      ? 'restore'
                      : 'suspend',
                  )
                }
              >
                {organization.verification_status === 'suspended' ? (
                  <>
                    <RotateCcw /> Вернуть
                  </>
                ) : (
                  <>
                    <Ban /> Приостановить
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      ) : tab === 'complexes' ? (
        <div className="admin-entity-directory">
          {complexes.length === 0 && (
            <div className="table-empty-state">Жилые комплексы не найдены.</div>
          )}
          {complexes.map((complex) => (
            <article key={complex.id}>
              <span className="admin-directory-avatar">
                <Building2 />
              </span>
              <div className="admin-directory-identity">
                <strong>{complex.name}</strong>
                <small>
                  {complex.developer} · {complex.address}
                </small>
                <em>
                  {complex.completion_label} · {complex.published_listings} из{' '}
                  {complex.listings_count} объявлений опубликовано
                </em>
              </div>
              <div className="admin-entity-badges">
                <Badge
                  className={`admin-entity-status ${statusClass(complex.verification_status)}`}
                >
                  {statusLabels[complex.verification_status] ??
                    complex.verification_status}
                </Badge>
                <Badge
                  className={`admin-entity-status ${statusClass(complex.workflow_status)}`}
                >
                  {statusLabels[complex.workflow_status] ??
                    complex.workflow_status}
                </Badge>
              </div>
              <div className="admin-entity-actions">
                <Link
                  href={`/complex/${complex.slug}`}
                  aria-label={`Открыть ${complex.name}`}
                >
                  <ExternalLink /> Открыть
                </Link>
                <button
                  className={
                    complex.workflow_status === 'archived'
                      ? 'restore'
                      : 'danger'
                  }
                  type="button"
                  disabled={Boolean(processing)}
                  onClick={() =>
                    void update(
                      'complex',
                      complex.id,
                      complex.workflow_status === 'archived'
                        ? 'restore'
                        : 'archive',
                    )
                  }
                >
                  {complex.workflow_status === 'archived' ? (
                    <>
                      <RotateCcw /> Вернуть
                    </>
                  ) : (
                    <>
                      <Archive /> В архив
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-entity-directory">
          {listings.length === 0 && (
            <div className="table-empty-state">Объявления не найдены.</div>
          )}
          {listings.map((listing) => {
            const canPause = listing.status === 'published';
            const canResume = listing.status === 'paused';
            return (
              <article key={listing.id}>
                <span className="admin-directory-avatar">
                  <House />
                </span>
                <div className="admin-directory-identity">
                  <strong>
                    {listing.complex_name} · № {listing.unit_number}
                  </strong>
                  <small>
                    {marketLabels[listing.market_type] ?? listing.market_type} ·{' '}
                    {listing.seller_name ?? 'Частный продавец'}
                  </small>
                  <em>
                    {formatMoney(listing.price_uzs)} · ID {listing.id}
                  </em>
                </div>
                <Badge
                  className={`admin-entity-status ${statusClass(listing.status)}`}
                >
                  {statusLabels[listing.status] ?? listing.status}
                </Badge>
                <div className="admin-entity-actions">
                  <Link
                    href={`/listing/${listing.id}`}
                    aria-label={`Открыть объявление ${listing.id}`}
                  >
                    <ExternalLink /> Открыть
                  </Link>
                  {(canPause || canResume) && (
                    <button
                      className={canResume ? 'restore' : 'danger'}
                      type="button"
                      disabled={Boolean(processing)}
                      onClick={() =>
                        void update(
                          'listing',
                          listing.id,
                          canResume ? 'resume' : 'pause',
                        )
                      }
                    >
                      {canResume ? (
                        <>
                          <Play /> Возобновить
                        </>
                      ) : (
                        <>
                          <Pause /> На паузу
                        </>
                      )}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
