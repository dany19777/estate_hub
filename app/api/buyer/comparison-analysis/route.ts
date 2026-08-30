import { authorizationResponse, getAppSession } from '@/lib/auth';
import { analyzeComparison, comparisonSelect, type ComparisonFact } from '@/lib/comparison-analysis';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(comparisonSelect).bind(session.user.id).all<ComparisonFact>();
    const items = result.results ?? [];
    if (items.length < 2) return Response.json({ error: 'comparison_required', message: 'Добавьте минимум две квартиры для AI-сравнения.' }, { status: 400 });
    return Response.json({ analysis: analyzeComparison(items) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'analysis_unavailable', message: 'Не удалось подготовить объяснение сравнения.' }, { status: 500 });
  }
}
