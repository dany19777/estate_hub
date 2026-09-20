import {
  AuthorizationError,
  authorizationResponse,
  requirePermission,
} from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type EntityType = 'organization' | 'complex' | 'listing';
type DirectoryAction = 'suspend' | 'restore' | 'archive' | 'pause' | 'resume';

type DirectoryMutation = {
  entityType: EntityType;
  entityId: string;
  action: DirectoryAction;
  reason: string | null;
};

type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  organization_type: 'developer' | 'agency';
  verification_status: string;
  verified_at: string | null;
  created_at: string;
  members_count: number;
  complexes_count: number;
  published_complexes: number;
  listings_count: number;
  published_listings: number;
};

type ComplexRow = {
  id: string;
  slug: string;
  name: string;
  address: string;
  developer_org_id: string;
  developer: string;
  developer_name: string;
  city: string;
  district: string;
  verification_status: string;
  workflow_status: string;
  completion_status: string;
  completion_label: string;
  units_count: number;
  available_units: number;
  listings_count: number;
  published_listings: number;
  min_price_uzs: number | null;
  max_price_uzs: number | null;
  created_at: string;
  updated_at: string;
};

type ListingRow = {
  id: string;
  unit_id: string;
  unit_number: string;
  complex_id: string;
  complex_name: string;
  complex_slug: string;
  seller_org_id: string | null;
  seller_name: string | null;
  market_type: string;
  seller_type: string;
  price_uzs: number;
  status: string;
  reserve_enabled: number;
  expires_at: string | null;
  published_at: string | null;
  rooms: number;
  area_sqm: number;
  floor_number: number;
  total_floors: number;
  availability_status: string;
  created_at: string;
  updated_at: string;
};

type CountRow = { count: number };

const allowedActions: Record<EntityType, ReadonlySet<DirectoryAction>> = {
  organization: new Set(['suspend', 'restore']),
  complex: new Set(['archive', 'restore']),
  listing: new Set(['pause', 'resume']),
};

const reasonRequiredActions = new Set<DirectoryAction>([
  'suspend',
  'archive',
  'pause',
]);
const entityIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function validationError(message: string) {
  return Response.json(
    { error: 'validation_failed', message },
    { status: 400 },
  );
}

async function applyAuditedTransition(
  database: D1Database,
  update: D1PreparedStatement,
  audit: D1PreparedStatement,
) {
  const result = await update.run();
  const changed = Number(result.meta.changes ?? 0);
  if (changed !== 1) return false;
  const auditResult = await audit.run();
  if (Number(auditResult.meta.changes ?? 0) !== 1)
    throw new Error('Status changed without an audit event');
  return true;
}

async function readMutation(
  request: Request,
): Promise<
  | { mutation: DirectoryMutation; error: null }
  | { mutation: null; error: Response }
> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return {
      mutation: null,
      error: validationError(
        'Тело запроса должно быть корректным JSON-объектом.',
      ),
    };
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      mutation: null,
      error: validationError('Тело запроса должно быть JSON-объектом.'),
    };
  }

  const body = input as Record<string, unknown>;
  const keys = Object.keys(body);
  if (
    keys.length < 3 ||
    keys.length > 4 ||
    !keys.includes('entityType') ||
    !keys.includes('entityId') ||
    !keys.includes('action') ||
    keys.some(
      (key) => !['entityType', 'entityId', 'action', 'reason'].includes(key),
    )
  ) {
    return {
      mutation: null,
      error: validationError(
        'Передайте entityType, entityId, action и, когда требуется, reason.',
      ),
    };
  }

  if (
    body.entityType !== 'organization' &&
    body.entityType !== 'complex' &&
    body.entityType !== 'listing'
  ) {
    return {
      mutation: null,
      error: validationError('Выберите допустимый тип сущности.'),
    };
  }
  const entityType = body.entityType;

  if (
    typeof body.entityId !== 'string' ||
    body.entityId !== body.entityId.trim() ||
    !entityIdPattern.test(body.entityId)
  ) {
    return {
      mutation: null,
      error: validationError('Укажите корректный идентификатор сущности.'),
    };
  }

  if (
    typeof body.action !== 'string' ||
    !allowedActions[entityType].has(body.action as DirectoryAction)
  ) {
    return {
      mutation: null,
      error: validationError('Это действие недоступно для выбранной сущности.'),
    };
  }
  const action = body.action as DirectoryAction;

  if (body.reason !== undefined && typeof body.reason !== 'string') {
    return {
      mutation: null,
      error: validationError('Причина изменения должна быть текстом.'),
    };
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > 500) {
    return {
      mutation: null,
      error: validationError(
        'Причина изменения не должна превышать 500 символов.',
      ),
    };
  }
  if (reasonRequiredActions.has(action) && reason.length < 3) {
    return {
      mutation: null,
      error: validationError(
        'Укажите причину изменения — не менее 3 символов.',
      ),
    };
  }

  return {
    mutation: {
      entityType,
      entityId: body.entityId,
      action,
      reason: reason || null,
    },
    error: null,
  };
}

async function directoryPayload(database: D1Database) {
  const [
    organizationResult,
    complexResult,
    listingResult,
    activeOrganizations,
    publishedComplexes,
    publishedListings,
  ] = await Promise.all([
    database
      .prepare(`WITH
      member_totals AS (
        SELECT organization_id, COUNT(*) AS members_count
        FROM organization_memberships
        WHERE status = 'active'
        GROUP BY organization_id
      ),
      complex_totals AS (
        SELECT complex.developer_org_id AS organization_id,
          COUNT(*) AS complexes_count,
          SUM(CASE WHEN workflow.status = 'published' THEN 1 ELSE 0 END) AS published_complexes
        FROM complexes complex
        LEFT JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
        GROUP BY complex.developer_org_id
      ),
      listing_totals AS (
        SELECT seller_org_id AS organization_id,
          COUNT(*) AS listings_count,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_listings
        FROM listings
        WHERE seller_org_id IS NOT NULL
        GROUP BY seller_org_id
      )
      SELECT organization.id, organization.slug, organization.name, organization.organization_type,
        organization.verification_status, organization.verified_at, organization.created_at,
        COALESCE(member_totals.members_count, 0) AS members_count,
        COALESCE(complex_totals.complexes_count, 0) AS complexes_count,
        COALESCE(complex_totals.published_complexes, 0) AS published_complexes,
        COALESCE(listing_totals.listings_count, 0) AS listings_count,
        COALESCE(listing_totals.published_listings, 0) AS published_listings
      FROM organizations organization
      LEFT JOIN member_totals ON member_totals.organization_id = organization.id
      LEFT JOIN complex_totals ON complex_totals.organization_id = organization.id
      LEFT JOIN listing_totals ON listing_totals.organization_id = organization.id
      ORDER BY organization.name COLLATE NOCASE ASC, organization.created_at DESC`)
      .all<OrganizationRow>(),
    database
      .prepare(`WITH
      unit_totals AS (
        SELECT complex_id, COUNT(*) AS units_count,
          SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) AS available_units
        FROM units
        GROUP BY complex_id
      ),
      listing_totals AS (
        SELECT complex_id, COUNT(*) AS listings_count,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_listings,
          MIN(price_uzs) AS min_price_uzs, MAX(price_uzs) AS max_price_uzs
        FROM listings
        GROUP BY complex_id
      )
      SELECT complex.id, complex.slug, complex.name, complex.address, complex.developer_org_id,
        organization.name AS developer, organization.name AS developer_name,
        city.name_ru AS city, district.name_ru AS district,
        complex.verification_status, COALESCE(workflow.status, 'draft') AS workflow_status,
        complex.completion_status, complex.completion_label,
        COALESCE(unit_totals.units_count, 0) AS units_count,
        COALESCE(unit_totals.available_units, 0) AS available_units,
        COALESCE(listing_totals.listings_count, 0) AS listings_count,
        COALESCE(listing_totals.published_listings, 0) AS published_listings,
        listing_totals.min_price_uzs, listing_totals.max_price_uzs,
        complex.created_at, complex.updated_at
      FROM complexes complex
      JOIN organizations organization ON organization.id = complex.developer_org_id
      JOIN districts district ON district.id = complex.district_id
      JOIN cities city ON city.id = district.city_id
      LEFT JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
      LEFT JOIN unit_totals ON unit_totals.complex_id = complex.id
      LEFT JOIN listing_totals ON listing_totals.complex_id = complex.id
      ORDER BY complex.created_at DESC, complex.name COLLATE NOCASE ASC`)
      .all<ComplexRow>(),
    database
      .prepare(`SELECT listing.id, listing.unit_id, unit.unit_number,
      listing.complex_id, complex.name AS complex_name, complex.slug AS complex_slug,
      listing.seller_org_id, COALESCE(seller_organization.name, seller_user.full_name) AS seller_name,
      listing.market_type, listing.seller_type, listing.price_uzs, listing.status,
      listing.reserve_enabled, listing.expires_at, listing.published_at,
      unit.rooms, unit.area_sqm, unit.floor_number, unit.total_floors, unit.availability_status,
      listing.created_at, listing.updated_at
      FROM listings listing
      JOIN units unit ON unit.id = listing.unit_id
      JOIN complexes complex ON complex.id = listing.complex_id
      LEFT JOIN organizations seller_organization ON seller_organization.id = listing.seller_org_id
      LEFT JOIN secondary_listing_owners secondary_owner ON secondary_owner.listing_id = listing.id
      LEFT JOIN users seller_user ON seller_user.id = secondary_owner.seller_user_id
      ORDER BY listing.created_at DESC, listing.id ASC`)
      .all<ListingRow>(),
    database
      .prepare(
        `SELECT COUNT(*) AS count FROM organizations WHERE verification_status = 'verified'`,
      )
      .first<CountRow>(),
    database
      .prepare(
        `SELECT COUNT(*) AS count FROM complex_publication_workflows WHERE status = 'published'`,
      )
      .first<CountRow>(),
    database
      .prepare(
        `SELECT COUNT(*) AS count FROM listings WHERE status = 'published'`,
      )
      .first<CountRow>(),
  ]);

  const organizations = organizationResult.results ?? [];
  const complexes = complexResult.results ?? [];
  const listings = listingResult.results ?? [];
  return {
    organizations,
    complexes,
    listings,
    stats: {
      organizations: organizations.length,
      verifiedOrganizations: Number(activeOrganizations?.count ?? 0),
      complexes: complexes.length,
      publishedComplexes: Number(publishedComplexes?.count ?? 0),
      listings: listings.length,
      publishedListings: Number(publishedListings?.count ?? 0),
    },
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    return Response.json(await directoryPayload(database), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load admin directory', error);
    return Response.json(
      {
        error: 'directory_unavailable',
        message: 'Не удалось загрузить справочник.',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_ADMIN');
    const parsed = await readMutation(request);
    if (parsed.error) return parsed.error;
    const { entityType, entityId, action, reason } = parsed.mutation;

    if (entityType === 'organization') {
      if (
        !session.platformRoles.some(
          (role) => role === 'SUPERADMIN' || role === 'PLATFORM_ADMIN',
        )
      ) {
        throw new AuthorizationError(
          403,
          'Приостанавливать и восстанавливать организации могут только SUPERADMIN или PLATFORM_ADMIN.',
        );
      }
    } else if (!session.permissions.includes('MODERATE_LISTINGS')) {
      throw new AuthorizationError(
        403,
        'У вас нет прав на модерацию ЖК и объявлений.',
      );
    }

    const database = await ensureMarketplaceDatabase();

    if (entityType === 'organization') {
      const organization = await database
        .prepare(
          `SELECT id, name, verification_status FROM organizations WHERE id = ? LIMIT 1`,
        )
        .bind(entityId)
        .first<{ id: string; name: string; verification_status: string }>();
      if (!organization)
        return Response.json(
          { error: 'not_found', message: 'Организация не найдена.' },
          { status: 404 },
        );

      const expectedStatus = action === 'suspend' ? 'verified' : 'suspended';
      const nextStatus = action === 'suspend' ? 'suspended' : 'verified';
      if (organization.verification_status !== expectedStatus) {
        const message =
          action === 'suspend'
            ? organization.verification_status === 'suspended'
              ? 'Организация уже приостановлена.'
              : 'Приостановить можно только проверенную организацию.'
            : 'Восстановить можно только приостановленную организацию.';
        return Response.json(
          { error: 'invalid_transition', message },
          { status: 409 },
        );
      }

      const changed = await applyAuditedTransition(
        database,
        database
          .prepare(
            `UPDATE organizations SET verification_status = ? WHERE id = ? AND verification_status = ?`,
          )
          .bind(nextStatus, entityId, expectedStatus),
        database
          .prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, ?, 'organization', ?, ?)`)
          .bind(
            crypto.randomUUID(),
            session.user.id,
            action === 'suspend'
              ? 'directory.organization_suspended'
              : 'directory.organization_restored',
            entityId,
            JSON.stringify({
              name: organization.name,
              before: expectedStatus,
              after: nextStatus,
              reason,
            }),
          ),
      );
      if (!changed)
        return Response.json(
          {
            error: 'status_changed',
            message: 'Статус организации уже изменился. Обновите справочник.',
          },
          { status: 409 },
        );

      return Response.json({
        entityType,
        entityId,
        status: nextStatus,
        message:
          action === 'suspend'
            ? 'Организация приостановлена.'
            : 'Организация восстановлена.',
      });
    }

    if (entityType === 'complex') {
      const complex = await database
        .prepare(`SELECT complex.id, complex.name,
        complex.verification_status, organization.verification_status AS organization_verification_status,
        workflow.status AS workflow_status
        FROM complexes complex
        JOIN organizations organization ON organization.id = complex.developer_org_id
        LEFT JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
        WHERE complex.id = ? LIMIT 1`)
        .bind(entityId)
        .first<{
          id: string;
          name: string;
          verification_status: string;
          organization_verification_status: string;
          workflow_status: string | null;
        }>();
      if (!complex)
        return Response.json(
          { error: 'not_found', message: 'Жилой комплекс не найден.' },
          { status: 404 },
        );
      if (!complex.workflow_status)
        return Response.json(
          {
            error: 'workflow_missing',
            message: 'Для ЖК не настроен процесс публикации.',
          },
          { status: 409 },
        );

      const expectedStatus = action === 'archive' ? 'published' : 'archived';
      const nextStatus = action === 'archive' ? 'archived' : 'published';
      if (complex.workflow_status !== expectedStatus) {
        const message =
          action === 'archive'
            ? complex.workflow_status === 'archived'
              ? 'ЖК уже находится в архиве.'
              : 'В архив можно отправить только опубликованный ЖК.'
            : 'Восстановить можно только ЖК из архива.';
        return Response.json(
          { error: 'invalid_transition', message },
          { status: 409 },
        );
      }
      if (
        action === 'restore' &&
        (complex.verification_status !== 'verified' ||
          complex.organization_verification_status !== 'verified')
      ) {
        return Response.json(
          {
            error: 'verification_required',
            message:
              'Для восстановления ЖК и организация-застройщик должны быть проверены.',
          },
          { status: 409 },
        );
      }

      const changed = await applyAuditedTransition(
        database,
        database
          .prepare(`UPDATE complex_publication_workflows SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE complex_id = ? AND status = ?`)
          .bind(nextStatus, entityId, expectedStatus),
        database
          .prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, ?, 'complex', ?, ?)`)
          .bind(
            crypto.randomUUID(),
            session.user.id,
            action === 'archive'
              ? 'directory.complex_archived'
              : 'directory.complex_restored',
            entityId,
            JSON.stringify({
              name: complex.name,
              before: expectedStatus,
              after: nextStatus,
              reason,
            }),
          ),
      );
      if (!changed)
        return Response.json(
          {
            error: 'status_changed',
            message: 'Статус ЖК уже изменился. Обновите справочник.',
          },
          { status: 409 },
        );

      return Response.json({
        entityType,
        entityId,
        status: nextStatus,
        message:
          action === 'archive'
            ? 'ЖК перемещён в архив.'
            : 'ЖК восстановлен в каталоге.',
      });
    }

    const listing = await database
      .prepare(`SELECT listing.id, listing.status, listing.market_type, listing.seller_org_id,
      complex.id AS complex_id, complex.name AS complex_name, workflow.status AS workflow_status,
      complex.verification_status AS complex_verification_status,
      seller_organization.verification_status AS seller_verification_status,
      secondary_owner.verification_status AS owner_verification_status,
      unit.availability_status
      FROM listings listing
      JOIN complexes complex ON complex.id = listing.complex_id
      JOIN units unit ON unit.id = listing.unit_id
      LEFT JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
      LEFT JOIN organizations seller_organization ON seller_organization.id = listing.seller_org_id
      LEFT JOIN secondary_listing_owners secondary_owner ON secondary_owner.listing_id = listing.id
      WHERE listing.id = ? LIMIT 1`)
      .bind(entityId)
      .first<{
        id: string;
        status: string;
        market_type: string;
        seller_org_id: string | null;
        complex_id: string;
        complex_name: string;
        workflow_status: string | null;
        complex_verification_status: string;
        seller_verification_status: string | null;
        owner_verification_status: string | null;
        availability_status: string;
      }>();
    if (!listing)
      return Response.json(
        { error: 'not_found', message: 'Объявление не найдено.' },
        { status: 404 },
      );

    const expectedStatus = action === 'pause' ? 'published' : 'paused';
    const nextStatus = action === 'pause' ? 'paused' : 'published';
    if (listing.status !== expectedStatus) {
      const message =
        action === 'pause'
          ? listing.status === 'paused'
            ? 'Объявление уже приостановлено.'
            : 'На паузу можно поставить только опубликованное объявление.'
          : 'Возобновить можно только приостановленное объявление.';
      return Response.json(
        { error: 'invalid_transition', message },
        { status: 409 },
      );
    }
    if (action === 'resume' && listing.workflow_status !== 'published') {
      return Response.json(
        {
          error: 'complex_unavailable',
          message: 'Сначала восстановите публикацию жилого комплекса.',
        },
        { status: 409 },
      );
    }
    if (
      action === 'resume' &&
      listing.complex_verification_status !== 'verified'
    ) {
      return Response.json(
        {
          error: 'complex_unverified',
          message: 'Нельзя возобновить объявление в непроверенном ЖК.',
        },
        { status: 409 },
      );
    }
    if (
      action === 'resume' &&
      listing.seller_org_id &&
      listing.seller_verification_status !== 'verified'
    ) {
      return Response.json(
        {
          error: 'seller_unverified',
          message: 'Нельзя возобновить объявление непроверенной организации.',
        },
        { status: 409 },
      );
    }
    if (action === 'resume' && listing.availability_status !== 'available') {
      return Response.json(
        {
          error: 'unit_unavailable',
          message: 'Квартира недоступна для возобновления объявления.',
        },
        { status: 409 },
      );
    }
    if (
      action === 'resume' &&
      ['SECONDARY_OWNER', 'SECONDARY_AGENCY'].includes(listing.market_type)
    ) {
      if (
        listing.market_type === 'SECONDARY_OWNER' &&
        listing.owner_verification_status !== 'approved'
      ) {
        return Response.json(
          {
            error: 'owner_unverified',
            message: 'Сначала подтвердите документы собственника.',
          },
          { status: 409 },
        );
      }
      const payment = await database
        .prepare(`SELECT id FROM secondary_listing_purchases
        WHERE listing_id = ? AND status = 'active' AND period_end > CURRENT_TIMESTAMP
        ORDER BY period_end DESC LIMIT 1`)
        .bind(entityId)
        .first<{ id: string }>();
      if (!payment)
        return Response.json(
          {
            error: 'payment_required',
            message:
              'Нельзя возобновить объявление: оплаченный период публикации истёк.',
          },
          { status: 409 },
        );
    }

    const changed = await applyAuditedTransition(
      database,
      database
        .prepare(
          `UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ?`,
        )
        .bind(nextStatus, entityId, expectedStatus),
      database
        .prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, ?, 'listing', ?, ?)`)
        .bind(
          crypto.randomUUID(),
          session.user.id,
          action === 'pause'
            ? 'directory.listing_paused'
            : 'directory.listing_resumed',
          entityId,
          JSON.stringify({
            complexId: listing.complex_id,
            complexName: listing.complex_name,
            before: expectedStatus,
            after: nextStatus,
            reason,
          }),
        ),
    );
    if (!changed)
      return Response.json(
        {
          error: 'status_changed',
          message: 'Статус объявления уже изменился. Обновите справочник.',
        },
        { status: 409 },
      );

    return Response.json({
      entityType,
      entityId,
      status: nextStatus,
      message:
        action === 'pause'
          ? 'Объявление поставлено на паузу.'
          : 'Объявление снова опубликовано.',
    });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update admin directory', error);
    return Response.json(
      {
        error: 'directory_update_failed',
        message: 'Не удалось изменить статус в справочнике.',
      },
      { status: 500 },
    );
  }
}
