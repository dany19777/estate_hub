import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

const allowedFinishes = new Set(['Без отделки', 'Предчистовая', 'Чистовая', 'С ремонтом']);

function integer(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function decimal(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_UNITS');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Не найден профиль компании.' }, { status: 409 });
    const body = await request.json() as Record<string, unknown>;
    const complexId = typeof body.complexId === 'string' ? body.complexId : '';
    const buildingName = typeof body.buildingName === 'string' ? body.buildingName.trim() : '';
    const unitNumber = typeof body.unitNumber === 'string' ? body.unitNumber.trim() : '';
    const finish = typeof body.finish === 'string' ? body.finish : '';
    const totalFloors = integer(body.totalFloors);
    const floorNumber = integer(body.floorNumber);
    const rooms = integer(body.rooms);
    const areaSqm = decimal(body.areaSqm);
    const priceUzs = integer(body.priceUzs);
    const reserveEnabled = body.reserveEnabled === true ? 1 : 0;
    if (!complexId || buildingName.length < 1 || buildingName.length > 80 || unitNumber.length < 1 || unitNumber.length > 30 || !totalFloors || totalFloors < 1 || totalFloors > 100 || !floorNumber || floorNumber < 1 || floorNumber > totalFloors || !rooms || rooms < 1 || rooms > 10 || !areaSqm || areaSqm < 10 || areaSqm > 1000 || !priceUzs || priceUzs < 1_000_000 || !allowedFinishes.has(finish)) {
      return Response.json({ error: 'validation_failed', message: 'Проверьте корпус, этаж, номер, площадь, цену и отделку.' }, { status: 400 });
    }

    const database = await ensureMarketplaceDatabase();
    const complex = await database.prepare(`SELECT complex.id, complex.completion_status, workflow.status AS workflow_status
      FROM complexes complex
      JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
      WHERE complex.id = ? AND complex.developer_org_id = ? LIMIT 1`).bind(complexId, session.organization.id).first<{ id: string; completion_status: string; workflow_status: string }>();
    if (!complex) return Response.json({ error: 'not_found', message: 'ЖК не найден в вашей компании.' }, { status: 404 });
    if (['rejected', 'archived'].includes(complex.workflow_status)) return Response.json({ error: 'workflow_blocked', message: 'В этот ЖК нельзя добавлять квартиры в текущем статусе.' }, { status: 409 });

    let building = await database.prepare(`SELECT id, total_floors FROM buildings WHERE complex_id = ? AND name = ? LIMIT 1`).bind(complexId, buildingName).first<{ id: string; total_floors: number }>();
    if (building && building.total_floors !== totalFloors) return Response.json({ error: 'floor_mismatch', message: 'Для этого корпуса уже указано другое количество этажей.' }, { status: 409 });
    if (!building) {
      const buildingId = crypto.randomUUID();
      await database.prepare(`INSERT INTO buildings (id, complex_id, name, total_floors, completion_status) VALUES (?, ?, ?, ?, ?)`)
        .bind(buildingId, complexId, buildingName, totalFloors, complex.completion_status).run();
      building = { id: buildingId, total_floors: totalFloors };
    }

    let section = await database.prepare(`SELECT id FROM sections WHERE building_id = ? AND name = 'Секция 1' LIMIT 1`).bind(building.id).first<{ id: string }>();
    if (!section) {
      const sectionId = crypto.randomUUID();
      await database.prepare(`INSERT INTO sections (id, building_id, name) VALUES (?, ?, 'Секция 1')`).bind(sectionId, building.id).run();
      section = { id: sectionId };
    }
    let floor = await database.prepare(`SELECT id FROM floors WHERE section_id = ? AND floor_number = ? LIMIT 1`).bind(section.id, floorNumber).first<{ id: string }>();
    if (!floor) {
      const floorId = crypto.randomUUID();
      await database.prepare(`INSERT INTO floors (id, section_id, floor_number) VALUES (?, ?, ?)`).bind(floorId, section.id, floorNumber).run();
      floor = { id: floorId };
    }
    const duplicate = await database.prepare(`SELECT id FROM units WHERE building_id = ? AND unit_number = ? LIMIT 1`).bind(building.id, unitNumber).first<{ id: string }>();
    if (duplicate) return Response.json({ error: 'duplicate_unit', message: 'Квартира с таким номером уже есть в этом корпусе.' }, { status: 409 });

    const unitId = crypto.randomUUID();
    const listingId = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO units (
        id, complex_id, building_id, section_id, floor_id, unit_number, rooms, area_sqm,
        floor_number, total_floors, finish, availability_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`)
        .bind(unitId, complexId, building.id, section.id, floor.id, unitNumber, rooms, areaSqm, floorNumber, totalFloors, finish),
      database.prepare(`INSERT INTO listings (
        id, unit_id, complex_id, seller_org_id, market_type, seller_type, price_uzs, status, reserve_enabled
      ) VALUES (?, ?, ?, ?, 'PRIMARY_DEVELOPER', 'developer', ?, 'pending_moderation', ?)`)
        .bind(listingId, unitId, complexId, session.organization.id, priceUzs, reserveEnabled),
      database.prepare(`INSERT INTO listing_price_history (id, listing_id, old_price_uzs, new_price_uzs, reason, changed_by) VALUES (?, ?, NULL, ?, 'initial_submission', ?)`)
        .bind(crypto.randomUUID(), listingId, priceUzs, session.user.id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'unit.submitted', 'listing', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, listingId, JSON.stringify({ complexId, unitId, unitNumber, priceUzs })),
    ]);
    return Response.json({ unitId, listingId, status: 'pending_moderation', message: 'Квартира добавлена и отправлена на модерацию.' }, { status: 201 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to create developer unit', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось добавить квартиру.' }, { status: 500 });
  }
}
