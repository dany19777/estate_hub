import { logout, sameOrigin, sessionCookie } from '@/lib/password-auth';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  await logout(request);
  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': sessionCookie(request, '', 0),
        'Cache-Control': 'no-store',
      },
    },
  );
}
