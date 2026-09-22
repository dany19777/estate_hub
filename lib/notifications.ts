import { formatUzsAmount } from '@/lib/marketplace';

export type NotificationPriority = 'normal' | 'high' | 'critical';

export type NotificationPreferences = {
  emailEnabled: boolean;
  smsCriticalEnabled: boolean;
  marketingConsent: boolean;
};

type NotificationInput = {
  eventType: string;
  title: string;
  body: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  priority?: NotificationPriority;
  dedupeKey: string;
  occurredAt?: string;
  marketing?: boolean;
};

type WatchRow = {
  id: string;
  target_type: 'complex' | 'listing' | 'saved_search';
  target_id: string;
  notify_price_reduction: number;
  notify_availability: number;
  notify_special_offer: number;
  notify_new_inventory: number;
  created_at: string;
};

type EventListing = {
  id: string;
  complex_id: string;
  complex_name: string;
  slug: string;
  unit_number: string;
  market_type: string;
  seller_type: string;
  price_uzs: number;
  rooms: number;
  area_sqm: number;
  floor_number: number;
  finish: string;
  reserve_enabled: number;
  completion_status: string;
  district: string;
  published_at: string;
};

type SavedSearchRow = { id: string; name: string; filters_json: string; created_at: string };

function boolean(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true'; }
function sqlDate(value: string) { return value.includes('T') ? value.replace('T', ' ').replace(/Z$/, '') : value; }
function eventDate(value: string | null | undefined) { return value ? sqlDate(value) : new Date().toISOString().replace('T', ' ').replace('Z', ''); }
function money(value: number) { return formatUzsAmount(value); }

export async function notificationPreferences(database: D1Database, userId: string): Promise<NotificationPreferences> {
  await database.prepare(`INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)`).bind(userId).run();
  const row = await database.prepare(`SELECT email_enabled, sms_critical_enabled, marketing_consent FROM notification_preferences WHERE user_id = ?`).bind(userId).first<{ email_enabled: number; sms_critical_enabled: number; marketing_consent: number }>();
  return { emailEnabled: Boolean(row?.email_enabled), smsCriticalEnabled: Boolean(row?.sms_critical_enabled), marketingConsent: Boolean(row?.marketing_consent) };
}

export async function enqueueNotification(database: D1Database, userId: string, preferences: NotificationPreferences, input: NotificationInput) {
  if (input.marketing && !preferences.marketingConsent) return false;
  const notificationId = crypto.randomUUID();
  const result = await database.prepare(`INSERT OR IGNORE INTO notifications
    (id, user_id, event_type, title, body, href, entity_type, entity_id, priority, dedupe_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(notificationId, userId, input.eventType, input.title.slice(0, 120), input.body.slice(0, 500), input.href ?? null, input.entityType ?? null, input.entityId ?? null, input.priority ?? 'normal', input.dedupeKey.slice(0, 220), eventDate(input.occurredAt)).run();
  if (!(result.meta.changes ?? 0)) return false;
  const deliveries: D1PreparedStatement[] = [
    database.prepare(`INSERT INTO notification_deliveries (id, notification_id, channel, status, attempt_count, delivered_at) VALUES (?, ?, 'in_app', 'delivered', 1, CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(), notificationId),
  ];
  if (preferences.emailEnabled) deliveries.push(database.prepare(`INSERT INTO notification_deliveries (id, notification_id, channel, status) VALUES (?, ?, 'email', 'pending')`).bind(crypto.randomUUID(), notificationId));
  if ((input.priority === 'critical' || input.priority === 'high') && preferences.smsCriticalEnabled) deliveries.push(database.prepare(`INSERT INTO notification_deliveries (id, notification_id, channel, status) VALUES (?, ?, 'sms', 'pending')`).bind(crypto.randomUUID(), notificationId));
  deliveries.push(database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'system', 'notification-engine', 'notification.enqueued', 'notification', ?, ?)`)
    .bind(crypto.randomUUID(), notificationId, JSON.stringify({ userId, eventType: input.eventType, priority: input.priority ?? 'normal', dedupeKey: input.dedupeKey, emailQueued: preferences.emailEnabled, smsQueued: Boolean((input.priority === 'critical' || input.priority === 'high') && preferences.smsCriticalEnabled) })));
  await database.batch(deliveries);
  return true;
}

function matchesSearch(listing: EventListing, filters: Record<string, unknown>) {
  const market = typeof filters.market === 'string' ? filters.market : 'all';
  if (market === 'primary' && listing.market_type !== 'PRIMARY_DEVELOPER') return false;
  if (market === 'secondary' && listing.market_type === 'PRIMARY_DEVELOPER') return false;
  if (Number(filters.rooms) > 0 && listing.rooms !== Number(filters.rooms)) return false;
  if (typeof filters.status === 'string' && filters.status && listing.completion_status !== filters.status) return false;
  if (typeof filters.seller === 'string' && filters.seller && listing.seller_type !== filters.seller) return false;
  if (Number(filters.minPrice) > 0 && listing.price_uzs < Number(filters.minPrice)) return false;
  if (Number(filters.maxPrice) > 0 && listing.price_uzs > Number(filters.maxPrice)) return false;
  if (Number(filters.minArea) > 0 && listing.area_sqm < Number(filters.minArea)) return false;
  if (Number(filters.maxArea) > 0 && listing.area_sqm > Number(filters.maxArea)) return false;
  if (Number(filters.minFloor) > 0 && listing.floor_number < Number(filters.minFloor)) return false;
  if (Number(filters.maxFloor) > 0 && listing.floor_number > Number(filters.maxFloor)) return false;
  if (typeof filters.district === 'string' && filters.district && listing.district !== filters.district) return false;
  if (typeof filters.finish === 'string' && filters.finish && listing.finish !== filters.finish) return false;
  if (boolean(filters.reservable) && !listing.reserve_enabled) return false;
  return true;
}

async function syncAccountEvents(database: D1Database, userId: string, preferences: NotificationPreferences, phoneStatus: string) {
  await enqueueNotification(database, userId, preferences, {
    eventType: 'notification_center_ready',
    title: 'Центр уведомлений подключён',
    body: 'Здесь будут появляться изменения цены, новые квартиры, сообщения, просмотры и статусы бронирований.',
    href: '/profile',
    entityType: 'user',
    entityId: userId,
    dedupeKey: 'notification-center-ready',
  });
  if (phoneStatus !== 'verified') await enqueueNotification(database, userId, preferences, {
    eventType: 'phone_verification_required',
    title: 'Подтвердите номер телефона',
    body: 'После OTP-проверки станут доступны подписки, сообщения, просмотры и персональные уведомления.',
    href: '/profile',
    entityType: 'user',
    entityId: userId,
    priority: 'high',
    dedupeKey: 'phone-verification-required',
  });
}

async function syncTransactionalEvents(database: D1Database, userId: string, preferences: NotificationPreferences) {
  const [messages, viewings, reservations, reviews, paymentOperations, outcomes, managerActivities] = await Promise.all([
    database.prepare(`SELECT message.id, message.body, message.created_at, conversation.listing_id, complex.name AS complex_name, unit.unit_number
      FROM conversation_messages message JOIN conversations conversation ON conversation.id = message.conversation_id
      JOIN listings listing ON listing.id = conversation.listing_id JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = conversation.complex_id
      WHERE conversation.buyer_user_id = ? AND message.author_type = 'seller' ORDER BY message.created_at DESC LIMIT 50`).bind(userId).all<{ id: string; body: string; created_at: string; listing_id: string; complex_name: string; unit_number: string }>(),
    database.prepare(`SELECT viewing.id, viewing.status, viewing.requested_date, viewing.time_slot, viewing.updated_at, complex.name AS complex_name, complex.slug, unit.unit_number
      FROM viewings viewing JOIN leads lead ON lead.id = viewing.lead_id JOIN crm_customers customer ON customer.id = lead.customer_id
      JOIN complexes complex ON complex.id = lead.complex_id LEFT JOIN listings listing ON listing.id = lead.listing_id LEFT JOIN units unit ON unit.id = listing.unit_id
      WHERE customer.buyer_user_id = ? ORDER BY viewing.updated_at DESC LIMIT 40`).bind(userId).all<{ id: string; status: string; requested_date: string; time_slot: string; updated_at: string; complex_name: string; slug: string; unit_number: string | null }>(),
    database.prepare(`SELECT reservation.id, reservation.status, reservation.payment_status, reservation.hold_expires_at, reservation.reservation_expires_at, reservation.updated_at,
      complex.name AS complex_name, complex.slug, unit.unit_number FROM reservation_transactions reservation
      JOIN complexes complex ON complex.id = reservation.complex_id JOIN units unit ON unit.id = reservation.unit_id
      WHERE reservation.buyer_user_id = ? ORDER BY reservation.updated_at DESC LIMIT 40`).bind(userId).all<{ id: string; status: string; payment_status: string; hold_expires_at: string; reservation_expires_at: string | null; updated_at: string; complex_name: string; slug: string; unit_number: string }>(),
    database.prepare(`SELECT review.id, review.status, review.moderation_reason, review.updated_at, complex.name AS complex_name, complex.slug FROM reviews review JOIN complexes complex ON complex.id = review.complex_id WHERE review.user_id = ? AND review.status IN ('published', 'rejected', 'hidden')`).bind(userId).all<{ id: string; status: string; moderation_reason: string | null; updated_at: string; complex_name: string; slug: string }>(),
    database.prepare(`SELECT operation.id, operation.operation_type, operation.status, operation.amount_uzs, operation.updated_at,
      reservation.id AS reservation_id, complex.name AS complex_name, complex.slug, unit.unit_number
      FROM payment_operations operation JOIN reservation_transactions reservation ON reservation.id = operation.reservation_id
      JOIN complexes complex ON complex.id = reservation.complex_id JOIN units unit ON unit.id = reservation.unit_id
      WHERE reservation.buyer_user_id = ? AND ((operation.operation_type = 'reservation_payment' AND operation.status IN ('failed', 'manual_review'))
        OR (operation.operation_type = 'refund' AND operation.status IN ('pending', 'succeeded', 'failed', 'manual_review')))
      ORDER BY operation.updated_at DESC LIMIT 40`).bind(userId).all<{ id: string; operation_type: string; status: string; amount_uzs: number; updated_at: string; reservation_id: string; complex_name: string; slug: string; unit_number: string }>(),
    database.prepare(`SELECT outcome.reservation_id, outcome.outcome_status, outcome.extension_reason, outcome.extended_at, outcome.updated_at,
      complex.name AS complex_name, complex.slug, unit.unit_number FROM reservation_outcomes outcome
      JOIN reservation_transactions reservation ON reservation.id = outcome.reservation_id
      JOIN complexes complex ON complex.id = reservation.complex_id JOIN units unit ON unit.id = reservation.unit_id
      WHERE reservation.buyer_user_id = ? AND (outcome.extended_at IS NOT NULL OR outcome.outcome_status != 'active')
      ORDER BY outcome.updated_at DESC LIMIT 40`).bind(userId).all<{ reservation_id: string; outcome_status: string; extension_reason: string | null; extended_at: string | null; updated_at: string; complex_name: string; slug: string; unit_number: string }>(),
    database.prepare(`SELECT activity.id, activity.activity_type, activity.created_at, complex.name AS complex_name, complex.slug, unit.unit_number
      FROM lead_activities activity JOIN leads lead ON lead.id = activity.lead_id JOIN crm_customers customer ON customer.id = lead.customer_id
      JOIN complexes complex ON complex.id = lead.complex_id LEFT JOIN listings listing ON listing.id = lead.listing_id LEFT JOIN units unit ON unit.id = listing.unit_id
      WHERE customer.buyer_user_id = ? AND activity.activity_type IN ('lead.manager_assigned', 'lead.manager_reassigned')
      ORDER BY activity.created_at DESC LIMIT 40`).bind(userId).all<{ id: string; activity_type: string; created_at: string; complex_name: string; slug: string; unit_number: string | null }>(),
  ]);
  for (const message of messages.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: 'new_message', title: `Новое сообщение по квартире № ${message.unit_number}`, body: `${message.complex_name}: ${message.body}`, href: `/listing/${message.listing_id}`, entityType: 'message', entityId: message.id, priority: 'high', dedupeKey: `message:${message.id}`, occurredAt: message.created_at });
  for (const viewing of viewings.results ?? []) {
    const labels: Record<string, string> = { requested: 'Запрос на просмотр отправлен', confirmed: 'Просмотр подтверждён', rescheduled: 'Просмотр перенесён', attended: 'Просмотр состоялся', no_show: 'Просмотр пропущен', cancelled: 'Просмотр отменён', converted: 'Просмотр завершён сделкой' };
    await enqueueNotification(database, userId, preferences, { eventType: `viewing_${viewing.status}`, title: labels[viewing.status] ?? 'Статус просмотра изменён', body: `${viewing.complex_name}${viewing.unit_number ? ` · № ${viewing.unit_number}` : ''} · ${viewing.requested_date}, ${viewing.time_slot}`, href: `/complex/${viewing.slug}`, entityType: 'viewing', entityId: viewing.id, priority: ['rescheduled', 'cancelled'].includes(viewing.status) ? 'high' : 'normal', dedupeKey: `viewing:${viewing.id}:${viewing.status}:${viewing.updated_at}`, occurredAt: viewing.updated_at });
    const slot = viewing.time_slot.length === 5 ? `${viewing.time_slot}:00` : viewing.time_slot;
    const remainingHours = (new Date(`${viewing.requested_date}T${slot}+05:00`).getTime() - Date.now()) / 3_600_000;
    if (['confirmed', 'rescheduled'].includes(viewing.status) && remainingHours > 0 && remainingHours <= 24) await enqueueNotification(database, userId, preferences, { eventType: 'viewing_reminder', title: 'Напоминание о просмотре', body: `${viewing.complex_name}${viewing.unit_number ? ` · № ${viewing.unit_number}` : ''} · ${viewing.requested_date}, ${viewing.time_slot}.`, href: `/complex/${viewing.slug}`, entityType: 'viewing', entityId: viewing.id, priority: 'high', dedupeKey: `viewing-reminder:${viewing.id}:${viewing.requested_date}:${viewing.time_slot}`, occurredAt: new Date().toISOString() });
  }
  for (const reservation of reservations.results ?? []) {
    const labels: Record<string, [string, string, NotificationPriority]> = {
      payment_hold: ['Квартира удерживается для оплаты', 'Завершите оплату до окончания пяти минут.', 'critical'],
      confirmed: ['Бронирование подтверждено', 'Оплата принята, цена и квартира зафиксированы.', 'critical'],
      cancelled: ['Бронирование отменено', 'Квартира больше не удерживается за вами.', 'high'],
      expired: ['Срок бронирования истёк', 'Квартира снова доступна в каталоге.', 'high'],
      refunded: ['Возврат по бронированию завершён', 'Финансовый статус обновлён в личном кабинете.', 'critical'],
    };
    const [title, body, priority] = labels[reservation.status] ?? ['Статус бронирования изменён', 'Откройте личный кабинет для подробностей.', 'high'];
    await enqueueNotification(database, userId, preferences, { eventType: `reservation_${reservation.status}`, title, body: `${reservation.complex_name} · № ${reservation.unit_number}. ${body}`, href: '/profile', entityType: 'reservation', entityId: reservation.id, priority, dedupeKey: `reservation:${reservation.id}:${reservation.status}:${reservation.payment_status}:${reservation.updated_at}`, occurredAt: reservation.updated_at });
    const expiresAt = reservation.status === 'payment_hold' ? reservation.hold_expires_at : reservation.reservation_expires_at;
    if (expiresAt && ['payment_hold', 'confirmed'].includes(reservation.status)) {
      const remainingHours = (new Date(`${sqlDate(expiresAt).replace(' ', 'T')}Z`).getTime() - Date.now()) / 3_600_000;
      const threshold = remainingHours <= 3 ? 3 : remainingHours <= 24 ? 24 : null;
      if (threshold) await enqueueNotification(database, userId, preferences, { eventType: `reservation_${threshold}h_remaining`, title: threshold === 3 ? 'До окончания брони осталось 3 часа' : 'До окончания брони осталось 24 часа', body: `${reservation.complex_name} · квартира № ${reservation.unit_number}.`, href: '/profile', entityType: 'reservation', entityId: reservation.id, priority: 'critical', dedupeKey: `reservation-reminder:${reservation.id}:${threshold}`, occurredAt: new Date().toISOString() });
    }
  }
  for (const review of reviews.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: `review_${review.status}`, title: review.status === 'published' ? 'Ваш отзыв опубликован' : 'По отзыву принято решение', body: review.status === 'published' ? `${review.complex_name}: отзыв появился на публичной странице.` : review.moderation_reason ?? `${review.complex_name}: откройте отзыв для подробностей.`, href: `/complex/${review.slug}#reviews`, entityType: 'review', entityId: review.id, priority: review.status === 'published' ? 'normal' : 'high', dedupeKey: `review:${review.id}:${review.status}:${review.updated_at}`, occurredAt: review.updated_at });
  for (const operation of paymentOperations.results ?? []) {
    const paymentFailure = operation.operation_type === 'reservation_payment';
    const refundCompleted = operation.operation_type === 'refund' && operation.status === 'succeeded';
    const refundPending = operation.operation_type === 'refund' && operation.status === 'pending';
    const title = paymentFailure ? 'Оплата бронирования требует внимания' : refundCompleted ? 'Возврат завершён' : refundPending ? 'Возврат инициирован' : 'Возврат требует проверки';
    const detail = paymentFailure ? 'Платёж не был завершён или отправлен на ручную сверку.' : refundCompleted ? `${money(operation.amount_uzs)} возвращено через платёжный контур.` : refundPending ? 'Запрос принят платёжным контуром.' : 'Операция отправлена на ручную проверку.';
    await enqueueNotification(database, userId, preferences, { eventType: paymentFailure ? 'reservation_payment_failed' : refundCompleted ? 'reservation_refund_completed' : refundPending ? 'reservation_refund_initiated' : 'reservation_refund_review', title, body: `${operation.complex_name} · № ${operation.unit_number}. ${detail}`, href: '/profile', entityType: 'reservation', entityId: operation.reservation_id, priority: paymentFailure || !refundCompleted ? 'critical' : 'high', dedupeKey: `payment-operation:${operation.id}:${operation.status}`, occurredAt: operation.updated_at });
  }
  for (const outcome of outcomes.results ?? []) {
    if (outcome.extended_at) await enqueueNotification(database, userId, preferences, { eventType: 'reservation_extended', title: 'Срок бронирования продлён', body: `${outcome.complex_name} · № ${outcome.unit_number}.${outcome.extension_reason ? ` Причина: ${outcome.extension_reason}` : ''}`, href: '/profile', entityType: 'reservation', entityId: outcome.reservation_id, priority: 'high', dedupeKey: `reservation-extension:${outcome.reservation_id}:${outcome.extended_at}`, occurredAt: outcome.extended_at });
    if (outcome.outcome_status !== 'active') {
      const labels: Record<string, string> = { visit_completed: 'Визит по бронированию завершён', deal_in_progress: 'Объект переведён в сделку', buyer_refused: 'Отказ покупателя зарегистрирован', developer_refused: 'Застройщик отменил бронирование', sold: 'Сделка завершена', cancelled_admin: 'Бронирование закрыто администратором' };
      await enqueueNotification(database, userId, preferences, { eventType: `reservation_outcome_${outcome.outcome_status}`, title: labels[outcome.outcome_status] ?? 'Результат бронирования обновлён', body: `${outcome.complex_name} · квартира № ${outcome.unit_number}.`, href: '/profile', entityType: 'reservation', entityId: outcome.reservation_id, priority: ['developer_refused', 'cancelled_admin'].includes(outcome.outcome_status) ? 'critical' : 'high', dedupeKey: `reservation-outcome:${outcome.reservation_id}:${outcome.outcome_status}:${outcome.updated_at}`, occurredAt: outcome.updated_at });
    }
  }
  for (const activity of managerActivities.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: activity.activity_type === 'lead.manager_reassigned' ? 'manager_reassigned' : 'manager_assigned', title: activity.activity_type === 'lead.manager_reassigned' ? 'По заявке назначен новый менеджер' : 'К заявке подключён менеджер', body: `${activity.complex_name}${activity.unit_number ? ` · квартира № ${activity.unit_number}` : ''}.`, href: `/complex/${activity.slug}`, entityType: 'lead_activity', entityId: activity.id, priority: 'normal', dedupeKey: `manager-assignment:${activity.id}`, occurredAt: activity.created_at });
}

async function syncWatchEvents(database: D1Database, userId: string, preferences: NotificationPreferences) {
  const watchResult = await database.prepare(`SELECT id, target_type, target_id, notify_price_reduction, notify_availability, notify_special_offer, notify_new_inventory, created_at FROM buyer_watch_subscriptions WHERE user_id = ? AND active = 1 ORDER BY updated_at DESC LIMIT 50`).bind(userId).all<WatchRow>();
  for (const watch of watchResult.results ?? []) {
    if (watch.target_type === 'saved_search') continue;
    const target = watch.target_type === 'complex'
      ? await database.prepare(`SELECT id AS complex_id FROM complexes WHERE id = ? LIMIT 1`).bind(watch.target_id).first<{ complex_id: string }>()
      : await database.prepare(`SELECT complex_id FROM listings WHERE id = ? LIMIT 1`).bind(watch.target_id).first<{ complex_id: string }>();
    if (!target) continue;
    const targetPredicate = watch.target_type === 'complex' ? `listing.complex_id = ?` : `listing.id = ?`;
    if (watch.notify_price_reduction) {
      const rows = await database.prepare(`SELECT history.id, history.old_price_uzs, history.new_price_uzs, history.changed_at, listing.id AS listing_id, unit.unit_number, complex.name AS complex_name
        FROM listing_price_history history JOIN listings listing ON listing.id = history.listing_id JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id
        WHERE ${targetPredicate} AND history.changed_at >= ? AND history.old_price_uzs IS NOT NULL AND history.new_price_uzs < history.old_price_uzs ORDER BY history.changed_at DESC LIMIT 30`).bind(watch.target_id, watch.created_at).all<{ id: string; old_price_uzs: number; new_price_uzs: number; changed_at: string; listing_id: string; unit_number: string; complex_name: string }>();
      for (const row of rows.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: 'listing_price_reduced', title: `Цена квартиры № ${row.unit_number} снизилась`, body: `${row.complex_name}: ${money(row.old_price_uzs)} → ${money(row.new_price_uzs)}.`, href: `/listing/${row.listing_id}`, entityType: 'listing', entityId: row.listing_id, priority: 'high', dedupeKey: `price-reduced:${row.id}`, occurredAt: row.changed_at });
    }
    if (watch.notify_special_offer) {
      const rows = await database.prepare(`SELECT promotion.id, promotion.created_at, COALESCE(promotion.listing_id, '') AS listing_id, complex.name AS complex_name, complex.slug
        FROM promotions promotion LEFT JOIN listings listing ON listing.id = promotion.listing_id JOIN complexes complex ON complex.id = COALESCE(promotion.complex_id, listing.complex_id)
        WHERE complex.id = ? AND promotion.created_at >= ? AND promotion.status IN ('active', 'scheduled') ORDER BY promotion.created_at DESC LIMIT 20`).bind(target.complex_id, watch.created_at).all<{ id: string; created_at: string; listing_id: string; complex_name: string; slug: string }>();
      for (const row of rows.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: 'special_offer_appeared', title: `Новое предложение в ${row.complex_name}`, body: 'На объекте появилось ограниченное продвижение от проверенного продавца.', href: row.listing_id ? `/listing/${row.listing_id}` : `/complex/${row.slug}`, entityType: row.listing_id ? 'listing' : 'complex', entityId: row.listing_id || target.complex_id, dedupeKey: `special-offer:${row.id}`, occurredAt: row.created_at, marketing: true });
    }
    if (watch.notify_new_inventory && watch.target_type === 'complex') {
      const rows = await database.prepare(`SELECT listing.id, listing.published_at, unit.unit_number, complex.name AS complex_name FROM listings listing JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id WHERE listing.complex_id = ? AND listing.status = 'published' AND listing.published_at >= ? ORDER BY listing.published_at DESC LIMIT 30`).bind(target.complex_id, watch.created_at).all<{ id: string; published_at: string; unit_number: string; complex_name: string }>();
      for (const row of rows.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: 'followed_complex_new_inventory', title: `Новая квартира в ${row.complex_name}`, body: `Опубликовано предложение по квартире № ${row.unit_number}.`, href: `/listing/${row.id}`, entityType: 'listing', entityId: row.id, dedupeKey: `new-inventory:${watch.id}:${row.id}`, occurredAt: row.published_at });
    }
    if (watch.notify_availability) {
      const statuses = await database.prepare(`SELECT listing.id, listing.status, listing.updated_at, unit.unit_number, complex.name AS complex_name
        FROM listings listing JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id
        WHERE ${targetPredicate} AND listing.updated_at >= ? AND listing.status IN ('reserved', 'sold') ORDER BY listing.updated_at DESC LIMIT 30`).bind(watch.target_id, watch.created_at).all<{ id: string; status: string; updated_at: string; unit_number: string; complex_name: string }>();
      for (const row of statuses.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: row.status === 'sold' ? 'listing_sold' : 'listing_reserved_status_changed', title: row.status === 'sold' ? `Квартира № ${row.unit_number} продана` : `Квартира № ${row.unit_number} зарезервирована`, body: `${row.complex_name}: статус предложения изменился.`, href: `/listing/${row.id}`, entityType: 'listing', entityId: row.id, priority: 'high', dedupeKey: `listing-status:${watch.id}:${row.id}:${row.status}:${row.updated_at}`, occurredAt: row.updated_at });
      const rows = await database.prepare(`SELECT reservation.id, reservation.updated_at, reservation.listing_id, unit.unit_number, complex.name AS complex_name
        FROM reservation_transactions reservation JOIN listings listing ON listing.id = reservation.listing_id JOIN units unit ON unit.id = reservation.unit_id JOIN complexes complex ON complex.id = reservation.complex_id
        WHERE ${targetPredicate} AND reservation.updated_at >= ? AND reservation.status IN ('cancelled', 'expired', 'refunded') AND listing.status = 'published' AND unit.availability_status = 'available' ORDER BY reservation.updated_at DESC LIMIT 20`).bind(watch.target_id, watch.created_at).all<{ id: string; updated_at: string; listing_id: string; unit_number: string; complex_name: string }>();
      for (const row of rows.results ?? []) await enqueueNotification(database, userId, preferences, { eventType: 'listing_available_again', title: `Квартира № ${row.unit_number} снова доступна`, body: `${row.complex_name}: предыдущее удержание завершилось.`, href: `/listing/${row.listing_id}`, entityType: 'listing', entityId: row.listing_id, priority: 'high', dedupeKey: `available-again:${row.id}:${row.updated_at}`, occurredAt: row.updated_at });
    }
  }
}

async function syncSavedSearchEvents(database: D1Database, userId: string, preferences: NotificationPreferences) {
  const searchResult = await database.prepare(`SELECT id, name, filters_json, created_at FROM buyer_saved_searches WHERE user_id = ? AND notifications_enabled = 1 ORDER BY updated_at DESC LIMIT 20`).bind(userId).all<SavedSearchRow>();
  for (const search of searchResult.results ?? []) {
    let filters: Record<string, unknown> = {};
    try { filters = JSON.parse(search.filters_json) as Record<string, unknown>; } catch { continue; }
    const listings = await database.prepare(`SELECT listing.id, listing.complex_id, listing.market_type, listing.seller_type, listing.price_uzs, listing.reserve_enabled, listing.published_at,
      unit.unit_number, unit.rooms, unit.area_sqm, unit.floor_number, unit.finish, complex.name AS complex_name, complex.slug, complex.completion_status, district.name_ru AS district
      FROM listings listing JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id JOIN districts district ON district.id = complex.district_id
      WHERE listing.status = 'published' AND listing.published_at >= ? ORDER BY listing.published_at DESC LIMIT 100`).bind(search.created_at).all<EventListing>();
    for (const listing of listings.results ?? []) if (matchesSearch(listing, filters)) await enqueueNotification(database, userId, preferences, { eventType: 'saved_search_match', title: `Новое совпадение: ${search.name}`, body: `${listing.complex_name} · квартира № ${listing.unit_number} · ${money(listing.price_uzs)}.`, href: `/listing/${listing.id}`, entityType: 'listing', entityId: listing.id, dedupeKey: `saved-search:${search.id}:${listing.id}`, occurredAt: listing.published_at });
  }
}

export async function syncBuyerNotifications(database: D1Database, userId: string, phoneStatus: string) {
  const preferences = await notificationPreferences(database, userId);
  await syncAccountEvents(database, userId, preferences, phoneStatus);
  await Promise.all([
    syncTransactionalEvents(database, userId, preferences),
    syncWatchEvents(database, userId, preferences),
    syncSavedSearchEvents(database, userId, preferences),
  ]);
  return preferences;
}
