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
  MoreHorizontal,
  Plus,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InternalLink as Link } from '@/components/internal-link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const navGroups: Array<{ label: string; items: Array<{ icon: LucideIcon; label: string; active?: boolean; count?: number }> }> = [
  { label: 'Главное', items: [{ icon: LayoutDashboard, label: 'Дашборд', active: true }] },
  { label: 'Управление', items: [{ icon: Building2, label: 'Жилые комплексы' }, { icon: Home, label: 'Квартиры' }, { icon: CalendarDays, label: 'Бронирования', count: 8 }, { icon: Users, label: 'Клиенты и лиды', count: 24 }, { icon: ListChecks, label: 'Просмотры' }, { icon: MessageCircle, label: 'Сообщения', count: 12 }, { icon: Handshake, label: 'Сделки' }, { icon: FileText, label: 'Документы' }] },
  { label: 'Рост', items: [{ icon: Sparkles, label: 'Продвижение' }, { icon: ImageIcon, label: 'Медиа' }, { icon: BarChart3, label: 'Аналитика' }] },
  { label: 'Организация', items: [{ icon: Users, label: 'Команда' }, { icon: CreditCard, label: 'Тариф и оплата' }, { icon: Settings, label: 'Настройки' }] },
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
  session: { user: { fullName: string }; organization: { id: string; name: string; role: string } | null };
  organization: { id: string; name: string; role: string } | null;
  projects: DeveloperProject[];
  districts: Array<{ id: string; name: string }>;
  kpis: { projects: number; availableUnits: number; publishedListings: number };
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

export default function DeveloperDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState('Последние 7 дней');
  const [dashboard, setDashboard] = useState<DeveloperDashboardData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [form, setForm] = useState({ name: '', address: '', districtId: '', completionStatus: 'under_construction', completionLabel: 'IV квартал 2027' });

  async function loadDashboard() {
    setLoadError('');
    try {
      const response = await fetch('/api/developer/complexes', { cache: 'no-store' });
      const payload = await response.json() as DeveloperDashboardData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить кабинет.');
      setDashboard(payload);
      setForm((current) => ({ ...current, districtId: current.districtId || payload.districts[0]?.id || '' }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить кабинет.');
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const projects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    return (dashboard?.projects ?? []).filter((project) => {
      const matchesQuery = !query || `${project.name} ${project.address} ${project.district}`.toLowerCase().includes(query);
      const matchesFilter = projectFilter === 'all' || project.workflow_status === projectFilter || projectFilter === 'review' && ['submitted', 'in_verification'].includes(project.workflow_status);
      return matchesQuery && matchesFilter;
    });
  }, [dashboard, projectFilter, projectSearch]);

  const workflowCounts = useMemo(() => (dashboard?.projects ?? []).reduce((counts, project) => {
    counts[project.workflow_status] = (counts[project.workflow_status] ?? 0) + 1;
    return counts;
  }, {} as Record<string, number>), [dashboard]);

  const kpis = [
    { label: 'Всего проектов', value: dashboard?.kpis.projects ?? '—', change: 'в базе компании', icon: Building2, tone: 'blue' },
    { label: 'Доступно квартир', value: dashboard?.kpis.availableUnits ?? '—', change: 'готовы к продаже', icon: Home, tone: 'violet' },
    { label: 'Объявления', value: dashboard?.kpis.publishedListings ?? '—', change: 'опубликовано', icon: Gauge, tone: 'green' },
    { label: 'На проверке', value: (workflowCounts.submitted ?? 0) + (workflowCounts.in_verification ?? 0), change: 'ожидают решения', icon: ShieldCheck, tone: 'orange' },
    { label: 'На модерации', value: workflowCounts.pending_moderation ?? 0, change: 'перед публикацией', icon: ListChecks, tone: 'pink' },
    { label: 'Опубликовано', value: workflowCounts.published ?? 0, change: 'видно в каталоге', icon: Sparkles, tone: 'yellow' },
  ];

  async function createComplex(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateMessage('');
    try {
      const response = await fetch('/api/developer/complexes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось создать ЖК.');
      setCreateMessage(payload.message || 'ЖК создан.');
      await loadDashboard();
      setTimeout(() => {
        setCreateOpen(false);
        setCreateMessage('');
        setForm((current) => ({ ...current, name: '', address: '' }));
      }, 650);
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : 'Не удалось создать ЖК.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="developer-page dark">
      <aside className={`developer-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="developer-logo"><span><Building2 /></span><strong>Estate<em>Hub</em></strong><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню"><X /></button></div>
        <div className="company-mini-card"><span>SD</span><div><strong>{dashboard?.organization?.name ?? 'Компания'}</strong><small><ShieldCheck /> Рабочий кабинет</small></div><ChevronDown /></div>
        <nav>
          {navGroups.map((group) => <div className="developer-nav-group" key={group.label}><span>{group.label}</span>{group.items.map((item) => <button className={item.active ? 'active' : ''} type="button" key={item.label}><item.icon /> <strong>{item.label}</strong>{item.count && <em>{item.count}</em>}</button>)}</div>)}
        </nav>
        <Link className="public-site-link" href="/"><span><ArrowUpRight /></span><div><strong>Публичный сайт</strong><small>Открыть маркетплейс</small></div></Link>
      </aside>
      {sidebarOpen && <button type="button" className="developer-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню" />}

      <section className="developer-workspace">
        <header className="developer-topbar">
          <div><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Открыть меню"><Menu /></button><span>Дашборд</span></div>
          <div><Link href="/">Посмотреть профиль <ArrowUpRight /></Link><button type="button" className="topbar-notification" aria-label="Уведомления"><Bell /></button><div className="topbar-company"><span>SD</span><div><strong>{dashboard?.organization?.name ?? 'Компания'}</strong><small>Застройщик</small></div><ChevronDown /></div></div>
        </header>

        <div className="developer-content">
          <div className="dashboard-heading"><div><h1>Добро пожаловать, {dashboard?.organization?.name ?? dashboard?.session.user.fullName ?? 'застройщик'} 👋</h1><p>Здесь проекты проходят путь от заявки до публикации в каталоге.</p></div><div className="dashboard-heading-actions"><button type="button" onClick={() => setPeriod(period === 'Последние 7 дней' ? 'Этот месяц' : 'Последние 7 дней')}><CalendarDays /> {period} <ChevronDown /></button><Button onClick={() => setCreateOpen(true)}><Plus /> Добавить объект</Button></div></div>

          {loadError && <div className="dashboard-operation-state error"><AlertCircle /><span>{loadError}</span><button type="button" onClick={() => void loadDashboard()}>Повторить</button></div>}

          <div className="dashboard-layout">
            <div className="dashboard-main">
              <div className="kpi-grid">{kpis.map((kpi) => <article className="kpi-card" key={kpi.label}><div><span>{kpi.label}</span><strong>{kpi.value}</strong><small>{kpi.change}</small></div><i className={kpi.tone}><kpi.icon /></i></article>)}</div>

              <section className="dashboard-panel projects-panel">
                <div className="panel-heading"><div><h2>Мои жилые комплексы</h2><p>Реальные данные компании и статус публикации</p></div><div className="panel-search"><Search /><Input value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} aria-label="Поиск по проектам" placeholder="Найти проект" /></div></div>
                <div className="project-tabs">
                  <button className={projectFilter === 'all' ? 'active' : ''} type="button" onClick={() => setProjectFilter('all')}>Все {dashboard?.projects.length ?? 0}</button>
                  <button className={projectFilter === 'published' ? 'active' : ''} type="button" onClick={() => setProjectFilter('published')}>Опубликованы {workflowCounts.published ?? 0}</button>
                  <button className={projectFilter === 'review' ? 'active' : ''} type="button" onClick={() => setProjectFilter('review')}>На проверке {(workflowCounts.submitted ?? 0) + (workflowCounts.in_verification ?? 0)}</button>
                  <button className={projectFilter === 'pending_moderation' ? 'active' : ''} type="button" onClick={() => setProjectFilter('pending_moderation')}>Модерация {workflowCounts.pending_moderation ?? 0}</button>
                </div>
                <Table className="developer-table">
                  <TableHeader><TableRow><TableHead>Проект</TableHead><TableHead>Квартиры</TableHead><TableHead>Доступно</TableHead><TableHead>Объявления</TableHead><TableHead>Статус</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {!dashboard && !loadError && <TableRow><TableCell colSpan={6}><div className="table-empty-state">Загружаем проекты…</div></TableCell></TableRow>}
                    {dashboard && projects.length === 0 && <TableRow><TableCell colSpan={6}><div className="table-empty-state">{dashboard.projects.length === 0 ? 'Создайте первый ЖК — он сразу появится здесь и в очереди администратора.' : 'По выбранному фильтру ничего не найдено.'}</div></TableCell></TableRow>}
                    {projects.map((project) => {
                      const status = projectStatus[project.workflow_status] ?? { label: project.workflow_status, tone: 'draft' };
                      return <TableRow key={project.id}><TableCell><div className="project-cell"><NextImage src={project.hero_image_url} width={56} height={44} unoptimized alt="" /><div><strong>{project.name}</strong><small>Самарканд, {project.district} · {project.address}</small></div></div></TableCell><TableCell>{project.units}</TableCell><TableCell>{project.available}</TableCell><TableCell>{project.listings}</TableCell><TableCell><Badge className={`project-status ${status.tone}`}>{status.label}</Badge></TableCell><TableCell><button type="button" aria-label={`Действия с ${project.name}`} title="Редактирование квартир — следующий этап"><MoreHorizontal /></button></TableCell></TableRow>;
                    })}
                  </TableBody>
                </Table>
                <div className="table-footer"><span>Показано {projects.length} из {dashboard?.projects.length ?? 0} проектов</span><div><button type="button" className="active">1</button></div></div>
              </section>

              <div className="analytics-grid">
                <section className="dashboard-panel chart-panel"><div className="panel-heading"><div><h2>Пример отчёта: просмотры</h2><p>Демонстрационные данные</p></div><button type="button">Неделя <ChevronDown /></button></div><div className="dashboard-line-chart"><span className="chart-value">2 450<small>16 авг</small></span><svg viewBox="0 0 600 220" aria-label="Пример графика просмотров за неделю"><defs><linearGradient id="devLine" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4d7cff" stopOpacity=".3"/><stop offset="1" stopColor="#4d7cff" stopOpacity="0"/></linearGradient></defs><path d="M5 190 C55 160 73 119 119 148 S176 103 224 123 S290 62 337 96 S403 49 449 62 S526 89 595 25 L595 218 L5 218 Z" fill="url(#devLine)"/><path d="M5 190 C55 160 73 119 119 148 S176 103 224 123 S290 62 337 96 S403 49 449 62 S526 89 595 25" fill="none" stroke="#4d7cff" strokeWidth="4" strokeLinecap="round"/></svg><div><span>12 авг</span><span>13 авг</span><span>14 авг</span><span>15 авг</span><span>16 авг</span><span>17 авг</span><span>18 авг</span></div></div></section>
                <section className="dashboard-panel chart-panel"><div className="panel-heading"><div><h2>Пример отчёта: лиды</h2><p>Появится после подключения обращений</p></div><button type="button">Неделя <ChevronDown /></button></div><div className="bar-chart" aria-label="Пример лидов за неделю">{[44, 59, 49, 73, 68, 91, 61].map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{12 + index} авг</span></div>)}</div></section>
              </div>
            </div>

            <aside className="dashboard-rail">
              <section className="company-profile-card"><div className="company-cover"><span>SD</span></div><h2>{dashboard?.organization?.name ?? 'Компания'} <ShieldCheck /></h2><p>Застройщик · Самарканд</p><div><span><strong>{dashboard?.kpis.projects ?? 0}</strong>проектов</span><span><strong>{dashboard?.kpis.availableUnits ?? 0}</strong>доступно</span><span><strong>{dashboard?.kpis.publishedListings ?? 0}</strong>объявлений</span></div><div className="profile-progress"><span>Профиль заполнен <strong>70%</strong></span><Progress value={70} /></div><button type="button" disabled title="Редактирование профиля — следующий этап">Редактировать профиль</button></section>
              <section className="quick-actions"><h2>Быстрые действия</h2><div><button type="button" onClick={() => setCreateOpen(true)}><Plus /><span>Новый комплекс</span></button><button type="button" disabled title="Сначала создайте ЖК"><Home /><span>Добавить квартиры</span></button><button type="button" disabled title="Будет подключено следующим этапом"><Sparkles /><span>Создать акцию</span></button><button type="button" disabled title="Будет подключено следующим этапом"><CalendarDays /><span>Бронирования</span></button><button type="button" disabled title="Будет подключено следующим этапом"><FileText /><span>Сформировать отчёт</span></button><button type="button" disabled title="Будет подключено следующим этапом"><ImageIcon /><span>Медиа</span></button></div></section>
              <section className="attention-card"><div><h2>Требует внимания</h2><a href="#attention">Смотреть все</a></div><article><span className="urgent"><AlertCircle /></span><div><strong>3 нарушения SLA</strong><small>Лиды ожидают ответа более 30 минут</small></div><ArrowUpRight /></article><article><span className="warning"><Clock3Icon /></span><div><strong>5 броней истекают</strong><small>В течение ближайших 24 часов</small></div><ArrowUpRight /></article><article><span className="info"><MessageCircle /></span><div><strong>8 сообщений без ответа</strong><small>Самое раннее — 42 минуты назад</small></div><ArrowUpRight /></article></section>
            </aside>
          </div>
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="developer-dialog">
          <DialogHeader>
            <DialogTitle>Добавить жилой комплекс</DialogTitle>
            <DialogDescription>После сохранения заявка появится в очереди администратора. До одобрения ЖК не виден в публичном каталоге.</DialogDescription>
          </DialogHeader>
          <form id="create-complex-form" onSubmit={createComplex} className="developer-dialog-form">
            <label htmlFor="complex-name">Название<Input id="complex-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Например, Shahristan Residence" required minLength={3} maxLength={100} /></label>
            <label htmlFor="complex-address">Адрес<Input id="complex-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Улица и номер дома" required minLength={5} maxLength={180} /></label>
            <label htmlFor="complex-district">Район<select id="complex-district" value={form.districtId} onChange={(event) => setForm({ ...form, districtId: event.target.value })} required><option value="" disabled>Выберите район</option>{dashboard?.districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></label>
            <label htmlFor="complex-status">Статус строительства<select id="complex-status" value={form.completionStatus} onChange={(event) => setForm({ ...form, completionStatus: event.target.value })}><option value="under_construction">Строится</option><option value="completed">Сдан</option></select></label>
            <label htmlFor="complex-completion">Срок или дата сдачи<Input id="complex-completion" value={form.completionLabel} onChange={(event) => setForm({ ...form, completionLabel: event.target.value })} placeholder="IV квартал 2027" required minLength={3} maxLength={80} /></label>
            {createMessage && <p className={createMessage.includes('создан') ? 'success' : 'error'}>{createMessage}</p>}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Отмена</Button>
            <Button type="submit" form="create-complex-form" disabled={creating || !dashboard?.organization}>{creating ? 'Отправляем…' : 'Создать и отправить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Clock3Icon() {
  return <CalendarDays />;
}
