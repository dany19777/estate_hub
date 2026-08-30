export async function expirePromotions(database: D1Database) {
  await database.batch([
    database.prepare(`UPDATE promotions SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('scheduled', 'active') AND ends_at <= CURRENT_TIMESTAMP`),
    database.prepare(`UPDATE promotions SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'scheduled' AND starts_at <= CURRENT_TIMESTAMP AND ends_at > CURRENT_TIMESTAMP`),
  ]);
}
