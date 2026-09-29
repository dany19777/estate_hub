import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
const rows = [
  ['district-bogishamol', 'bogishamol', 'Боғишамол', 'Bog‘ishamol', 'Bogishamol'],
  ['district-registan', 'registan', 'Регистан', 'Registon', 'Registan'],
  ['district-siyob', 'siyob', 'Сиёб', 'Siyob', 'Siyob'],
  ['district-sattepo', 'sattepo', 'Саттепо', 'Sattepo', 'Sattepo'],
  ['district-center', 'center', 'Центр', 'Markaz', 'City Center'],
  ['district-konigil', 'konigil', 'Конигил', 'Konigil', 'Konigil'],
];
const plans = [
  ['plan-start', 'START', 'Start', 5, 1_500_000, 10],
  ['plan-business', 'BUSINESS', 'Business', 25, 4_500_000, 20],
  ['plan-pro', 'PRO', 'Pro', 100, 12_000_000, 30],
  ['plan-enterprise', 'ENTERPRISE', 'Enterprise', 1000, 0, 40],
];

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(`INSERT INTO regions (id, slug, name_ru, name_uz, name_en) VALUES ('region-samarkand', 'samarkand', 'Самаркандская область', 'Samarqand viloyati', 'Samarkand Region') ON CONFLICT DO NOTHING`);
  await client.query(`INSERT INTO cities (id, region_id, slug, name_ru, name_uz, name_en) VALUES ('city-samarkand', 'region-samarkand', 'samarkand', 'Самарканд', 'Samarqand', 'Samarkand') ON CONFLICT DO NOTHING`);
  for (const row of rows) await client.query(`INSERT INTO districts (id, city_id, slug, name_ru, name_uz, name_en) VALUES ($1, 'city-samarkand', $2, $3, $4, $5) ON CONFLICT DO NOTHING`, row);
  for (const row of plans) await client.query(`INSERT INTO subscription_plans (id, code, name, inventory_limit, monthly_price_uzs, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`, row);
  await client.query(`INSERT INTO platform_billing_config (id, secondary_listing_fee_uzs, secondary_period_days) VALUES ('default', 350000, 30) ON CONFLICT DO NOTHING`);
  await client.query('COMMIT');
  process.stdout.write('PostgreSQL reference data ready (no demo accounts or listings)\n');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
