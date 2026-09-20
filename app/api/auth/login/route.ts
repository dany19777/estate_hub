import {
  loginWithPassword,
  sameOrigin,
  sessionCookie,
} from '@/lib/password-auth';
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { message: 'Недопустимый источник запроса.' },
      { status: 403 },
    );
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 4096)
      return new Response(null, { status: 413 });
    const raw = await request.text();
    if (raw.length > 4096) return new Response(null, { status: 413 });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return Response.json(
        { message: 'Некорректный запрос.' },
        { status: 400 },
      );
    }
    if (
      !body ||
      typeof body.login !== 'string' ||
      typeof body.password !== 'string' ||
      body.login.length > 254 ||
      body.password.length < 1 ||
      body.password.length > 256
    )
      return Response.json(
        { message: 'Укажите логин и пароль.' },
        { status: 400 },
      );
    const result = await loginWithPassword(
      request,
      body.login.trim().toLowerCase(),
      body.password,
    );
    if (result.status !== 200)
      return Response.json(
        {
          message:
            result.status === 429
              ? 'Слишком много попыток. Попробуйте через 15 минут.'
              : 'Неверный логин или пароль.',
        },
        {
          status: result.status,
          headers: {
            'Cache-Control': 'no-store',
            ...(result.status === 429 ? { 'Retry-After': '900' } : {}),
          },
        },
      );
    return Response.json(
      { redirectTo: result.redirectTo },
      {
        headers: {
          'Set-Cookie': sessionCookie(request, result.token),
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error(
      'Password login unavailable',
      error instanceof Error ? error.message : 'unknown',
    );
    return Response.json(
      { message: 'Вход временно недоступен. Попробуйте ещё раз.' },
      { status: 503 },
    );
  }
}
