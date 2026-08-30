export type ComparisonFact = {
  id: string; slug: string; complex_name: string; image: string; unit_number: string; rooms: number; area_sqm: number; floor_number: number; total_floors: number; finish: string; price_uzs: number; price_per_sqm: number; market_type: string; seller_type: string; seller_verification: string; listing_status: string; reserve_enabled: number; completion_status: string; completion_label: string; price_history_count: number;
};

export const comparisonSelect = `SELECT l.id, c.slug, c.name AS complex_name, c.hero_image_url AS image, u.unit_number, u.rooms, u.area_sqm, u.floor_number, u.total_floors, u.finish, l.price_uzs, ROUND(l.price_uzs / u.area_sqm) AS price_per_sqm, l.market_type, l.seller_type, COALESCE(o.verification_status, CASE WHEN l.status = 'published' THEN 'verified' ELSE 'pending' END) AS seller_verification, l.status AS listing_status, l.reserve_enabled, c.completion_status, c.completion_label, (SELECT COUNT(*) FROM listing_price_history history WHERE history.listing_id = l.id) AS price_history_count
  FROM buyer_comparisons comparison
  JOIN listings l ON l.id = comparison.listing_id
  JOIN units u ON u.id = l.unit_id
  JOIN complexes c ON c.id = l.complex_id
  LEFT JOIN organizations o ON o.id = l.seller_org_id
  WHERE comparison.user_id = ? ORDER BY comparison.created_at ASC`;

export type ComparisonAnalysis = {
  summary: string;
  insights: { id: string; title: string; text: string; listingIds: string[]; sourceFields: string[] }[];
  tradeoffs: { listingId: string; advantages: string[]; tradeoffs: string[]; missingData: string[]; sourceFields: string[] }[];
  guardrail: string;
};

export function analyzeComparison(items: ComparisonFact[]): ComparisonAnalysis {
  const cheapest = Math.min(...items.map((item) => item.price_uzs));
  const largest = Math.max(...items.map((item) => item.area_sqm));
  const lowestRate = Math.min(...items.map((item) => item.price_per_sqm));
  const insights = [
    { id: 'price', title: 'Ниже общая цена', field: 'price_uzs', matches: items.filter((item) => item.price_uzs === cheapest), format: (item: ComparisonFact) => `${item.complex_name}, № ${item.unit_number}: ${new Intl.NumberFormat('ru-RU').format(item.price_uzs)} сум.` },
    { id: 'area', title: 'Больше площадь', field: 'area_sqm', matches: items.filter((item) => item.area_sqm === largest), format: (item: ComparisonFact) => `${item.complex_name}, № ${item.unit_number}: ${item.area_sqm} м².` },
    { id: 'rate', title: 'Ниже цена за м²', field: 'price_per_sqm', matches: items.filter((item) => item.price_per_sqm === lowestRate), format: (item: ComparisonFact) => `${item.complex_name}, № ${item.unit_number}: ${new Intl.NumberFormat('ru-RU').format(item.price_per_sqm)} сум/м².` },
  ].map(({ id, title, field, matches, format }) => ({ id, title, text: matches.map(format).join(' '), listingIds: matches.map((item) => item.id), sourceFields: [field] }));
  return {
    summary: `Сравнили ${items.length} предложения по цене, площади, готовности и условиям бронирования. Итоговый выбор зависит от ваших приоритетов.`,
    insights,
    tradeoffs: items.map((item) => ({
      listingId: item.id,
      advantages: [item.price_uzs === cheapest ? 'Самая низкая общая цена' : '', item.area_sqm === largest ? 'Самая большая площадь' : '', item.price_per_sqm === lowestRate ? 'Самая низкая цена за м²' : '', item.completion_status === 'completed' ? 'ЖК сдан' : '', item.reserve_enabled ? 'Доступна онлайн-бронь' : ''].filter(Boolean),
      tradeoffs: [item.price_uzs === Math.max(...items.map((entry) => entry.price_uzs)) && item.price_uzs !== cheapest ? 'Выше общая цена' : '', item.area_sqm === Math.min(...items.map((entry) => entry.area_sqm)) && item.area_sqm !== largest ? 'Меньше площадь' : '', item.completion_status !== 'completed' ? 'ЖК ещё строится' : '', !item.reserve_enabled ? 'Онлайн-бронь недоступна' : ''].filter(Boolean),
      missingData: item.price_history_count < 2 ? ['Недостаточно истории для оценки динамики цены'] : [],
      sourceFields: ['price_uzs', 'area_sqm', 'completion_status', 'reserve_enabled', 'listing_price_history'],
    })),
    guardrail: 'AI не определяет «лучший» объект и не прогнозирует доходность. Выводы рассчитаны только по данным опубликованных объявлений.',
  };
}
