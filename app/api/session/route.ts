import { authorizationResponse, getAppSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    return Response.json(await getAppSession(request), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'session_unavailable', message: 'Не удалось загрузить профиль.' }, { status: 500 });
  }
}
