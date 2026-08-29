import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  address: string;
  district: string;
  hero_image_url: string;
  workflow_status: string;
  units: number;
  available: number;
  listings: number;
};

type DistrictRow = { id: string; name: string };

const allowedCompletionStatuses = new Set(['completed', 'under_construction']);
const fallbackImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=88';

function failure(error: unknown, action: string) {
  const response = authorizationResponse(error);
  if (response) return response;
  console.error(action, error);
  return Response.json({ error: 'operation_failed', message: 'Операция временно недоступна.' }, { status: 500 });
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 54);
}

async function dashboardPayload(request: Request) {
  const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
  if (!session.organization) return { session, organization: null, projects: [], districts: [], kpis: { projects: 0, availableUnits: 0, publishedListings: 0 } };

  const database = await ensureMarketplaceDatabase();
  const [projectsResult, districtsResult] = await Promise.all([
    database.prepare(`SELECT
      complex.id, complex.slug, complex.name, complex.address, district.name_ru AS district,
      complex.hero_image_url, workflow.status AS workflow_status,
      COUNT(DISTINCT unit.id) AS units,
      COUNT(DISTINCT CASE WHEN unit.availability_status = 'available' THEN unit.id END) AS available,
      COUNT(DISTINCT CASE WHEN listing.status = 'published' THEN listing.id END) AS listings
      FROM complexes complex
      JOIN districts district ON district.id = complex.district_id
      JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
      LEFT JOIN units unit ON unit.complex_id = complex.id
      LEFT JOIN listings listing ON listing.complex_id = complex.id
      WHERE complex.developer_org_id = ?
      GROUP BY complex.id, complex.slug, complex.name, complex.address, district.name_ru, complex.hero_image_url, workflow.status
      ORDER BY complex.updated_at DESC, complex.name ASC`).bind(session.organization.id).all<ProjectRow>(),
    database.prepare(`SELECT district.id, district.name_ru AS name
      FROM districts district
      JOIN cities city ON city.id = district.city_id
      WHERE city.slug = 'samarkand'
      ORDER BY district.name_ru ASC`).all<DistrictRow>(),
  ]);
  const projects = projectsResult.results ?? [];
  return {
    session,
    organization: session.organization,
    projects,
    districts: districtsResult.results ?? [],
    kpis: {
      projects: projects.length,
      availableUnits: projects.reduce((total, project) => total + Number(project.available), 0),
      publishedListings: projects.reduce((total, project) => total + Number(project.listings), 0),
    },
  };
}

export async function GET(request: Request) {
  try {
    return Response.json(await dashboardPayload(request), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return failure(error, 'Failed to load developer dashboard');
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_COMPLEXES');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Сначала создайте профиль компании.' }, { status: 409 });
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const districtId = typeof body.districtId === 'string' ? body.districtId : '';
    const completionStatus = typeof body.completionStatus === 'string' ? body.completionStatus : '';
    const completionLabel = typeof body.completionLabel === 'string' ? body.completionLabel.trim() : '';
    if (name.length < 3 || name.length > 100 || address.length < 5 || address.length > 180 || !districtId || !allowedCompletionStatuses.has(completionStatus) || completionLabel.length < 3 || completionLabel.length > 80) {
      return Response.json({ error: 'validation_failed', message: 'Проверьте название, адрес, район и срок сдачи.' }, { status: 400 });
    }

    const database = await ensureMarketplaceDatabase();
    const district = await database.prepare(`SELECT id FROM districts WHERE id = ? LIMIT 1`).bind(districtId).first<{ id: string }>();
    if (!district) return Response.json({ error: 'district_not_found', message: 'Выбранный район не найден.' }, { status: 400 });

    const id = crypto.randomUUID();
    const baseSlug = slugify(name) || `complex-${id.slice(0, 8)}`;
    const existingSlug = await database.prepare(`SELECT id FROM complexes WHERE slug = ? LIMIT 1`).bind(baseSlug).first<{ id: string }>();
    const slug = existingSlug ? `${baseSlug}-${id.slice(0, 6)}` : baseSlug;
    const verificationId = crypto.randomUUID();
    const auditId = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO complexes (
        id, slug, district_id, developer_org_id, name, address, description, completion_status,
        completion_label, verification_status, hero_image_url, featured, rating, map_x, map_y
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, 0, 50, 50)`)
        .bind(id, slug, districtId, session.organization.id, name, address, `${name} — новый жилой комплекс. Описание будет добавлено застройщиком.`, completionStatus, completionLabel, fallbackImage),
      database.prepare(`INSERT INTO complex_publication_workflows (complex_id, status, submitted_at) VALUES (?, 'submitted', CURRENT_TIMESTAMP)`).bind(id),
      database.prepare(`INSERT INTO verification_cases (id, subject_type, subject_id, status, risk_level) VALUES (?, 'complex', ?, 'submitted', 'low')`).bind(verificationId, id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'complex.submitted', 'complex', ?, ?)`)
        .bind(auditId, session.user.id, id, JSON.stringify({ organizationId: session.organization.id, name })),
    ]);

    return Response.json({ id, slug, workflowStatus: 'submitted', message: 'ЖК создан и отправлен на проверку.' }, { status: 201 });
  } catch (error) {
    return failure(error, 'Failed to create complex');
  }
}
