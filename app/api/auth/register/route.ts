import { ensureMarketplaceDatabase } from '@/lib/database';
import { hashPassword, tokenHash } from '@/lib/password';
import { consumeRateLimit } from '@/lib/rate-limit';
import { sameOrigin } from '@/lib/password-auth';

export const dynamic = 'force-dynamic';
const registrationEnabled = () =>
  process.env.ESTATEHUB_SELF_REGISTRATION === 'enabled' &&
  process.env.LEGAL_DOCUMENTS_PUBLISHED === 'yes';

export async function GET() {
  return Response.json(
    { enabled: registrationEnabled() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { message: 'Недопустимый источник запроса.' },
      { status: 403 },
    );
  if (!registrationEnabled())
    return Response.json(
      {
        message:
          'Регистрация откроется после публикации юридических документов.',
      },
      { status: 503 },
    );
  if (Number(request.headers.get('content-length') ?? 0) > 4096)
    return new Response(null, { status: 413 });
  try {
    const raw = await request.text();
    if (raw.length > 4096) return new Response(null, { status: 413 });
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
      body = parsed as Record<string, unknown>;
    } catch {
      return Response.json({ message: 'Некорректный запрос.' }, { status: 400 });
    }
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const fullName =
      typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 200 ||
      fullName.length < 2 ||
      fullName.length > 100 ||
      password.length < 12 ||
      password.length > 128 ||
      body.acceptedDocuments !== true
    )
      return Response.json(
        { message: 'Проверьте имя, email, пароль и согласие с документами.' },
        { status: 400 },
      );
    const database = await ensureMarketplaceDatabase();
    const source = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const sourceHash = await tokenHash(source);
    const limit = await consumeRateLimit(
      database,
      `register:${sourceHash}`,
      5,
      3600,
    );
    if (!limit.allowed)
      return Response.json(
        { message: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429 },
      );
    const existing = await database
      .prepare(
        'SELECT 1 AS found FROM auth_credentials WHERE login = ? LIMIT 1',
      )
      .bind(email)
      .first();
    if (existing)
      return Response.json(
        { message: 'Аккаунт с этим email уже существует.' },
        { status: 409 },
      );
    const id = crypto.randomUUID();
    const marketing = body.marketingOptIn === true ? 1 : 0;
    await database.batch([
      database
        .prepare(
          'INSERT INTO users (id, external_user_id, email, full_name) VALUES (?, ?, ?, ?)',
        )
        .bind(id, `self:${id}`, email, fullName),
      database
        .prepare(
          'INSERT INTO auth_credentials (user_id, login, password_hash) VALUES (?, ?, ?)',
        )
        .bind(id, email, await hashPassword(password)),
      database
        .prepare(
          'INSERT INTO account_consents (user_id, terms_accepted_at, privacy_accepted_at, marketing_opt_in, document_version) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)',
        )
        .bind(id, marketing, 'launch-v1'),
      database
        .prepare(
          'INSERT INTO notification_preferences (user_id, marketing_consent) VALUES (?, ?)',
        )
        .bind(id, marketing),
      database
        .prepare(
          "INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'auth.registered', 'user', ?, ?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          id,
          JSON.stringify({
            documentVersion: 'launch-v1',
            marketingOptIn: Boolean(marketing),
          }),
        ),
    ]);
    return Response.json(
      { message: 'Аккаунт создан. Войдите с вашим email и паролем.' },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      'Registration failed',
      error instanceof Error ? error.message : 'unknown',
    );
    return Response.json(
      { message: 'Не удалось создать аккаунт. Попробуйте позже.' },
      { status: 500 },
    );
  }
}
