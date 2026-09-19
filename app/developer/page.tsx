'use client';

import { type SyntheticEvent, useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Gauge,
  Handshake,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InternalLink as Link } from '@/components/internal-link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeveloperMessagesPanel } from '@/components/developer-messages-panel';
import { DeveloperReservationsPanel } from '@/components/developer-reservations-panel';
import { DeveloperBillingPanel } from '@/components/developer-billing-panel';
import { DeveloperPromotionsPanel } from '@/components/developer-promotions-panel';
import { DeveloperReviewsPanel } from '@/components/developer-reviews-panel';
import { useDeveloperBilling } from '@/hooks/use-developer-billing';
import { useDeveloperPromotions } from '@/hooks/use-developer-promotions';
import { useDeveloperMessages } from '@/hooks/use-developer-messages';
import { useDeveloperReservations } from '@/hooks/use-developer-reservations';
import { useDeveloperReviews } from '@/hooks/use-developer-reviews';

const navGroups: Array<{
  label: string;
  items: Array<{
    icon: LucideIcon;
    label: string;
    active?: boolean;
    count?: number;
  }>;
}> = [
  {
    label: 'Главное',
    items: [{ icon: LayoutDashboard, label: 'Дашборд', active: true }],
  },
  {
    label: 'Управление',
    items: [
      { icon: Building2, label: 'Жилые комплексы' },
      { icon: Home, label: 'Квартиры' },
      { icon: CalendarDays, label: 'Бронирования' },
      { icon: Users, label: 'Клиенты и лиды', count: 24 },
      { icon: ListChecks, label: 'Просмотры' },
      { icon: MessageCircle, label: 'Сообщения' },
      { icon: MessageSquareText, label: 'Отзывы' },
      { icon: Handshake, label: 'Сделки' },
      { icon: FileText, label: 'Документы' },
    ],
  },
  {
    label: 'Рост',
    items: [
      { icon: Sparkles, label: 'Продвижение' },
      { icon: ImageIcon, label: 'Медиа' },
      { icon: BarChart3, label: 'Аналитика' },
    ],
  },
  {
    label: 'Организация',
    items: [
      { icon: Users, label: 'Команда' },
      { icon: CreditCard, label: 'Тариф и оплата' },
      { icon: Settings, label: 'Настройки' },
    ],
  },
];

type DeveloperProject = {
  id: string;
  slug: string;
  name: string;
  address: string;
  district: string;
  hero_image_url: string;
  workflow_status: string;
  units: number;
  available: number;
  listings: number;
};

type DeveloperDashboardData = {
  session: {
    user: { fullName: string };
    organization: { id: string; name: string; role: string } | null;
  };
  organization: { id: string; name: string; role: string } | null;
  projects: DeveloperProject[];
  districts: Array<{ id: string; name: string }>;
  kpis: { projects: number; availableUnits: number; publishedListings: number };
};

type DeveloperLead = {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  complex_name: string;
  listing_id: string | null;
  unit_number: string | null;
  lead_type: string;
  status: string;
  message: string;
  repeated_interaction: boolean;
  created_at: string;
  requested_date: string | null;
  time_slot: string | null;
  viewing_status: string | null;
  sla_breached: boolean;
};

type DeveloperLeadData = {
  leads: DeveloperLead[];
  slaMinutes: number;
  stats: { total: number; new: number; viewings: number; slaBreaches: number };
};

const projectStatus: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Черновик', tone: 'draft' },
  submitted: { label: 'На проверке', tone: 'pending' },
  in_verification: { label: 'Проверяется', tone: 'pending' },
  pending_moderation: { label: 'На модерации', tone: 'pending' },
  published: { label: 'Опубликован', tone: 'published' },
  rejected: { label: 'Отклонён', tone: 'rejected' },
  archived: { label: 'В архиве', tone: 'draft' },
};

const leadStatus: Record<string, string> = {
  new: 'Новый',
  contact_required: 'Нужен контакт',
  contacted: 'Связались',
  consultation: 'Консультация',
  selection: 'Подбор',
  viewing_scheduled: 'Просмотр подтверждён',
  viewing_completed: 'Просмотр завершён',
  reservation: 'Бронирование',
  deal_in_progress: 'Сделка',
  won: 'Продано',
  lost: 'Закрыт',
};

export default function DeveloperDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Дашборд');
  const [period, setPeriod] = useState('Последние 7 дней');
  const [dashboard, setDashboard] = useState<DeveloperDashboardData | null>(
    null,
  );
  const [loadError, setLoadError] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    address: '',
    districtId: '',
    completionStatus: 'under_construction',
    completionLabel: 'IV квартал 2027',
  });
  const [unitOpen, setUnitOpen] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [unitMessage, setUnitMessage] = useState('');
  const [unitForm, setUnitForm] = useState({
    complexId: '',
    buildingName: 'Корпус A',
    totalFloors: '16',
    floorNumber: '4',
    unitNumber: '',
    rooms: '2',
    areaSqm: '72',
    finish: 'Предчистовая',
    priceUzs: '650000000',
    reserveEnabled: true,
  });
  const [leadData, setLeadData] = useState<DeveloperLeadData | null>(null);
  const [leadError, setLeadError] = useState('');
  const [leadProcessing, setLeadProcessing] = useState('');
  const [leadFeedback, setLeadFeedback] = useState('');
  const developerMessages = useDeveloperMessages();
  const developerReservations = useDeveloperReservations();
  const developerBilling = useDeveloperBilling();
  const developerPromotions = useDeveloperPromotions();
  const developerReviews = useDeveloperReviews();
  const unreadDeveloperMessages = developerMessages.conversations.reduce(
    (total, conversation) => total + Number(conversation.unread_count),
    0,
  );

  function navigateSection(label: string) {
    const target: Record<string, string> = {
      Дашборд: 'developer-dashboard-top',
      'Жилые комплексы': 'developer-projects',
      Квартиры: 'developer-projects',
      Бронирования: 'developer-reservations',
      'Клиенты и лиды': 'developer-leads',
      Просмотры: 'developer-leads',
      Сообщения: 'developer-messages',
      Отзывы: 'developer-reviews',
      Продвижение: 'developer-promotions',
      'Тариф и оплата': 'developer-billing',
    };
    const id = target[label];
    if (!id) return;
    setActiveNav(label);
    setSidebarOpen(false);
    window.history.replaceState(null, '', `#${id}`);
    window.setTimeout(
      () =>
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      0,
    );
  }

  async function loadDashboard() {
    setLoadError('');
    try {
      const response = await fetch('/api/developer/complexes', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as DeveloperDashboardData & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message || 'Не удалось загрузить кабинет.');
      setDashboard(payload);
      setForm((current) => ({
        ...current,
        districtId: current.districtId || payload.districts[0]?.id || '',
      }));
      setUnitForm((current) => ({
        ...current,
        complexId: current.complexId || payload.projects[0]?.id || '',
      }));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить кабинет.',
      );
    }
  }

  async function loadLeads() {
    setLeadError('');
    try {
      const response = await fetch('/api/developer/leads', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as DeveloperLeadData & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message || 'Не удалось загрузить заявки.');
      setLeadData(payload);
    } catch (error) {
      setLeadError(
        error instanceof Error ? error.message : 'Не удалось загрузить заявки.',
      );
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => {
      void Promise.all([loadDashboard(), loadLeads()]);
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const projects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    return (dashboard?.projects ?? []).filter((project) => {
      const matchesQuery =
        !query ||
        `${project.name} ${project.address} ${project.district}`
          .toLowerCase()
          .includes(query);
      const matchesFilter =
        projectFilter === 'all' ||
        project.workflow_status === projectFilter ||
        (projectFilter === 'review' &&
          ['submitted', 'in_verification'].includes(project.workflow_status));
      return matchesQuery && matchesFilter;
    });
  }, [dashboard, projectFilter, projectSearch]);

  const workflowCounts = useMemo(
    () =>
      (dashboard?.projects ?? []).reduce(
        (counts, project) => {
          counts[project.workflow_status] =
            (counts[project.workflow_status] ?? 0) + 1;
          return counts;
        },
        {} as Record<string, number>,
      ),
    [dashboard],
  );

  const kpis = [
    {
      label: 'Всего проектов',
      value: dashboard?.kpis.projects ?? '—',
      change: 'в базе компании',
      icon: Building2,
      tone: 'blue',
    },
    {
      label: 'Доступно квартир',
      value: dashboard?.kpis.availableUnits ?? '—',
      change: 'готовы к продаже',
      icon: Home,
      tone: 'violet',
    },
    {
      label: 'Объявления',
      value: dashboard?.kpis.publishedListings ?? '—',
      change: 'опубликовано',
      icon: Gauge,
      tone: 'green',
    },
    {
      label: 'Новые лиды',
      value: leadData?.stats.new ?? '—',
      change: 'требуют ответа',
      icon: MessageCircle,
      tone: 'orange',
    },
    {
      label: 'Просмотры',
      value: leadData?.stats.viewings ?? '—',
      change: 'заявок в CRM',
      icon: CalendarDays,
      tone: 'pink',
    },
    {
      label: 'SLA',
      value: leadData?.stats.slaBreaches ?? '—',
      change: `дольше ${leadData?.slaMinutes ?? 45} минут`,
      icon: AlertCircle,
      tone: 'yellow',
    },
  ];

  async function createComplex(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateMessage('');
    try {
      const response = await fetch('/api/developer/complexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || 'Не удалось создать ЖК.');
      setCreateMessage(payload.message || 'ЖК создан.');
      await loadDashboard();
      setTimeout(() => {
        setCreateOpen(false);
        setCreateMessage('');
        setForm((current) => ({ ...current, name: '', address: '' }));
      }, 650);
    } catch (error) {
      setCreateMessage(
        error instanceof Error ? error.message : 'Не удалось создать ЖК.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function createUnit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddingUnit(true);
    setUnitMessage('');
    try {
      const response = await fetch('/api/developer/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unitForm),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || 'Не удалось добавить квартиру.');
      setUnitMessage(payload.message || 'Квартира добавлена.');
      await loadDashboard();
      setTimeout(() => {
        setUnitOpen(false);
        setUnitMessage('');
        setUnitForm((current) => ({ ...current, unitNumber: '' }));
      }, 650);
    } catch (error) {
      setUnitMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось добавить квартиру.',
      );
    } finally {
      setAddingUnit(false);
    }
  }

  async function updateLead(
    lead: DeveloperLead,
    action: 'contacted' | 'confirm_viewing' | 'lost',
  ) {
    const lostReason =
      action === 'lost'
        ? (window.prompt('Почему лид закрывается?')?.trim() ?? '')
        : '';
    if (action === 'lost' && !lostReason) return;
    setLeadProcessing(lead.id);
    setLeadFeedback('');
    try {
      const response = await fetch('/api/developer/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, action, lostReason }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || 'Не удалось обновить заявку.');
      setLeadFeedback(payload.message || 'Заявка обновлена.');
      await loadLeads();
    } catch (error) {
      setLeadFeedback(
        error instanceof Error ? error.message : 'Не удалось обновить заявку.',
      );
    } finally {
      setLeadProcessing('');
    }
  }

  return (
    <main className="developer-page dark">
      <aside className={`developer-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="developer-logo">
          <span>
            <Building2 />
          </span>
          <strong>
            Estate<em>Hub</em>
          </strong>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Закрыть меню"
          >
            <X />
          </button>
        </div>
        <div className="company-mini-card">
          <span>SD</span>
          <div>
            <strong>{dashboard?.organization?.name ?? 'Компания'}</strong>
            <small>
              <ShieldCheck /> Рабочий кабинет
            </small>
          </div>
          <ChevronDown />
        </div>
        <nav>
          {navGroups.map((group) => (
            <div className="developer-nav-group" key={group.label}>
              <span>{group.label}</span>
              {group.items.map((item) => {
                const count =
                  item.label === 'Бронирования'
                    ? developerReservations.stats.active +
                      developerReservations.stats.holds
                    : item.label === 'Клиенты и лиды'
                      ? leadData?.stats.new
                      : item.label === 'Просмотры'
                        ? leadData?.stats.viewings
                        : item.label === 'Сообщения'
                          ? unreadDeveloperMessages ||
                            developerMessages.conversations.length
                          : item.label === 'Отзывы'
                            ? developerReviews.reviews.length
                            : item.label === 'Продвижение'
                              ? developerPromotions.promotions.filter(
                                  (promotion) =>
                                    ['active', 'scheduled'].includes(
                                      promotion.status,
                                    ),
                                ).length
                              : item.label === 'Тариф и оплата'
                                ? `${developerBilling.usage.activeInventory}/${developerBilling.usage.limit}`
                                : item.count;
                return (
                  <button
                    className={activeNav === item.label ? 'active' : ''}
                    type="button"
                    key={item.label}
                    onClick={() => navigateSection(item.label)}
                  >
                    <item.icon /> <strong>{item.label}</strong>
                    {Boolean(count) && <em>{count}</em>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <Link className="public-site-link" href="/">
          <span>
            <ArrowUpRight />
          </span>
          <div>
            <strong>Публичный сайт</strong>
            <small>Открыть маркетплейс</small>
          </div>
        </Link>
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          className="developer-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Закрыть меню"
        />
      )}

      <section className="developer-workspace">
        <header className="developer-topbar">
          <div>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Открыть меню"
            >
              <Menu />
            </button>
            <span>{activeNav}</span>
          </div>
          <div>
            <Link href="/">
              Посмотреть профиль <ArrowUpRight />
            </Link>
            <button
              type="button"
              className="topbar-notification"
              aria-label="Уведомления"
              onClick={() => navigateSection('Сообщения')}
            >
              <Bell />
            </button>
            <Link className="topbar-company" href="/profile">
              <span>SD</span>
              <div>
                <strong>{dashboard?.organization?.name ?? 'Компания'}</strong>
                <small>Застройщик</small>
              </div>
              <ArrowUpRight />
            </Link>
          </div>
        </header>

        <div className="developer-content" id="developer-dashboard-top">
          <div className="dashboard-heading">
            <div>
              <h1>
                Добро пожаловать,{' '}
                {dashboard?.organization?.name ??
                  dashboard?.session.user.fullName ??
                  'застройщик'}{' '}
                👋
              </h1>
              <p>
                Здесь проекты проходят путь от заявки до публикации в каталоге.
              </p>
            </div>
            <div className="dashboard-heading-actions">
              <button
                type="button"
                onClick={() =>
                  setPeriod(
                    period === 'Последние 7 дней'
                      ? 'Этот месяц'
                      : 'Последние 7 дней',
                  )
                }
              >
                <CalendarDays /> {period} <ChevronDown />
              </button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Добавить объект
              </Button>
            </div>
          </div>

          {loadError && (
            <div className="dashboard-operation-state error">
              <AlertCircle />
              <span>{loadError}</span>
              <button type="button" onClick={() => void loadDashboard()}>
                Повторить
              </button>
            </div>
          )}
          {leadError && (
            <div className="dashboard-operation-state error">
              <AlertCircle />
              <span>{leadError}</span>
              <button type="button" onClick={() => void loadLeads()}>
                Повторить
              </button>
            </div>
          )}
          {leadFeedback && (
            <div className="dashboard-operation-state success">
              <Check />
              <span>{leadFeedback}</span>
            </div>
          )}

          <div className="dashboard-layout">
            <div className="dashboard-main">
              <div className="kpi-grid">
                {kpis.map((kpi) => (
                  <article className="kpi-card" key={kpi.label}>
                    <div>
                      <span>{kpi.label}</span>
                      <strong>{kpi.value}</strong>
                      <small>{kpi.change}</small>
                    </div>
                    <i className={kpi.tone}>
                      <kpi.icon />
                    </i>
                  </article>
                ))}
              </div>

              <section
                className="dashboard-panel projects-panel"
                id="developer-projects"
              >
                <div className="panel-heading">
                  <div>
                    <h2>Мои жилые комплексы</h2>
                    <p>Реальные данные компании и статус публикации</p>
                  </div>
                  <div className="panel-search">
                    <Search />
                    <Input
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                      aria-label="Поиск по проектам"
                      placeholder="Найти проект"
                    />
                  </div>
                </div>
                <div className="project-tabs">
                  <button
                    className={projectFilter === 'all' ? 'active' : ''}
                    type="button"
                    onClick={() => setProjectFilter('all')}
                  >
                    Все {dashboard?.projects.length ?? 0}
                  </button>
                  <button
                    className={projectFilter === 'published' ? 'active' : ''}
                    type="button"
                    onClick={() => setProjectFilter('published')}
                  >
                    Опубликованы {workflowCounts.published ?? 0}
                  </button>
                  <button
                    className={projectFilter === 'review' ? 'active' : ''}
                    type="button"
                    onClick={() => setProjectFilter('review')}
                  >
                    На проверке{' '}
                    {(workflowCounts.submitted ?? 0) +
                      (workflowCounts.in_verification ?? 0)}
                  </button>
                  <button
                    className={
                      projectFilter === 'pending_moderation' ? 'active' : ''
                    }
                    type="button"
                    onClick={() => setProjectFilter('pending_moderation')}
                  >
                    Модерация {workflowCounts.pending_moderation ?? 0}
                  </button>
                </div>
                <Table className="developer-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Проект</TableHead>
                      <TableHead>Квартиры</TableHead>
                      <TableHead>Доступно</TableHead>
                      <TableHead>Объявления</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!dashboard && !loadError && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="table-empty-state">
                            Загружаем проекты…
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {dashboard && projects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="table-empty-state">
                            {dashboard.projects.length === 0
                              ? 'Создайте первый ЖК — он сразу появится здесь и в очереди администратора.'
                              : 'По выбранному фильтру ничего не найдено.'}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {projects.map((project) => {
                      const status = projectStatus[project.workflow_status] ?? {
                        label: project.workflow_status,
                        tone: 'draft',
                      };
                      return (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="project-cell">
                              <NextImage
                                src={project.hero_image_url}
                                width={56}
                                height={44}
                                unoptimized
                                alt=""
                              />
                              <div>
                                <strong>{project.name}</strong>
                                <small>
                                  Самарканд, {project.district} ·{' '}
                                  {project.address}
                                </small>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{project.units}</TableCell>
                          <TableCell>{project.available}</TableCell>
                          <TableCell>{project.listings}</TableCell>
                          <TableCell>
                            <Badge className={`project-status ${status.tone}`}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/complex/${project.slug}`}
                              aria-label={`Открыть ${project.name}`}
                              title="Открыть публичную страницу"
                            >
                              <MoreHorizontal />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="table-footer">
                  <span>
                    Показано {projects.length} из{' '}
                    {dashboard?.projects.length ?? 0} проектов
                  </span>
                  <div><span className="active">1</span></div>
                </div>
              </section>

              <DeveloperReservationsPanel {...developerReservations} />

              <DeveloperMessagesPanel {...developerMessages} />

              <DeveloperReviewsPanel
                reviews={developerReviews.reviews}
                loading={developerReviews.loading}
                error={developerReviews.error}
                feedback={developerReviews.feedback}
                processing={developerReviews.processing}
                onRespond={async (reviewId, text) => {
                  await developerReviews.respond(reviewId, text);
                }}
              />

              <DeveloperPromotionsPanel
                products={developerPromotions.products}
                complexes={developerPromotions.complexes}
                listings={developerPromotions.listings}
                promotions={developerPromotions.promotions}
                loading={developerPromotions.loading}
                error={developerPromotions.error}
                feedback={developerPromotions.feedback}
                processing={developerPromotions.processing}
                onRetry={() => void developerPromotions.refresh()}
                onPurchase={developerPromotions.purchase}
              />

              <DeveloperBillingPanel
                plans={developerBilling.plans}
                subscription={developerBilling.subscription}
                usage={developerBilling.usage}
                events={developerBilling.events}
                loading={developerBilling.loading}
                error={developerBilling.error}
                feedback={developerBilling.feedback}
                processing={developerBilling.processing}
                onRetry={() => void developerBilling.refresh()}
                onChangePlan={developerBilling.changePlan}
                onRenew={developerBilling.renew}
              />

              <section
                className="dashboard-panel developer-leads-panel"
                id="developer-leads"
              >
                <div className="panel-heading">
                  <div>
                    <h2>Новые обращения</h2>
                    <p>Консультации и просмотры из публичного каталога</p>
                  </div>
                  <Badge className="project-status pending">
                    {leadData?.stats.new ?? 0} требуют ответа
                  </Badge>
                </div>
                <Table className="developer-table developer-leads-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Запрос</TableHead>
                      <TableHead>Объект</TableHead>
                      <TableHead>Получено</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!leadData && !leadError && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="table-empty-state">
                            Загружаем обращения…
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {leadData && leadData.leads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="table-empty-state">
                            Обращений пока нет. Они появятся здесь после
                            отправки формы из карточки ЖК.
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {leadData?.leads.slice(0, 8).map((lead) => {
                      const created = new Intl.DateTimeFormat('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(
                        new Date(lead.created_at.replace(' ', 'T') + 'Z'),
                      );
                      return (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="lead-customer-cell">
                              <span>
                                {lead.customer_name
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join('')
                                  .toUpperCase()}
                              </span>
                              <div>
                                <strong>
                                  {lead.customer_name}
                                  {lead.repeated_interaction && (
                                    <em>Повторный</em>
                                  )}
                                </strong>
                                <small>
                                  <Phone /> {lead.phone}
                                </small>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <strong>
                              {lead.lead_type === 'viewing'
                                ? 'Просмотр'
                                : 'Консультация'}
                            </strong>
                            {lead.requested_date && (
                              <small>
                                {lead.requested_date} · {lead.time_slot}
                              </small>
                            )}
                          </TableCell>
                          <TableCell>
                            <strong>{lead.complex_name}</strong>
                            {lead.unit_number && (
                              <small>Квартира № {lead.unit_number}</small>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                lead.sla_breached ? 'lead-sla-breached' : ''
                              }
                            >
                              {created}
                            </span>
                            {lead.sla_breached && <small>Нарушен SLA</small>}
                          </TableCell>
                          <TableCell>
                            <Badge className={`lead-status ${lead.status}`}>
                              {leadStatus[lead.status] ?? lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="lead-row-actions">
                              {lead.status === 'new' &&
                                (lead.lead_type === 'viewing' ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void updateLead(lead, 'confirm_viewing')
                                    }
                                    disabled={leadProcessing === lead.id}
                                  >
                                    <CalendarDays /> Подтвердить
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void updateLead(lead, 'contacted')
                                    }
                                    disabled={leadProcessing === lead.id}
                                  >
                                    <Phone /> Связались
                                  </button>
                                ))}
                              {!['won', 'lost'].includes(lead.status) && (
                                <button
                                  className="close"
                                  type="button"
                                  onClick={() => void updateLead(lead, 'lost')}
                                  disabled={leadProcessing === lead.id}
                                  aria-label={`Закрыть заявку ${lead.customer_name}`}
                                >
                                  <X />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </section>

              <div className="analytics-grid">
                <section className="dashboard-panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Пример отчёта: просмотры</h2>
                      <p>Демонстрационные данные</p>
                    </div>
                    <button type="button" disabled title="Выбор периода появится вместе с реальной аналитикой">
                      Неделя <ChevronDown />
                    </button>
                  </div>
                  <div className="dashboard-line-chart">
                    <span className="chart-value">
                      2 450<small>16 авг</small>
                    </span>
                    <svg
                      viewBox="0 0 600 220"
                      aria-label="Пример графика просмотров за неделю"
                    >
                      <defs>
                        <linearGradient
                          id="devLine"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop stopColor="#4d7cff" stopOpacity=".3" />
                          <stop
                            offset="1"
                            stopColor="#4d7cff"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M5 190 C55 160 73 119 119 148 S176 103 224 123 S290 62 337 96 S403 49 449 62 S526 89 595 25 L595 218 L5 218 Z"
                        fill="url(#devLine)"
                      />
                      <path
                        d="M5 190 C55 160 73 119 119 148 S176 103 224 123 S290 62 337 96 S403 49 449 62 S526 89 595 25"
                        fill="none"
                        stroke="#4d7cff"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div>
                      <span>12 авг</span>
                      <span>13 авг</span>
                      <span>14 авг</span>
                      <span>15 авг</span>
                      <span>16 авг</span>
                      <span>17 авг</span>
                      <span>18 авг</span>
                    </div>
                  </div>
                </section>
                <section className="dashboard-panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Воронка обращений</h2>
                      <p>
                        {leadData?.stats.total ?? 0} заявок ·{' '}
                        {leadData?.stats.viewings ?? 0} просмотров
                      </p>
                    </div>
                    <button type="button" disabled title="Выбор периода появится вместе с реальной аналитикой">
                      Неделя <ChevronDown />
                    </button>
                  </div>
                  <div className="bar-chart" aria-label="Активность обращений">
                    {[
                      32,
                      46,
                      38,
                      65,
                      52,
                      Math.max(
                        18,
                        Math.min(95, (leadData?.stats.total ?? 0) * 12),
                      ),
                      44,
                    ].map((value, index) => (
                      <div key={index}>
                        <i style={{ height: `${value}%` }} />
                        <span>{12 + index} авг</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <aside className="dashboard-rail">
              <section className="company-profile-card">
                <div className="company-cover">
                  <span>SD</span>
                </div>
                <h2>
                  {dashboard?.organization?.name ?? 'Компания'} <ShieldCheck />
                </h2>
                <p>Застройщик · Самарканд</p>
                <div>
                  <span>
                    <strong>{dashboard?.kpis.projects ?? 0}</strong>проектов
                  </span>
                  <span>
                    <strong>{dashboard?.kpis.availableUnits ?? 0}</strong>
                    доступно
                  </span>
                  <span>
                    <strong>{dashboard?.kpis.publishedListings ?? 0}</strong>
                    объявлений
                  </span>
                </div>
                <div className="profile-progress">
                  <span>
                    Профиль заполнен <strong>70%</strong>
                  </span>
                  <Progress value={70} />
                </div>
                <button
                  type="button"
                  disabled
                  title="Редактирование профиля — следующий этап"
                >
                  Редактировать профиль
                </button>
              </section>
              <section className="quick-actions">
                <h2>Быстрые действия</h2>
                <div>
                  <button type="button" onClick={() => setCreateOpen(true)}>
                    <Plus />
                    <span>Новый комплекс</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitOpen(true)}
                    disabled={!dashboard?.projects.length}
                    title={
                      dashboard?.projects.length
                        ? 'Добавить квартиру и объявление'
                        : 'Сначала создайте ЖК'
                    }
                  >
                    <Home />
                    <span>Добавить квартиру</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateSection('Продвижение')}
                  >
                    <Sparkles />
                    <span>Создать акцию</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateSection('Бронирования')}
                  >
                    <CalendarDays />
                    <span>Бронирования</span>
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Будет подключено следующим этапом"
                  >
                    <FileText />
                    <span>Сформировать отчёт</span>
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Будет подключено следующим этапом"
                  >
                    <ImageIcon />
                    <span>Медиа</span>
                  </button>
                </div>
              </section>
              <section className="attention-card">
                <div>
                  <h2>Требует внимания</h2>
                  <a href="#developer-leads">Смотреть заявки</a>
                </div>
                <article>
                  <span className="urgent">
                    <AlertCircle />
                  </span>
                  <div>
                    <strong>
                      {leadData?.stats.slaBreaches ?? 0} нарушений SLA
                    </strong>
                    <small>
                      Порог компании — {leadData?.slaMinutes ?? 45} минут
                    </small>
                  </div>
                  <ArrowUpRight />
                </article>
                <article>
                  <span className="warning">
                    <Clock3Icon />
                  </span>
                  <div>
                    <strong>
                      {leadData?.stats.viewings ?? 0} заявок на просмотр
                    </strong>
                    <small>Новые запросы нужно подтвердить</small>
                  </div>
                  <ArrowUpRight />
                </article>
                <article>
                  <span className="info">
                    <MessageCircle />
                  </span>
                  <div>
                    <strong>{leadData?.stats.new ?? 0} новых обращений</strong>
                    <small>Консультации и просмотры из каталога</small>
                  </div>
                  <ArrowUpRight />
                </article>
              </section>
            </aside>
          </div>
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="developer-dialog">
          <DialogHeader>
            <DialogTitle>Добавить жилой комплекс</DialogTitle>
            <DialogDescription>
              После сохранения заявка появится в очереди администратора. До
              одобрения ЖК не виден в публичном каталоге.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-complex-form"
            onSubmit={createComplex}
            className="developer-dialog-form"
          >
            <label htmlFor="complex-name">
              Название
              <Input
                id="complex-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Например, Shahristan Residence"
                required
                minLength={3}
                maxLength={100}
              />
            </label>
            <label htmlFor="complex-address">
              Адрес
              <Input
                id="complex-address"
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
                placeholder="Улица и номер дома"
                required
                minLength={5}
                maxLength={180}
              />
            </label>
            <label htmlFor="complex-district">
              Район
              <select
                id="complex-district"
                value={form.districtId}
                onChange={(event) =>
                  setForm({ ...form, districtId: event.target.value })
                }
                required
              >
                <option value="" disabled>
                  Выберите район
                </option>
                {dashboard?.districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="complex-status">
              Статус строительства
              <select
                id="complex-status"
                value={form.completionStatus}
                onChange={(event) =>
                  setForm({ ...form, completionStatus: event.target.value })
                }
              >
                <option value="under_construction">Строится</option>
                <option value="completed">Сдан</option>
              </select>
            </label>
            <label htmlFor="complex-completion">
              Срок или дата сдачи
              <Input
                id="complex-completion"
                value={form.completionLabel}
                onChange={(event) =>
                  setForm({ ...form, completionLabel: event.target.value })
                }
                placeholder="IV квартал 2027"
                required
                minLength={3}
                maxLength={80}
              />
            </label>
            {createMessage && (
              <p
                className={
                  createMessage.includes('создан') ? 'success' : 'error'
                }
              >
                {createMessage}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              form="create-complex-form"
              disabled={creating || !dashboard?.organization}
            >
              {creating ? 'Отправляем…' : 'Создать и отправить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent className="developer-dialog unit-dialog">
          <DialogHeader>
            <DialogTitle>Добавить квартиру</DialogTitle>
            <DialogDescription>
              Будет создан физический юнит и первичное объявление. Цена
              сохранится в истории, публикация произойдёт только после
              модерации.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-unit-form"
            onSubmit={createUnit}
            className="developer-dialog-form"
          >
            <label htmlFor="unit-complex">
              Жилой комплекс
              <select
                id="unit-complex"
                value={unitForm.complexId}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, complexId: event.target.value })
                }
                required
              >
                {dashboard?.projects
                  .filter(
                    (project) =>
                      !['rejected', 'archived'].includes(
                        project.workflow_status,
                      ),
                  )
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </label>
            <label htmlFor="unit-building">
              Корпус
              <Input
                id="unit-building"
                value={unitForm.buildingName}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, buildingName: event.target.value })
                }
                required
                maxLength={80}
              />
            </label>
            <label htmlFor="unit-number">
              Номер квартиры
              <Input
                id="unit-number"
                value={unitForm.unitNumber}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, unitNumber: event.target.value })
                }
                placeholder="A-204"
                required
                maxLength={30}
              />
            </label>
            <label htmlFor="unit-rooms">
              Комнат
              <Input
                id="unit-rooms"
                type="number"
                min={1}
                max={10}
                value={unitForm.rooms}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, rooms: event.target.value })
                }
                required
              />
            </label>
            <label htmlFor="unit-floor">
              Этаж
              <Input
                id="unit-floor"
                type="number"
                min={1}
                max={100}
                value={unitForm.floorNumber}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, floorNumber: event.target.value })
                }
                required
              />
            </label>
            <label htmlFor="unit-total-floors">
              Этажей в корпусе
              <Input
                id="unit-total-floors"
                type="number"
                min={1}
                max={100}
                value={unitForm.totalFloors}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, totalFloors: event.target.value })
                }
                required
              />
            </label>
            <label htmlFor="unit-area">
              Площадь, м²
              <Input
                id="unit-area"
                type="number"
                min={10}
                max={1000}
                step="0.1"
                value={unitForm.areaSqm}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, areaSqm: event.target.value })
                }
                required
              />
            </label>
            <label htmlFor="unit-finish">
              Отделка
              <select
                id="unit-finish"
                value={unitForm.finish}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, finish: event.target.value })
                }
              >
                <option>Без отделки</option>
                <option>Предчистовая</option>
                <option>Чистовая</option>
                <option>С ремонтом</option>
              </select>
            </label>
            <label htmlFor="unit-price">
              Цена, сум
              <Input
                id="unit-price"
                type="number"
                min={1000000}
                step={1000000}
                value={unitForm.priceUzs}
                onChange={(event) =>
                  setUnitForm({ ...unitForm, priceUzs: event.target.value })
                }
                required
              />
            </label>
            <label className="developer-checkbox" htmlFor="unit-reserve">
              <input
                id="unit-reserve"
                type="checkbox"
                checked={unitForm.reserveEnabled}
                onChange={(event) =>
                  setUnitForm({
                    ...unitForm,
                    reserveEnabled: event.target.checked,
                  })
                }
              />{' '}
              Разрешить онлайн-бронирование после публикации
            </label>
            {unitMessage && (
              <p
                className={
                  unitMessage.includes('добавлена') ? 'success' : 'error'
                }
              >
                {unitMessage}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnitOpen(false)}
              disabled={addingUnit}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              form="create-unit-form"
              disabled={addingUnit || !unitForm.complexId}
            >
              {addingUnit ? 'Отправляем…' : 'Добавить на модерацию'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Clock3Icon() {
  return <CalendarDays />;
}
