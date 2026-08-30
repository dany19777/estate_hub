import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

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
    if (!conversationId || !body || body.length > 1000) return Response.json({ error: 'validation_failed', message: 'Введите сообщение длиной до 1000 символов.' }, { status: 400 });

    const database = await ensureMarketplaceDatabase();
    const conversation = await database.prepare(`SELECT id FROM conversations WHERE id = ? AND organization_id = ? LIMIT 1`)
      .bind(conversationId, session.organization.id).first<{ id: string }>();
    if (!conversation) return Response.json({ error: 'not_found', message: 'Диалог не найден.' }, { status: 404 });

    const messageId = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO conversation_messages (id, conversation_id, author_type, author_user_id, body, read_by_seller_at)
        VALUES (?, ?, 'seller', ?, ?, CURRENT_TIMESTAMP)`).bind(messageId, conversation.id, session.user.id, body),
      database.prepare(`UPDATE conversations SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(conversation.id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'chat.seller_reply_sent', 'conversation', ?, ?)`).bind(crypto.randomUUID(), session.user.id, conversation.id, JSON.stringify({ messageId })),
    ]);
    return Response.json({ conversationId: conversation.id, message: { id: messageId, author_type: 'seller', body } }, { status: 201 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to send developer message', error);
    return Response.json({ error: 'message_send_failed', message: 'Не удалось отправить ответ.' }, { status: 500 });
  }
}
