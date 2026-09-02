import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { syncBuyerNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function payload(database: D1Database, userId: string, phoneStatus: string) {
  const preferences = await syncBuyerNotifications(database, userId, phoneStatus);
  const [notificationResult, unread] = await Promise.all([
    database.prepare(`SELECT notification.id, notification.event_type, notification.title, notification.body, notification.href, notification.entity_type, notification.entity_id,
      notification.priority, notification.read_at, notification.created_at,
      GROUP_CONCAT(delivery.channel || ':' || delivery.status) AS delivery_summary
      FROM notifications notification LEFT JOIN notification_deliveries delivery ON delivery.notification_id = notification.id
      WHERE notification.user_id = ? GROUP BY notification.id ORDER BY notification.created_at DESC, notification.rowid DESC LIMIT 100`).bind(userId).all(),
    database.prepare(`SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL`).bind(userId).first<{ count: number }>(),
  ]);
  return { notifications: notificationResult.results ?? [], unreadCount: Number(unread?.count ?? 0), preferences, channelStatus: { inApp: 'active', email: 'sandbox_queue', sms: 'sandbox_queue', push: 'not_connected' } };
}

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    return Response.json(await payload(database, session.user.id, session.phoneVerification.status), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'notifications_unavailable', message: 'Не удалось загрузить уведомления.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAppSession(request);
    const body = await request.json() as Record<string, unknown>;
    const action = body.action === 'read' || body.action === 'read_all' || body.action === 'preferences' ? body.action : null;
    if (!action) return Response.json({ error: 'validation_failed', message: 'Не выбрано действие с уведомлениями.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    if (action === 'read') {
      const notificationId = typeof body.notificationId === 'string' ? body.notificationId : '';
      if (!notificationId) return Response.json({ error: 'validation_failed', message: 'Уведомление не найдено.' }, { status: 400 });
      const result = await database.prepare(`UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND user_id = ?`).bind(notificationId, session.user.id).run();
      if (!(result.meta.changes ?? 0)) return Response.json({ error: 'not_found', message: 'Уведомление не найдено.' }, { status: 404 });
    } else if (action === 'read_all') {
      await database.prepare(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL`).bind(session.user.id).run();
    } else {
      const emailEnabled = body.emailEnabled === true ? 1 : 0;
      const smsCriticalEnabled = body.smsCriticalEnabled === true ? 1 : 0;
      const marketingConsent = body.marketingConsent === true ? 1 : 0;
      await database.batch([
        database.prepare(`INSERT INTO notification_preferences (user_id, email_enabled, sms_critical_enabled, marketing_consent) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET email_enabled = excluded.email_enabled, sms_critical_enabled = excluded.sms_critical_enabled, marketing_consent = excluded.marketing_consent, updated_at = CURRENT_TIMESTAMP`).bind(session.user.id, emailEnabled, smsCriticalEnabled, marketingConsent),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'notification.preferences_updated', 'user', ?, ?)`).bind(crypto.randomUUID(), session.user.id, session.user.id, JSON.stringify({ emailEnabled: Boolean(emailEnabled), smsCriticalEnabled: Boolean(smsCriticalEnabled), marketingConsent: Boolean(marketingConsent) })),
      ]);
    }
    return Response.json({ ...(await payload(database, session.user.id, session.phoneVerification.status)), message: action === 'preferences' ? 'Настройки уведомлений сохранены.' : 'Уведомления отмечены прочитанными.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'notification_update_failed', message: 'Не удалось обновить уведомления.' }, { status: 500 });
  }
}
