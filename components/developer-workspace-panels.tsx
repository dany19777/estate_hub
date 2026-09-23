'use client';

import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NextImage from 'next/image';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  Plus,
  Search,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InternalLink as Link } from '@/components/internal-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPriceMillions } from '@/lib/marketplace';

type Unit = {
  listing_id: string;
  unit_id: string;
  complex_name: string;
  slug: string;
  building_name: string;
  unit_number: string;
  rooms: number;
  area_sqm: number;
  floor_number: number;
  total_floors: number;
  availability_status: string;
  price_uzs: number;
  listing_status: string;
  created_at: string;
};
type Viewing = {
  id: string;
  customer_name: string;
  phone: string;
  complex_name: string;
  unit_number: string | null;
  message: string;
  lead_status: string;
  requested_date: string;
  time_slot: string;
  viewing_status: string;
  created_at: string;
};
type Deal = {
  id: string;
  customer_name: string;
  complex_name: string;
  unit_number: string | null;
  price_uzs: number | null;
  status: string;
  updated_at: string;
};
type Document = {
  id: string;
  entity_type: string;
  entity_id: string;
  alt_text: string;
  url: string;
  created_at: string;
  complex_name: string;
};
type Media = {
  id: string;
  entity_type: string;
  entity_id: string;
  media_type: string;
  alt_text: string;
  url: string;
  complex_name: string;
  slug: string;
};
type Member = {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  full_name: string;
  email: string;
};
type LeadDay = { day: string; total: number; viewings: number };
type WorkspaceData = {
  units: Unit[];
  viewings: Viewing[];
  deals: Deal[];
  documents: Document[];
  media: Media[];
  team: Member[];
  leadTimeline: LeadDay[];
  settings: { new_lead_sla_minutes: number; sticky_assignment: number };
  organization: { name: string; role: string };
  canManageTeam: boolean;
  canManageUnits: boolean;
  canManageLeads: boolean;
  currentUserId: string;
};

const roleNames: Record<string, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  HEAD_OF_SALES: 'Руководитель продаж',
  MANAGER: 'Менеджер',
  CONTENT_MANAGER: 'Контент-менеджер',
  FINANCE: 'Финансы',
  ANALYST: 'Аналитик',
};
const listingNames: Record<string, string> = {
  draft: 'Черновик',
  pending_verification: 'Проверка',
  pending_moderation: 'Модерация',
  published: 'Опубликовано',
  paused: 'Приостановлено',
  reserved: 'Забронировано',
  sold: 'Продано',
  rejected: 'Отклонено',
  expired: 'Истекло',
};
const viewingNames: Record<string, string> = {
  requested: 'Ожидает подтверждения',
  confirmed: 'Подтверждён',
  rescheduled: 'Перенесён',
  attended: 'Состоялся',
  no_show: 'Не состоялся',
  cancelled: 'Отменён',
  converted: 'Перешёл в сделку',
};

function safeDocumentUrl(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function Panel({
  id,
  title,
  description,
  children,
  action,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="dashboard-panel developer-workspace-panel" id={id}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action}
      </div>
      <div className="developer-workspace-panel-body">{children}</div>
    </section>
  );
}

export function DeveloperWorkspacePanels({
  period,
  revision,
  onAddUnit,
  onLeadUpdated,
}: {
  period: string;
  revision: number;
  onAddUnit: () => void;
  onLeadUpdated: () => Promise<void>;
}) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamRole, setTeamRole] = useState('MANAGER');
  const [slaMinutes, setSlaMinutes] = useState('45');

  const reload = useCallback(async () => {
    try {
      const response = await fetch('/api/developer/workspace', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as WorkspaceData & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          payload.message || 'Не удалось загрузить разделы кабинета.',
        );
      setData(payload);
      setSlaMinutes(String(payload.settings.new_lead_sla_minutes));
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось загрузить разделы кабинета.',
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload, revision]);

  async function mutate(
    method: 'POST' | 'PATCH',
    body: Record<string, unknown>,
  ) {
    setProcessing(true);
    setFeedback('');
    try {
      const response = await fetch('/api/developer/workspace', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || 'Не удалось сохранить изменение.');
      setFeedback(payload.message || 'Изменение сохранено.');
      await reload();
      return true;
    } catch (caught) {
      setFeedback(
        caught instanceof Error
          ? caught.message
          : 'Не удалось сохранить изменение.',
      );
      return false;
    } finally {
      setProcessing(false);
    }
  }

  const visibleUnits = useMemo(
    () =>
      (data?.units ?? []).filter((unit) => {
        const query = unitSearch.trim().toLocaleLowerCase();
        return (
          (!query ||
            `${unit.complex_name} ${unit.building_name} ${unit.unit_number}`
              .toLocaleLowerCase()
              .includes(query)) &&
          (unitFilter === 'all' || unit.listing_status === unitFilter)
        );
      }),
    [data?.units, unitSearch, unitFilter],
  );

  const periodDays = period === 'Последние 30 дней' ? 30 : 7;
  const timeline = useMemo(() => {
    const byDay = new Map(
      (data?.leadTimeline ?? []).map((item) => [item.day, item]),
    );
    return Array.from({ length: periodDays }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - periodDays + index + 1);
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return {
        day,
        total: Number(byDay.get(day)?.total ?? 0),
        viewings: Number(byDay.get(day)?.viewings ?? 0),
      };
    });
  }, [data?.leadTimeline, periodDays]);
  const maxLeads = Math.max(1, ...timeline.map((day) => day.total));
  const periodTotal = timeline.reduce((sum, day) => sum + day.total, 0);
  const periodViewings = timeline.reduce((sum, day) => sum + day.viewings, 0);

  async function addMember(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await mutate('POST', { email: teamEmail, role: teamRole }))
      setTeamEmail('');
  }

  async function confirmViewing(leadId: string) {
    setProcessing(true);
    setFeedback('');
    try {
      const response = await fetch('/api/developer/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, action: 'confirm_viewing' }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || 'Не удалось подтвердить просмотр.');
      setFeedback(payload.message || 'Просмотр подтверждён.');
      await onLeadUpdated();
    } catch (caught) {
      setFeedback(
        caught instanceof Error
          ? caught.message
          : 'Не удалось подтвердить просмотр.',
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      {error && (
        <div className="dashboard-operation-state error">
          <span>{error}</span>
          <Button variant="outline" onClick={() => void reload()}>
            Повторить
          </Button>
        </div>
      )}
      {feedback && (
        <div className="dashboard-operation-state success">
          <span>{feedback}</span>
        </div>
      )}

      <Panel
        id="developer-units"
        title="Квартиры"
        description="Квартиры и объявления вашей компании"
        action={
          data?.canManageUnits && (
            <Button onClick={onAddUnit}>
              <Plus /> Добавить квартиру
            </Button>
          )
        }
      >
        <div className="developer-workspace-controls">
          <div>
            <Search />
            <Input
              value={unitSearch}
              onChange={(event) => setUnitSearch(event.target.value)}
              placeholder="ЖК, корпус или номер"
              aria-label="Поиск квартиры"
            />
          </div>
          <select
            value={unitFilter}
            onChange={(event) => setUnitFilter(event.target.value)}
            aria-label="Фильтр квартир"
          >
            <option value="all">Все статусы</option>
            <option value="published">Опубликованы</option>
            <option value="pending_moderation">На модерации</option>
            <option value="reserved">Забронированы</option>
            <option value="sold">Проданы</option>
          </select>
        </div>
        <Table className="developer-table">
          <TableHeader>
            <TableRow>
              <TableHead>Квартира</TableHead>
              <TableHead>Параметры</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Объявление</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="table-empty-state">Загружаем квартиры…</div>
                </TableCell>
              </TableRow>
            )}
            {data && visibleUnits.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="table-empty-state">
                    Квартир по выбранному фильтру пока нет.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {visibleUnits.map((unit) => (
              <TableRow key={unit.listing_id}>
                <TableCell>
                  <strong>{unit.complex_name}</strong>
                  <small>
                    {unit.building_name} · № {unit.unit_number}
                  </small>
                </TableCell>
                <TableCell>
                  <strong>
                    {unit.rooms} комн. · {unit.area_sqm} м²
                  </strong>
                  <small>
                    {unit.floor_number}/{unit.total_floors} этаж
                  </small>
                </TableCell>
                <TableCell>
                  <strong>{formatPriceMillions(unit.price_uzs)} сум</strong>
                </TableCell>
                <TableCell>
                  <span className="developer-workspace-state">
                    {listingNames[unit.listing_status] ?? unit.listing_status}
                  </span>
                  <small>
                    {unit.availability_status === 'available'
                      ? 'В наличии'
                      : unit.availability_status}
                  </small>
                </TableCell>
                <TableCell>
                  <Link
                    href={
                      unit.listing_status === 'published'
                        ? `/listing/${unit.listing_id}`
                        : `/complex/${unit.slug}`
                    }
                  >
                    Открыть <ArrowUpRight />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel
        id="developer-viewings"
        title="Просмотры"
        description="Заявки на посещение квартир и их текущий статус"
        action={
          <span className="developer-workspace-count">
            {data?.viewings.length ?? 0} заявок
          </span>
        }
      >
        <div className="developer-workspace-list">
          {!data && <p>Загружаем просмотры…</p>}
          {data && data.viewings.length === 0 && (
            <p>Заявок на просмотр пока нет.</p>
          )}
          {data?.viewings.map((viewing) => (
            <article key={viewing.id}>
              <div>
                <CalendarDays />
                <strong>
                  {viewing.requested_date} · {viewing.time_slot}
                </strong>
                <span className="developer-workspace-state">
                  {viewingNames[viewing.viewing_status] ??
                    viewing.viewing_status}
                </span>
              </div>
              <p>
                {viewing.complex_name}
                {viewing.unit_number
                  ? ` · квартира № ${viewing.unit_number}`
                  : ''}
              </p>
              <p>
                {viewing.customer_name} ·{' '}
                <a href={`tel:${viewing.phone}`}>{viewing.phone}</a>
              </p>
              {viewing.message?.trim() && (
                <blockquote>{viewing.message.trim()}</blockquote>
              )}
              {data.canManageLeads &&
                viewing.lead_status === 'new' &&
                viewing.viewing_status === 'requested' && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void confirmViewing(viewing.id)}
                  >
                    Подтвердить просмотр
                  </button>
                )}
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        id="developer-deals"
        title="Сделки"
        description="Обращения, переведённые в сделку, и завершённые продажи"
        action={
          <span className="developer-workspace-count">
            {data?.deals.length ?? 0} записей
          </span>
        }
      >
        <div className="developer-workspace-list">
          {!data && <p>Загружаем сделки…</p>}
          {data && data.deals.length === 0 && (
            <p>
              Сделок пока нет. После перехода обращения в стадию сделки оно
              появится здесь.
            </p>
          )}
          {data?.deals.map((deal) => (
            <article key={deal.id}>
              <div>
                <strong>
                  {deal.complex_name}
                  {deal.unit_number ? ` · № ${deal.unit_number}` : ''}
                </strong>
                <span className="developer-workspace-state">
                  {deal.status === 'won' ? 'Продано' : 'В работе'}
                </span>
              </div>
              <p>
                {deal.customer_name}
                {deal.price_uzs
                  ? ` · ${formatPriceMillions(deal.price_uzs)} сум`
                  : ''}
              </p>
              <small>Обновлено: {deal.updated_at}</small>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        id="developer-documents"
        title="Документы"
        description="Документы жилых комплексов, доступные в базе компании"
        action={<FileText className="developer-workspace-heading-icon" />}
      >
        <div className="developer-workspace-list">
          {!data && <p>Загружаем документы…</p>}
          {data && data.documents.length === 0 && (
            <p>
              Документов пока нет. Они появятся здесь после добавления к жилому
              комплексу.
            </p>
          )}
          {data?.documents.map((document) => {
            const url = safeDocumentUrl(document.url);
            return (
              <article key={document.id}>
                <div>
                  <FileText />
                  <strong>{document.alt_text || 'Документ'}</strong>
                </div>
                <p>{document.complex_name}</p>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    Открыть документ <ArrowUpRight />
                  </a>
                ) : (
                  <small>Файл пока не загружен</small>
                )}
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel
        id="developer-media"
        title="Медиа"
        description="Изображения ваших жилых комплексов"
        action={<ImageIcon className="developer-workspace-heading-icon" />}
      >
        {!data && <div className="table-empty-state">Загружаем медиа…</div>}
        {data && data.media.length === 0 && (
          <div className="table-empty-state">Изображений пока нет.</div>
        )}
        <div className="developer-media-grid">
          {data?.media
            .filter((item) => item.url)
            .map((item) => (
              <Link href={`/complex/${item.slug}`} key={item.id}>
                <NextImage
                  src={item.url}
                  alt={item.alt_text || item.complex_name}
                  width={220}
                  height={140}
                  unoptimized
                />
                <strong>{item.complex_name}</strong>
                <small>{item.alt_text || 'Фото жилого комплекса'}</small>
              </Link>
            ))}
        </div>
      </Panel>

      <Panel
        id="developer-analytics"
        title="Аналитика"
        description={`Реальные обращения за ${period === 'Последние 30 дней' ? 'последние 30 дней' : 'последние 7 дней'}`}
        action={
          <span className="developer-workspace-count">
            {periodTotal} обращений · {periodViewings} просмотров
          </span>
        }
      >
        <div
          className="developer-analytics-bars"
          aria-label="Количество обращений по дням"
        >
          {timeline.map((day) => (
            <div
              key={day.day}
              title={`${day.day}: ${day.total} обращений, ${day.viewings} просмотров`}
            >
              <span>{day.total || ''}</span>
              <i
                style={{
                  height: `${day.total ? Math.max(4, (day.total / maxLeads) * 100) : 0}%`,
                }}
              />
              <small>{day.day.slice(5)}</small>
            </div>
          ))}
        </div>
        <p className="developer-workspace-note">
          Столбцы строятся по фактическим заявкам компании. Период меняется
          кнопкой в верхней части кабинета.
        </p>
      </Panel>

      <Panel
        id="developer-team"
        title="Команда"
        description="Сотрудники с доступом к кабинету компании"
        action={<Users className="developer-workspace-heading-icon" />}
      >
        <div className="developer-workspace-list">
          {!data && <p>Загружаем команду…</p>}
          {data && data.team.length === 0 && <p>Сотрудников пока нет.</p>}
          {data?.team.map((member) => (
            <article key={member.user_id}>
              <div>
                <strong>{member.full_name}</strong>
                <span className="developer-workspace-state">
                  {roleNames[member.role] ?? member.role}
                </span>
              </div>
              <p>
                {member.email} ·{' '}
                {member.status === 'active'
                  ? 'Активен'
                  : 'Доступ приостановлен'}
              </p>
              {data.canManageTeam &&
                member.user_id !== data.currentUserId &&
                member.role !== 'OWNER' &&
                (data.organization.role === 'OWNER' ||
                  member.role !== 'ADMIN') && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void mutate('PATCH', {
                        action: 'member_status',
                        userId: member.user_id,
                        status:
                          member.status === 'active' ? 'suspended' : 'active',
                      })
                    }
                  >
                    {member.status === 'active'
                      ? 'Приостановить доступ'
                      : 'Восстановить доступ'}
                  </button>
                )}
            </article>
          ))}
        </div>
        {data?.canManageTeam && (
          <form
            className="developer-team-form"
            onSubmit={(event) => void addMember(event)}
          >
            <strong>Добавить сотрудника</strong>
            <p>
              Сотрудник сначала создаёт аккаунт EstateHub с указанным email.
            </p>
            <Input
              type="email"
              value={teamEmail}
              onChange={(event) => setTeamEmail(event.target.value)}
              placeholder="email@company.uz"
              aria-label="Email сотрудника"
              required
            />
            <select
              value={teamRole}
              onChange={(event) => setTeamRole(event.target.value)}
              aria-label="Роль сотрудника"
            >
              {Object.entries(roleNames)
                .filter(
                  ([role]) =>
                    role !== 'OWNER' &&
                    (role !== 'ADMIN' || data.organization.role === 'OWNER'),
                )
                .map(([role, name]) => (
                  <option key={role} value={role}>
                    {name}
                  </option>
                ))}
            </select>
            <Button type="submit" disabled={processing}>
              Добавить в команду
            </Button>
          </form>
        )}
      </Panel>

      <Panel
        id="developer-settings"
        title="Настройки"
        description="Параметры работы вашей компании"
        action={<Building2 className="developer-workspace-heading-icon" />}
      >
        <div className="developer-settings-grid">
          <div>
            <small>Компания</small>
            <strong>{data?.organization.name ?? 'Загружаем…'}</strong>
            <span>Роль: {roleNames[data?.organization.role ?? ''] ?? '—'}</span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void mutate('PATCH', {
                action: 'settings',
                newLeadSlaMinutes: Number(slaMinutes),
              });
            }}
          >
            <label htmlFor="developer-sla">
              Время ответа на новую заявку, минут
            </label>
            <p>Используется для отметки просроченных обращений в CRM.</p>
            <Input
              id="developer-sla"
              type="number"
              min={5}
              max={1440}
              step={1}
              value={slaMinutes}
              onChange={(event) => setSlaMinutes(event.target.value)}
              disabled={!data?.canManageTeam}
            />
            <Button type="submit" disabled={!data?.canManageTeam || processing}>
              Сохранить
            </Button>
          </form>
        </div>
      </Panel>
    </>
  );
}
