'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  FileSearch,
  Gauge,
  Landmark,
  ListChecks,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const adminNav = [
  { label: 'Обзор', icon: Gauge, active: true },
  { label: 'Пользователи', icon: Users },
  { label: 'Застройщики', icon: Building2 },
  { label: 'Агентства и владельцы', icon: Landmark },
  { label: 'Жилые комплексы', icon: Building2 },
  { label: 'Верификация', icon: FileCheck2, count: 17 },
  { label: 'Модерация', icon: ListChecks, count: 9 },
  { label: 'Брони и платежи', icon: WalletCards },
  { label: 'Споры и возвраты', icon: AlertTriangle, count: 3 },
  { label: 'Тарифы и биллинг', icon: CircleDollarSign },
  { label: 'Аудит', icon: FileSearch },
  { label: 'Аналитика', icon: BarChart3 },
  { label: 'Настройки системы', icon: Settings },
];

type VerificationCase = {
  id: string;
  subject_type: 'organization' | 'owner' | 'listing' | 'complex' | 'buyer';
  subject_id: string;
  applicant: string;
  organization_type: string | null;
  document_type: string | null;
  status: string;
  risk_level: string;
  created_at: string;
};

type AdminDashboardData = {
  session: { user: { fullName: string }; platformRoles: string[] };
  queue: VerificationCase[];
  moderation: Array<{ complex_id: string; name: string; developer: string; workflow_status: string; pending_listings: number; submitted_at: string | null }>;
  stats: { users: number; activeComplexes: number; pendingVerifications: number; publishedListings: number };
};

const riskLabels: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
const queueLabels: Record<string, string> = { submitted: 'Новая', in_review: 'В работе' };

export default function AdminDashboard() {
  const [mobileNav, setMobileNav] = useState(false);
  const [queue, setQueue] = useState('Все');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState('');
  const [feedback, setFeedback] = useState('');

  async function loadDashboard() {
    setLoadError('');
    try {
      const [verificationResponse, moderationResponse] = await Promise.all([
        fetch('/api/admin/verifications', { cache: 'no-store' }),
        fetch('/api/admin/moderation', { cache: 'no-store' }),
      ]);
      const payload = await verificationResponse.json() as Omit<AdminDashboardData, 'moderation'> & { message?: string };
      const moderationPayload = await moderationResponse.json() as { queue?: AdminDashboardData['moderation']; message?: string };
      if (!verificationResponse.ok) throw new Error(payload.message || 'Не удалось загрузить административный кабинет.');
      if (!moderationResponse.ok) throw new Error(moderationPayload.message || 'Не удалось загрузить очередь модерации.');
      setDashboard({ ...payload, moderation: moderationPayload.queue ?? [] });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить административный кабинет.');
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const visibleCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (dashboard?.queue ?? []).filter((item) => {
      const status = queueLabels[item.status] ?? item.status;
      const matchesTab = queue === 'Все' || queue === 'Новые' && status === 'Новая' || queue === 'В работе' && status === 'В работе' || queue === 'Эскалации' && item.risk_level === 'high';
      return matchesTab && (!normalizedQuery || `${item.applicant} ${item.subject_id}`.toLowerCase().includes(normalizedQuery));
    });
  }, [dashboard, query, queue]);

  async function decide(verification: VerificationCase, decision: 'approve' | 'reject') {
    let reason = '';
    if (decision === 'reject' && verification.subject_type === 'buyer') {
      reason = window.prompt('Укажите причину отказа покупателю')?.trim() ?? '';
      if (!reason) return;
    } else if (decision === 'reject' && !window.confirm('Отклонить эту заявку? Проект не попадёт в каталог.')) return;
    setProcessing(verification.id);
    setFeedback('');
    try {
      const response = await fetch('/api/admin/verifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: verification.id, decision, reason }) });
      const payload = await response.json() as { message?: string; nextStep?: string | null };
      if (!response.ok) throw new Error(payload.message || 'Не удалось сохранить решение.');
      setFeedback(decision === 'approve' ? payload.nextStep === 'pending_moderation' ? 'Проверка пройдена: ЖК передан на модерацию.' : 'Заявка одобрена.' : 'Заявка отклонена.');
      await loadDashboard();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось сохранить решение.');
    } finally {
      setProcessing('');
    }
  }

  async function moderate(complexId: string, decision: 'publish' | 'reject') {
    if (decision === 'reject' && !window.confirm('Отклонить материалы на модерации?')) return;
    setProcessing(complexId);
    setFeedback('');
    try {
      const response = await fetch('/api/admin/moderation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complexId, decision }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось сохранить решение модерации.');
      setFeedback(payload.message || (decision === 'publish' ? 'Материалы опубликованы.' : 'Материалы отклонены.'));
      await loadDashboard();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось сохранить решение модерации.');
    } finally {
      setProcessing('');
    }
  }

  const userInitials = (dashboard?.session.user.fullName ?? 'Администратор').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const highRiskCount = dashboard?.queue.filter((item) => item.risk_level === 'high').length ?? 0;

  return (
    <main className="platform-admin dark">
      <aside className={`admin-sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="admin-brand"><span><ShieldCheck /></span><div><strong>Estate<em>Hub</em></strong><small>Platform Admin</small></div><button type="button" onClick={() => setMobileNav(false)} aria-label="Закрыть меню"><X /></button></div>
        <div className="admin-user"><span>{userInitials}</span><div><strong>{dashboard?.session.user.fullName ?? 'Администратор'}</strong><small>{dashboard?.session.platformRoles[0] ?? 'Platform Admin'}</small></div><ChevronDown /></div>
        <nav>{adminNav.map((item) => {
          const count = item.label === 'Верификация' ? dashboard?.stats.pendingVerifications : item.label === 'Модерация' ? dashboard?.moderation.length : item.count;
          return <button type="button" className={item.active ? 'active' : ''} key={item.label}><item.icon /><span>{item.label}</span>{Boolean(count) && <em>{count}</em>}</button>;
        })}</nav>
        <div className="system-status"><span><i/> Все системы работают</span><small>Последняя проверка: сейчас</small></div>
      </aside>
      {mobileNav && <button className="developer-sidebar-backdrop" type="button" onClick={() => setMobileNav(false)} aria-label="Закрыть меню" />}

      <section className="admin-workspace">
        <header className="admin-topbar"><div><button type="button" onClick={() => setMobileNav(true)} aria-label="Открыть меню"><Menu /></button><strong>Операционный центр</strong></div><div className="admin-global-search"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Глобальный поиск" placeholder="Компания или объект…" /></div><div><button type="button" aria-label="Уведомления"><Bell />{Boolean(dashboard?.stats.pendingVerifications) && <span>{dashboard?.stats.pendingVerifications}</span>}</button><span>{userInitials}</span></div></header>
        <div className="admin-content">
          <div className="admin-heading"><div><span>29 августа 2026 · Самарканд</span><h1>Контроль платформы</h1><p>Верификация, модерация, бронирования и финансовые операции.</p></div><Button variant="outline"><SlidersHorizontal /> Настроить дашборд</Button></div>

          {loadError && <div className="admin-operation-state error"><AlertTriangle /><span>{loadError}</span><button type="button" onClick={() => void loadDashboard()}>Повторить</button></div>}
          {feedback && <div className="admin-operation-state success"><Check /><span>{feedback}</span></div>}

          <div className="admin-kpis">
            <article><span className="ak-blue"><Users /></span><div><small>Пользователи</small><strong>{dashboard?.stats.users ?? '—'}</strong><em>активные профили</em></div></article>
            <article><span className="ak-green"><Building2 /></span><div><small>Активные ЖК</small><strong>{dashboard?.stats.activeComplexes ?? '—'}</strong><em>{dashboard?.stats.publishedListings ?? 0} объявлений</em></div></article>
            <article><span className="ak-orange"><FileCheck2 /></span><div><small>На верификации</small><strong>{dashboard?.stats.pendingVerifications ?? '—'}</strong><em>в текущей очереди</em></div></article>
            <article><span className="ak-violet"><WalletCards /></span><div><small>Опубликовано</small><strong>{dashboard?.stats.publishedListings ?? '—'}</strong><em>активных объявлений</em></div></article>
            <article><span className="ak-red"><AlertTriangle /></span><div><small>Высокий риск</small><strong>{highRiskCount}</strong><em>требуют внимания</em></div></article>
          </div>

          <div className="admin-main-grid">
            <section className="admin-panel verification-queue">
              <div className="admin-panel-heading"><div><h2>Очередь верификации</h2><p>Покупатели, компании и жилые комплексы</p></div><span className="queue-total">{dashboard?.stats.pendingVerifications ?? 0} заявок</span></div>
              <div className="admin-queue-toolbar"><div>{['Все', 'Новые', 'В работе', 'Эскалации'].map((item) => <button className={queue === item ? 'active' : ''} type="button" onClick={() => setQueue(item)} key={item}>{item}</button>)}</div><div><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Поиск заявки" placeholder="Поиск заявки" /></div></div>
              <Table className="admin-table"><TableHeader><TableRow><TableHead>Заявитель</TableHead><TableHead>Тип</TableHead><TableHead>Предмет проверки</TableHead><TableHead>Получено</TableHead><TableHead>Риск</TableHead><TableHead>Статус</TableHead><TableHead>Решение</TableHead></TableRow></TableHeader><TableBody>
                {!dashboard && !loadError && <TableRow><TableCell colSpan={7}><div className="table-empty-state">Загружаем очередь…</div></TableCell></TableRow>}
                {dashboard && visibleCases.length === 0 && <TableRow><TableCell colSpan={7}><div className="table-empty-state">В этой части очереди заявок нет.</div></TableCell></TableRow>}
                {visibleCases.map((item) => {
                  const risk = riskLabels[item.risk_level] ?? item.risk_level;
                  const status = queueLabels[item.status] ?? item.status;
                  const type = item.subject_type === 'buyer' ? 'Покупатель' : item.subject_type === 'complex' ? 'Жилой комплекс' : item.organization_type === 'agency' ? 'Агентство' : item.subject_type === 'organization' ? 'Застройщик' : 'Пользователь';
                  const subject = item.subject_type === 'buyer' ? `${item.document_type === 'passport' ? 'Паспорт' : 'ID-карта'} и возраст` : item.subject_type === 'complex' ? 'Объект и связь с застройщиком' : 'Компания и полномочия';
                  const date = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.created_at.replace(' ', 'T') + 'Z'));
                  return <TableRow key={item.id}><TableCell><div className="admin-applicant"><span>{item.applicant.slice(0,2).toUpperCase()}</span><strong>{item.applicant}</strong></div></TableCell><TableCell>{type}</TableCell><TableCell>{subject}</TableCell><TableCell>{date}</TableCell><TableCell><Badge className={`risk-badge ${risk.toLowerCase()}`}>{risk}</Badge></TableCell><TableCell><Badge className={`queue-status ${status === 'Новая' ? 'new' : 'working'}`}>{status}</Badge></TableCell><TableCell><div className="verification-actions"><button type="button" className="approve" onClick={() => void decide(item, 'approve')} disabled={processing === item.id} aria-label={`Одобрить ${item.applicant}`} title="Одобрить"><Check /></button><button type="button" className="reject" onClick={() => void decide(item, 'reject')} disabled={processing === item.id} aria-label={`Отклонить ${item.applicant}`} title="Отклонить"><X /></button></div></TableCell></TableRow>;
                })}
              </TableBody></Table>
            </section>

            <aside className="admin-side-stack">
              <section className="admin-panel attention-panel"><div className="admin-panel-heading"><div><h2>Требует внимания</h2><p>По уровню риска и SLA</p></div></div><article><span className="danger"><AlertTriangle /></span><div><strong>3 спора по бронированию</strong><small>2 требуют решения Finance Operator</small></div><ChevronDown /></article><article><span className="warning"><FileCheck2 /></span><div><strong>5 нарушений SLA проверки</strong><small>Старше 24 часов</small></div><ChevronDown /></article><article><span className="info"><WalletCards /></span><div><strong>2 ошибки сверки платежей</strong><small>Провайдер и резерв не совпали</small></div><ChevronDown /></article></section>
              <section className="admin-panel finance-summary"><div className="admin-panel-heading"><div><h2>Финансовый контур</h2><p>Сегодня</p></div></div><div><span><small>Платежи броней</small><strong>87,5 млн сум</strong></span><span><small>К возврату</small><strong>5 млн сум</strong></span><span><small>На сверке</small><strong>2 операции</strong></span></div><a href="#finance">Открыть операции</a></section>
            </aside>
          </div>

          <section className="admin-panel moderation-queue-panel">
            <div className="admin-panel-heading"><div><h2>Очередь модерации публикаций</h2><p>Проверенные ЖК и новые объявления перед выходом в каталог</p></div><span className="queue-total">{dashboard?.moderation.length ?? 0} заявок</span></div>
            <Table className="admin-table"><TableHeader><TableRow><TableHead>Жилой комплекс</TableHead><TableHead>Застройщик</TableHead><TableHead>Этап</TableHead><TableHead>Новых объявлений</TableHead><TableHead>Решение</TableHead></TableRow></TableHeader><TableBody>
              {!dashboard && !loadError && <TableRow><TableCell colSpan={5}><div className="table-empty-state">Загружаем очередь…</div></TableCell></TableRow>}
              {dashboard && dashboard.moderation.length === 0 && <TableRow><TableCell colSpan={5}><div className="table-empty-state">Очередь модерации пуста.</div></TableCell></TableRow>}
              {dashboard?.moderation.map((item) => <TableRow key={item.complex_id}><TableCell><div className="admin-applicant"><span>{item.name.slice(0, 2).toUpperCase()}</span><strong>{item.name}</strong></div></TableCell><TableCell>{item.developer}</TableCell><TableCell><Badge className="queue-status working">{item.workflow_status === 'pending_moderation' ? 'Публикация ЖК' : 'Новый инвентарь'}</Badge></TableCell><TableCell>{item.pending_listings}</TableCell><TableCell><div className="verification-actions"><button type="button" className="approve" onClick={() => void moderate(item.complex_id, 'publish')} disabled={processing === item.complex_id} aria-label={`Опубликовать ${item.name}`} title="Опубликовать"><Check /></button><button type="button" className="reject" onClick={() => void moderate(item.complex_id, 'reject')} disabled={processing === item.complex_id} aria-label={`Отклонить ${item.name}`} title="Отклонить"><X /></button></div></TableCell></TableRow>)}
            </TableBody></Table>
          </section>

          <div className="admin-lower-grid">
            <section className="admin-panel admin-activity"><div className="admin-panel-heading"><div><h2>Последние критические действия</h2><p>Неизменяемый журнал аудита</p></div><a href="#audit">Весь аудит</a></div><div><article><span><Check /></span><p><strong>Одобрен застройщик Imorat Invest</strong><small>Verification Specialist · request 9f32…c181</small></p><time>02:18</time></article><article><span><ShieldCheck /></span><p><strong>Изменена цена квартиры A-142</strong><small>Samarkand Development · 680 → 685 млн сум</small></p><time>01:54</time></article><article><span><WalletCards /></span><p><strong>Инициирован возврат по резерву R-2814</strong><small>Finance Operator · причина: отказ застройщика</small></p><time>00:41</time></article></div></section>
            <section className="admin-panel system-health"><div className="admin-panel-heading"><div><h2>Состояние системы</h2><p>Ключевые сервисы</p></div></div><div><p><span><i/> API</span><strong>99,99%</strong></p><p><span><i/> Поиск</span><strong>182 ms</strong></p><p><span><i/> Платежи</span><strong>Работает</strong></p><p><span><i/> Очереди</span><strong>24 задачи</strong></p></div></section>
          </div>
        </div>
      </section>
    </main>
  );
}
