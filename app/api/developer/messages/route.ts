import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { consumeRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const conversationSelect = `SELECT conversation.id, conversation.listing_id, conversation.status, conversation.updated_at,
  buyer.full_name AS buyer_name, buyer.email AS buyer_email,
  complex.name AS complex_name, complex.slug, complex.hero_image_url AS image,
  unit.unit_number, unit.rooms, unit.area_sqm,
  (SELECT message.body FROM conversation_messages message WHERE message.conversation_id = conversation.id ORDER BY message.created_at DESC, message.rowid DESC LIMIT 1) AS last_message,
  (SELECT message.created_at FROM conversation_messages message WHERE message.conversation_id = conversation.id ORDER BY message.created_at DESC, message.rowid DESC LIMIT 1) AS last_message_at,
  (SELECT COUNT(*) FROM conversation_messages message WHERE message.conversation_id = conversation.id AND message.author_type = 'buyer' AND message.read_by_seller_at IS NULL) AS unread_count
  FROM conversations conversation
  JOIN users buyer ON buyer.id = conversation.buyer_user_id
  JOIN listings listing ON listing.id = conversation.listing_id
  JOIN units unit ON unit.id = listing.unit_id
  JOIN complexes complex ON complex.id = conversation.complex_id`;

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
    if (!session.organization) return Response.json({ conversations: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    const database = await ensureMarketplaceDatabase();
    const conversationId = new URL(request.url).searchParams.get('conversationId');

    if (!conversationId) {
      const result = await database.prepare(`${conversationSelect}
        WHERE conversation.organization_id = ?
        ORDER BY conversation.updated_at DESC`).bind(session.organization.id).all();
      return Response.json({ conversations: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const conversation = await database.prepare(`${conversationSelect}
      WHERE conversation.organization_id = ? AND conversation.id = ? LIMIT 1`).bind(session.organization.id, conversationId).first();
    if (!conversation) return Response.json({ error: 'not_found', message: 'Диалог не найден.' }, { status: 404 });
    const messages = await database.prepare(`SELECT id, author_type, body, created_at
      FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC, rowid ASC`).bind(conversationId).all();
    await database.prepare(`UPDATE conversation_messages SET read_by_seller_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND author_type = 'buyer' AND read_by_seller_at IS NULL`).bind(conversationId).run();
    return Response.json({ conversation, messages: messages.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load developer messages', error);
    return Response.json({ error: 'messages_unavailable', message: 'Не удалось загрузить сообщения.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_LEADS');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Не найден профиль компании.' }, { status: 409 });
    const payload = await request.json() as Record<string, unknown>;
    const conversationId = typeof payload.conversationId === 'string' ? payload.conversationId : '';
    const body = typeof payload.body === 'string' ? payload.body.trim() : '';
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return Response.json({ error: 'idempotency_required', message: 'Обновите страницу и повторите отправку.' }, { status: 400 });
    if (!conversationId || !body || body.length > 1000) return Response.json({ error: 'validation_failed', message: 'Введите сообщение длиной до 1000 символов.' }, { status: 400 });

    const database = await ensureMarketplaceDatabase();
    const existing = await database.prepare(`SELECT message.id, message.body, message.author_type, message.author_user_id, conversation.id AS conversation_id, conversation.organization_id
      FROM conversation_messages message JOIN conversations conversation ON conversation.id = message.conversation_id
      WHERE message.idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first<{ id: string; body: string; author_type: string; author_user_id: string; conversation_id: string; organization_id: string }>();
    if (existing) {
      if (existing.author_type !== 'seller' || existing.organization_id !== session.organization.id || existing.author_user_id !== session.user.id || existing.conversation_id !== conversationId || existing.body !== body) return Response.json({ error: 'idempotency_conflict', message: 'Ключ сообщения уже использован.' }, { status: 409 });
      return Response.json({ conversationId, message: { id: existing.id, author_type: 'seller', body }, duplicate: true });
    }
    const limit = await consumeRateLimit(database, `chat-developer:${session.user.id}`, 120, 3600);
    if (!limit.allowed) return Response.json({ error: 'rate_limited', message: 'Слишком много сообщений. Попробуйте позже.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    const conversation = await database.prepare(`SELECT id FROM conversations WHERE id = ? AND organization_id = ? LIMIT 1`)
      .bind(conversationId, session.organization.id).first<{ id: string }>();
    if (!conversation) return Response.json({ error: 'not_found', message: 'Диалог не найден.' }, { status: 404 });

    const messageId = crypto.randomUUID();
    try { await database.batch([
      database.prepare(`INSERT INTO conversation_messages (id, conversation_id, author_type, author_user_id, body, idempotency_key, read_by_seller_at)
        VALUES (?, ?, 'seller', ?, ?, ?, CURRENT_TIMESTAMP)`).bind(messageId, conversation.id, session.user.id, body, idempotencyKey),
      database.prepare(`UPDATE conversations SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(conversation.id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'chat.seller_reply_sent', 'conversation', ?, ?)`).bind(crypto.randomUUID(), session.user.id, conversation.id, JSON.stringify({ messageId })),
    ]); } catch (error) {
      const concurrent = await database.prepare(`SELECT message.id, message.body, message.author_type, message.author_user_id, conversation.id AS conversation_id, conversation.organization_id
        FROM conversation_messages message JOIN conversations conversation ON conversation.id = message.conversation_id
        WHERE message.idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first<{ id: string; body: string; author_type: string; author_user_id: string; conversation_id: string; organization_id: string }>();
      if (concurrent && concurrent.author_type === 'seller' && concurrent.organization_id === session.organization.id && concurrent.author_user_id === session.user.id && concurrent.conversation_id === conversationId && concurrent.body === body) return Response.json({ conversationId, message: { id: concurrent.id, author_type: 'seller', body }, duplicate: true });
      throw error;
    }
    return Response.json({ conversationId: conversation.id, message: { id: messageId, author_type: 'seller', body } }, { status: 201 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to send developer message', error);
    return Response.json({ error: 'message_send_failed', message: 'Не удалось отправить ответ.' }, { status: 500 });
  }
}
