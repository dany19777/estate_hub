export async function expireBillingPeriods(database: D1Database) {
  await database.batch([
    database.prepare(`UPDATE developer_subscriptions
      SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('trialing', 'active') AND current_period_end <= CURRENT_TIMESTAMP`),
    database.prepare(`UPDATE secondary_listing_purchases
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND period_end <= CURRENT_TIMESTAMP`),
    database.prepare(`UPDATE listings
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY')
        AND status = 'published'
        AND EXISTS (SELECT 1 FROM secondary_listing_purchases purchase WHERE purchase.listing_id = listings.id)
        AND NOT EXISTS (
          SELECT 1 FROM secondary_listing_purchases purchase
          WHERE purchase.listing_id = listings.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP
        )`),
  ]);
}

export function addDays(dateValue: string | Date, days: number) {
  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue.includes('T') ? dateValue : `${dateValue.replace(' ', 'T')}Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function databaseNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
