export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    { published: process.env.LEGAL_DOCUMENTS_PUBLISHED === 'yes' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
