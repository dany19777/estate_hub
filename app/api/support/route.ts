import { ensureMarketplaceDatabase } from '@/lib/database';
import { sameOrigin } from '@/lib/password-auth';
import { consumeRateLimit } from '@/lib/rate-limit';
import { deliverSupportMail, supportMailConfigured } from '@/lib/support-mail';

export const dynamic = 'force-dynamic';

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sourceHash(request: Request) {
  const source =
    request.headers.get('CF-Connecting-IP') ||
    (new URL(request.url).hostname === 'localhost' ? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() : null) ||
    'unknown';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(source),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

async function requestHash(value: unknown) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function duplicateResponse(item: { id: string; delivery_status: string }) {
  return Response.json({ requestId: item.id, deliveryStatus: item.delivery_status, duplicate: true,
    message: item.delivery_status === 'sent' ? 'Вопрос уже передан службе поддержки.' : 'Вопрос уже сохранён в очереди поддержки.' },
  { status: item.delivery_status === 'sent' ? 200 : 202 });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json(
      { message: 'Недопустимый источник запроса.' },
      { status: 403 },
    );
  }

  try {
    if (Number(request.headers.get('content-length') ?? 0) > 8192) return new Response(null, { status: 413 });
    const raw = await request.text();
    if (raw.length > 8192) return new Response(null, { status: 413 });
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
      body = parsed as Record<string, unknown>;
    } catch {
      return Response.json({ error: 'validation_failed', message: 'Проверьте форму обращения.' }, { status: 400 });
    }
    const fullName = clean(body.fullName, 100);
    const email = clean(body.email, 200).toLowerCase();
    const subject = clean(body.subject, 140) || 'Вопрос с сайта EstateHub';
    const message = clean(body.message, 3000);
    const locale = ['ru', 'uz', 'en'].includes(String(body.locale))
      ? String(body.locale)
      : 'ru';

    if (fullName.length < 2 || !validEmail(email) || message.length < 10) {
      return Response.json(
        {
          error: 'validation_failed',
          message: 'Проверьте имя, email и текст вопроса.',
        },
        { status: 400 },
      );
    }

    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      return Response.json({ error: 'idempotency_required', message: 'Обновите страницу и повторите отправку.' }, { status: 400 });
    }

    const database = await ensureMarketplaceDatabase();
    const hash = await sourceHash(request);
    const fingerprint = await requestHash({ fullName, email, subject, message, locale });
    const existing = await database.prepare(`SELECT id, delivery_status, source_hash, request_hash FROM support_requests WHERE idempotency_key = ? LIMIT 1`)
      .bind(idempotencyKey).first<{ id: string; delivery_status: string; source_hash: string; request_hash: string | null }>();
    if (existing) {
      if (existing.source_hash !== hash || existing.request_hash !== fingerprint) return Response.json({ error: 'idempotency_conflict', message: 'Ключ запроса уже использован.' }, { status: 409 });
      return duplicateResponse(existing);
    }
    const limit = await consumeRateLimit(database, `support:${hash}`, 5, 3600);
    if (!limit.allowed) {
      return Response.json(
        {
          error: 'rate_limited',
          message: 'Слишком много обращений. Попробуйте через час.',
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      );
    }

    const id = crypto.randomUUID();
    const inserted = await database
      .prepare(
        `INSERT INTO support_requests
         (id, full_name, email, subject, message, locale, source_hash, idempotency_key, request_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      )
      .bind(id, fullName, email, subject, message, locale, hash, idempotencyKey, fingerprint)
      .run();
    if ((inserted.meta.changes ?? 0) === 0) {
      const concurrent = await database.prepare(`SELECT id, delivery_status, source_hash, request_hash FROM support_requests WHERE idempotency_key = ? LIMIT 1`)
        .bind(idempotencyKey).first<{ id: string; delivery_status: string; source_hash: string; request_hash: string | null }>();
      if (concurrent && concurrent.source_hash === hash && concurrent.request_hash === fingerprint) return duplicateResponse(concurrent);
      return Response.json({ error: 'idempotency_conflict', message: 'Ключ запроса уже использован.' }, { status: 409 });
    }

    if (!supportMailConfigured()) {
      return Response.json(
        {
          requestId: id,
          deliveryStatus: 'queued',
          message: 'Вопрос принят службой поддержки.',
        },
        { status: 202 },
      );
    }

    const delivery = await deliverSupportMail({ id, full_name: fullName, email, subject, message, locale });

    if (!delivery.ok) {
      await database
        .prepare(
          `UPDATE support_requests SET delivery_status = 'failed', delivery_provider = 'resend', delivery_error = ? WHERE id = ?`,
        )
        .bind(
          delivery.error ?? 'Email delivery failed',
          id,
        )
        .run();
      return Response.json(
        {
          requestId: id,
          deliveryStatus: 'failed',
          message: 'Вопрос сохранён, но письмо временно не отправлено.',
        },
        { status: 202 },
      );
    }

    await database
      .prepare(
        `UPDATE support_requests SET delivery_status = 'sent', delivery_provider = 'resend', delivery_reference = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .bind(delivery.reference, id)
      .run();
    return Response.json(
      {
        requestId: id,
        deliveryStatus: 'sent',
        message: 'Вопрос отправлен в службу поддержки.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to submit support request', error);
    return Response.json(
      {
        error: 'support_request_failed',
        message: 'Не удалось отправить вопрос. Попробуйте ещё раз.',
      },
      { status: 500 },
    );
  }
}
