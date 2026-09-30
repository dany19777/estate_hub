import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const current = await database
      .prepare(
        'SELECT id, status, created_at FROM account_deletion_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      )
      .bind(session.user.id)
      .first();
    return Response.json(
      { request: current ?? null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return (
      authorizationResponse(error) ??
      Response.json(
        { message: 'Не удалось загрузить заявку.' },
        { status: 500 },
      )
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const body = (await request.json()) as { confirmation?: unknown };
    if (body.confirmation !== 'УДАЛИТЬ')
      return Response.json(
        { message: 'Подтвердите запрос словом УДАЛИТЬ.' },
        { status: 400 },
      );
    const database = await ensureMarketplaceDatabase();
    const existing = await database
      .prepare(
        "SELECT id FROM account_deletion_requests WHERE user_id = ? AND status IN ('requested', 'in_review') LIMIT 1",
      )
      .bind(session.user.id)
      .first<{ id: string }>();
    if (existing)
      return Response.json({
        requestId: existing.id,
        message: 'Запрос уже принят.',
      });
    const id = crypto.randomUUID();
    await database.batch([
      database
        .prepare(
          'INSERT INTO account_deletion_requests (id, user_id) VALUES (?, ?)',
        )
        .bind(id, session.user.id),
      database
        .prepare(
          "INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'account.deletion_requested', 'user', ?, '{}')",
        )
        .bind(crypto.randomUUID(), session.user.id, session.user.id),
    ]);
    return Response.json(
      {
        requestId: id,
        message:
          'Запрос на удаление принят. Поддержка проверит связанные сделки и свяжется с вами.',
      },
      { status: 202 },
    );
  } catch (error) {
    return (
      authorizationResponse(error) ??
      Response.json(
        { message: 'Не удалось отправить запрос.' },
        { status: 500 },
      )
    );
  }
}
