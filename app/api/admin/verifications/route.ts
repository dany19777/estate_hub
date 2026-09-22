import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type VerificationRow = {
  id: string;
  subject_type: 'organization' | 'owner' | 'listing' | 'complex' | 'buyer';
  subject_id: string;
  applicant: string;
  organization_type: string | null;
  document_type: string | null;
  status: string;
  risk_level: string;
  created_at: string;
};

type CountRow = { count: number };

function failure(error: unknown, action: string) {
  const response = authorizationResponse(error);
  if (response) return response;
  console.error(action, error);
  return Response.json({ error: 'operation_failed', message: 'Операция временно недоступна.' }, { status: 500 });
}

async function queuePayload(request: Request) {
  const session = await requirePermission(request, 'VIEW_ADMIN');
  const database = await ensureMarketplaceDatabase();
  const [queueResult, users, activeComplexes, pendingVerifications, publishedListings] = await Promise.all([
    database.prepare(`SELECT * FROM (SELECT
      verification.id, verification.subject_type, verification.subject_id,
      COALESCE(organization.name, complex.name, seller.full_name, verification.subject_id) AS applicant,
      organization.organization_type, owner.document_type,
      verification.status, verification.risk_level, verification.created_at
      FROM verification_cases verification
      LEFT JOIN organizations organization ON verification.subject_type = 'organization' AND organization.id = verification.subject_id
      LEFT JOIN complexes complex ON verification.subject_type = 'complex' AND complex.id = verification.subject_id
      LEFT JOIN secondary_listing_owners owner ON verification.subject_type = 'listing' AND owner.listing_id = verification.subject_id
      LEFT JOIN users seller ON seller.id = owner.seller_user_id
      WHERE verification.status IN ('submitted', 'in_review')
      UNION ALL
      SELECT identity.id, 'buyer' AS subject_type, identity.user_id AS subject_id, user.full_name AS applicant,
        NULL AS organization_type, identity.document_type, identity.status, identity.risk_level, identity.submitted_at AS created_at
      FROM buyer_identity_verifications identity
      JOIN users user ON user.id = identity.user_id
      WHERE identity.status IN ('submitted', 'in_review')) queue
      ORDER BY CASE queue.risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, queue.created_at ASC`).all<VerificationRow>(),
    database.prepare(`SELECT COUNT(*) AS count FROM users WHERE status = 'active'`).first<CountRow>(),
    database.prepare(`SELECT COUNT(*) AS count FROM complex_publication_workflows WHERE status = 'published'`).first<CountRow>(),
    database.prepare(`SELECT (SELECT COUNT(*) FROM verification_cases WHERE status IN ('submitted', 'in_review')) +
      (SELECT COUNT(*) FROM buyer_identity_verifications WHERE status IN ('submitted', 'in_review')) AS count`).first<CountRow>(),
    database.prepare(`SELECT COUNT(*) AS count FROM listings WHERE status = 'published'`).first<CountRow>(),
  ]);
  return {
    session,
    queue: queueResult.results ?? [],
    stats: {
      users: users?.count ?? 0,
      activeComplexes: activeComplexes?.count ?? 0,
      pendingVerifications: pendingVerifications?.count ?? 0,
      publishedListings: publishedListings?.count ?? 0,
    },
  };
}

export async function GET(request: Request) {
  try {
    return Response.json(await queuePayload(request), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return failure(error, 'Failed to load verification queue');
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'REVIEW_VERIFICATION');
    const body = await request.json() as Record<string, unknown>;
    const caseId = typeof body.caseId === 'string' ? body.caseId : '';
    const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 250) : '';
    if (!caseId || !decision) return Response.json({ error: 'validation_failed', message: 'Не указано решение по заявке.' }, { status: 400 });

    const database = await ensureMarketplaceDatabase();
    let verification = await database.prepare(`SELECT id, subject_type, subject_id, status FROM verification_cases WHERE id = ? LIMIT 1`)
      .bind(caseId).first<{ id: string; subject_type: string; subject_id: string; status: string }>();
    if (!verification) verification = await database.prepare(`SELECT id, 'buyer' AS subject_type, user_id AS subject_id, status FROM buyer_identity_verifications WHERE id = ? LIMIT 1`)
      .bind(caseId).first<{ id: string; subject_type: string; subject_id: string; status: string }>();
    if (!verification) return Response.json({ error: 'not_found', message: 'Заявка не найдена.' }, { status: 404 });
    if (!['submitted', 'in_review'].includes(verification.status)) return Response.json({ error: 'already_reviewed', message: 'По этой заявке решение уже принято.' }, { status: 409 });
    if (['buyer', 'listing'].includes(verification.subject_type) && decision === 'reject' && reason.length < 3) return Response.json({ error: 'reason_required', message: 'Укажите причину отказа.' }, { status: 400 });

    if (verification.subject_type === 'listing') {
      const owner = await database.prepare(`SELECT owner.listing_id, listing.market_type
        FROM secondary_listing_owners owner JOIN listings listing ON listing.id = owner.listing_id
        WHERE owner.listing_id = ? AND listing.market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY') LIMIT 1`).bind(verification.subject_id).first<{ listing_id: string; market_type: string }>();
      if (!owner) return Response.json({ error: 'not_found', message: 'Данные продавца для объявления не найдены.' }, { status: 404 });
    }

    const status = decision === 'approve' ? 'approved' : 'rejected';
    const statements = [
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, `verification.${status}`, verification.subject_type === 'buyer' ? 'user' : verification.subject_type, verification.subject_id, JSON.stringify({ caseId, reason: reason || null })),
    ];
    if (verification.subject_type === 'buyer') {
      statements.push(database.prepare(`UPDATE buyer_identity_verifications SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
        verified_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(decision === 'approve' ? 'verified' : 'rejected', decision === 'reject' ? reason : null, session.user.id, decision === 'approve' ? 'verified' : 'rejected', caseId));
    } else {
      statements.push(database.prepare(`UPDATE verification_cases SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, session.user.id, caseId));
    }
    if (verification.subject_type === 'organization') {
      statements.push(database.prepare(`UPDATE organizations SET verification_status = ?, verified_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?`)
        .bind(decision === 'approve' ? 'verified' : 'rejected', decision === 'approve' ? 'verified' : 'rejected', verification.subject_id));
    }
    if (verification.subject_type === 'complex') {
      statements.push(
        database.prepare(`UPDATE complexes SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(decision === 'approve' ? 'verified' : 'rejected', verification.subject_id),
        database.prepare(`UPDATE complex_publication_workflows SET status = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE complex_id = ?`)
          .bind(decision === 'approve' ? 'pending_moderation' : 'rejected', verification.subject_id),
      );
    }
    if (verification.subject_type === 'listing') {
      const listingStatus = decision === 'reject' ? 'rejected' : 'published';
      statements.push(
        database.prepare(`UPDATE secondary_listing_owners SET verification_status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE listing_id = ?`)
          .bind(decision === 'approve' ? 'approved' : 'rejected', decision === 'reject' ? reason : null, verification.subject_id),
        database.prepare(`UPDATE listings SET status = ?, published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END,
          updated_at = CURRENT_TIMESTAMP WHERE id = ? AND market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY')`)
          .bind(listingStatus, listingStatus, verification.subject_id),
      );
    }
    await database.batch(statements);
    const nextStep = decision === 'approve' && verification.subject_type === 'complex' ? 'pending_moderation'
      : decision === 'approve' && verification.subject_type === 'listing' ? 'published' : null;
    return Response.json({ caseId, status, nextStep });
  } catch (error) {
    return failure(error, 'Failed to review verification');
  }
}
