import { authorizationResponse, requireVerifiedPhone } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { consumeRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const conversationSelect = `SELECT conversation.id, conversation.listing_id, conversation.status, conversation.updated_at,
  complex.name AS complex_name, complex.slug, complex.hero_image_url AS image,
  unit.unit_number, unit.rooms, unit.area_sqm,
  COALESCE(organization.name, CASE listing.seller_type WHEN 'owner' THEN 'Собственник' ELSE 'Агентство недвижимости' END) AS seller,
  (SELECT message.body FROM conversation_messages message WHERE message.conversation_id = conversation.id ORDER BY message.created_at DESC, message.id DESC LIMIT 1) AS last_message,
  (SELECT message.created_at FROM conversation_messages message WHERE message.conversation_id = conversation.id ORDER BY message.created_at DESC, message.id DESC LIMIT 1) AS last_message_at,
  (SELECT COUNT(*) FROM conversation_messages message WHERE message.conversation_id = conversation.id) AS message_count,
  (SELECT COUNT(*) FROM conversation_messages message WHERE message.conversation_id = conversation.id AND message.author_type = 'seller' AND message.read_by_buyer_at IS NULL) AS unread_count
  FROM conversations conversation
  JOIN listings listing ON listing.id = conversation.listing_id
  JOIN units unit ON unit.id = listing.unit_id
  JOIN complexes complex ON complex.id = conversation.complex_id
  LEFT JOIN organizations organization ON organization.id = conversation.organization_id`;

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const database = await ensureMarketplaceDatabase();
    const listingId = new URL(request.url).searchParams.get('listingId');

    if (!listingId) {
      const result = await database
        .prepare(`${conversationSelect}
        WHERE conversation.buyer_user_id = ?
        ORDER BY conversation.updated_at DESC`)
        .bind(session.user.id)
        .all();
      return Response.json(
        { conversations: result.results ?? [] },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const conversation = await database
      .prepare(`${conversationSelect}
      WHERE conversation.buyer_user_id = ? AND conversation.listing_id = ? LIMIT 1`)
      .bind(session.user.id, listingId)
      .first();
    if (!conversation)
      return Response.json(
        { conversation: null, messages: [] },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );

    const messages = await database
      .prepare(`SELECT id, author_type, body, created_at
      FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC`)
      .bind(conversation.id)
      .all();
    await database
      .prepare(`UPDATE conversation_messages SET read_by_buyer_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND author_type = 'seller' AND read_by_buyer_at IS NULL`)
      .bind(conversation.id)
      .run();
    return Response.json(
      { conversation, messages: messages.results ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return (
      authorizationResponse(error) ??
      Response.json(
        {
          error: 'messages_unavailable',
          message: 'Не удалось загрузить переписку.',
        },
        { status: 500 },
      )
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const listingId = typeof payload.listingId === 'string' ? payload.listingId.trim() : '';
    const body = typeof payload.body === 'string' ? payload.body.trim() : '';
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return Response.json({ error: 'idempotency_required', message: 'Обновите страницу и повторите отправку.' }, { status: 400 });
    if (!listingId || !body || body.length > 1000)
      return Response.json(
        {
          error: 'validation_failed',
          message: 'Введите сообщение длиной до 1000 символов.',
        },
        { status: 400 },
      );

    const database = await ensureMarketplaceDatabase();
    const existing = await database.prepare(`SELECT message.id, message.body, message.author_type, conversation.listing_id, conversation.buyer_user_id, conversation.id AS conversation_id
      FROM conversation_messages message JOIN conversations conversation ON conversation.id = message.conversation_id
      WHERE message.idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first<{ id: string; body: string; author_type: string; listing_id: string; buyer_user_id: string; conversation_id: string }>();
    if (existing) {
      if (existing.author_type !== 'buyer' || existing.buyer_user_id !== session.user.id || existing.listing_id !== listingId || existing.body !== body) return Response.json({ error: 'idempotency_conflict', message: 'Ключ сообщения уже использован.' }, { status: 409 });
      return Response.json({ conversationId: existing.conversation_id, message: { id: existing.id, author_type: 'buyer', body }, duplicate: true });
    }
    const limit = await consumeRateLimit(database, `chat-buyer:${session.user.id}`, 60, 3600);
    if (!limit.allowed) return Response.json({ error: 'rate_limited', message: 'Слишком много сообщений. Попробуйте позже.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    const listing = await database
      .prepare(`SELECT listing.id, listing.complex_id, listing.seller_org_id
      FROM listings listing
      JOIN complexes complex ON complex.id = listing.complex_id AND complex.verification_status = 'verified'
      JOIN complex_publication_workflows workflow ON workflow.complex_id = listing.complex_id AND workflow.status = 'published'
      LEFT JOIN organizations organization ON organization.id = listing.seller_org_id
      LEFT JOIN secondary_listing_owners secondary_owner ON secondary_owner.listing_id = listing.id
      WHERE listing.id = ? AND listing.status IN ('published', 'reserved')
        AND (listing.seller_org_id IS NULL OR organization.verification_status = 'verified')
        AND (listing.market_type = 'PRIMARY_DEVELOPER' OR secondary_owner.verification_status = 'approved')
      LIMIT 1`)
      .bind(listingId)
      .first<{
        id: string;
        complex_id: string;
        seller_org_id: string | null;
      }>();
    if (!listing)
      return Response.json(
        {
          error: 'listing_unavailable',
          message: 'Объявление недоступно для переписки.',
        },
        { status: 404 },
      );

    const newConversationId = crypto.randomUUID();
    await database
      .prepare(`INSERT OR IGNORE INTO conversations (id, buyer_user_id, listing_id, complex_id, organization_id)
      VALUES (?, ?, ?, ?, ?)`)
      .bind(
        newConversationId,
        session.user.id,
        listing.id,
        listing.complex_id,
        listing.seller_org_id,
      )
      .run();
    const conversation = await database
      .prepare(
        `SELECT id FROM conversations WHERE buyer_user_id = ? AND listing_id = ? LIMIT 1`,
      )
      .bind(session.user.id, listing.id)
      .first<{ id: string }>();
    if (!conversation) throw new Error('Conversation was not created');

    const messageId = crypto.randomUUID();
    try { await database.batch([
      database
        .prepare(`INSERT INTO conversation_messages (id, conversation_id, author_type, author_user_id, body, idempotency_key, read_by_buyer_at)
        VALUES (?, ?, 'buyer', ?, ?, ?, CURRENT_TIMESTAMP)`)
        .bind(messageId, conversation.id, session.user.id, body, idempotencyKey),
      database
        .prepare(
          `UPDATE conversations SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
        .bind(conversation.id),
      database
        .prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'chat.message_sent', 'conversation', ?, ?)`)
        .bind(
          crypto.randomUUID(),
          session.user.id,
          conversation.id,
          JSON.stringify({ listingId, messageId }),
        ),
    ]); } catch (error) {
      const concurrent = await database.prepare(`SELECT message.id, message.body, message.author_type, conversation.listing_id, conversation.buyer_user_id, conversation.id AS conversation_id
        FROM conversation_messages message JOIN conversations conversation ON conversation.id = message.conversation_id
        WHERE message.idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first<{ id: string; body: string; author_type: string; listing_id: string; buyer_user_id: string; conversation_id: string }>();
      if (concurrent && concurrent.author_type === 'buyer' && concurrent.buyer_user_id === session.user.id && concurrent.listing_id === listingId && concurrent.body === body) return Response.json({ conversationId: concurrent.conversation_id, message: { id: concurrent.id, author_type: 'buyer', body }, duplicate: true });
      throw error;
    }
    return Response.json(
      {
        conversationId: conversation.id,
        message: { id: messageId, author_type: 'buyer', body },
      },
      { status: 201 },
    );
  } catch (error) {
    return (
      authorizationResponse(error) ??
      Response.json(
        {
          error: 'message_send_failed',
          message: 'Не удалось отправить сообщение.',
        },
        { status: 500 },
      )
    );
  }
}
