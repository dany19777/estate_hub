export const districts = [
  ['district-bogishamol', 'bogishamol', 'Боғишамол', 'Bog‘ishamol', 'Bogishamol'],
  ['district-registan', 'registan', 'Регистан', 'Registon', 'Registan'],
  ['district-siyob', 'siyob', 'Сиёб', 'Siyob', 'Siyob'],
  ['district-sattepo', 'sattepo', 'Саттепо', 'Sattepo', 'Sattepo'],
  ['district-center', 'center', 'Центр', 'Markaz', 'City Center'],
  ['district-konigil', 'konigil', 'Конигил', 'Konigil', 'Konigil'],
] as const;

export const organizations = [
  ['org-samarkand-development', 'samarkand-development', 'Samarkand Development', 'developer'],
  ['org-zarafshan-group', 'zarafshan-group', 'Zarafshan Group', 'developer'],
  ['org-orient-house', 'orient-house', 'Orient House', 'developer'],
  ['org-imorat-invest', 'imorat-invest', 'Imorat Invest', 'developer'],
  ['org-city-estate', 'city-estate', 'City Estate', 'developer'],
  ['org-silk-road-agency', 'silk-road-agency', 'Silk Road Agency', 'agency'],
] as const;

export const complexes = [
  {
    id: 'complex-bogishamol', slug: 'bogishamol', districtId: 'district-bogishamol', developerId: 'org-samarkand-development',
    name: 'Bog‘ishamol Residence', address: 'ул. Амир Темура, 142', description: 'Камерный жилой комплекс с закрытым двором, панорамными окнами и готовой инфраструктурой.',
    completionStatus: 'completed', completionLabel: 'Сдан в 2024', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=88', featured: 1, rating: 4.8, mapX: 54, mapY: 44, floors: 24,
  },
  {
    id: 'complex-registan', slug: 'registan-gardens', districtId: 'district-registan', developerId: 'org-zarafshan-group',
    name: 'Registan Gardens', address: 'ул. Регистан, 18', description: 'Современный квартал рядом с историческим центром и приватным зелёным двором.',
    completionStatus: 'under_construction', completionLabel: 'IV кв. 2026', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=88', featured: 0, rating: 4.7, mapX: 37, mapY: 55, floors: 18,
  },
  {
    id: 'complex-silk-road', slug: 'silk-road-avenue', districtId: 'district-siyob', developerId: 'org-orient-house',
    name: 'Silk Road Avenue', address: 'просп. Шёлкового пути, 27', description: 'Городской комплекс с семейными планировками и развитой инфраструктурой.',
    completionStatus: 'under_construction', completionLabel: 'II кв. 2027', image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=88', featured: 1, rating: 4.8, mapX: 68, mapY: 27, floors: 20,
  },
  {
    id: 'complex-afrasiyob', slug: 'afrasiyob-park', districtId: 'district-sattepo', developerId: 'org-imorat-invest',
    name: 'Afrasiyob Park', address: 'ул. Афросиаб, 84', description: 'Готовый семейный комплекс с просторными квартирами и благоустроенным парком.',
    completionStatus: 'completed', completionLabel: 'Сдан в 2023', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=88', featured: 0, rating: 4.6, mapX: 24, mapY: 34, floors: 16,
  },
  {
    id: 'complex-samarkand-city', slug: 'samarkand-city', districtId: 'district-center', developerId: 'org-city-estate',
    name: 'Samarkand City', address: 'ул. Университетская, 9', description: 'Многофункциональный городской квартал с сервисами, магазинами и прогулочными зонами.',
    completionStatus: 'under_construction', completionLabel: 'I кв. 2026', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=88', featured: 1, rating: 4.9, mapX: 47, mapY: 69, floors: 26,
  },
  {
    id: 'complex-zarafshan', slug: 'zarafshan-riverside', districtId: 'district-konigil', developerId: 'org-zarafshan-group',
    name: 'Zarafshan Riverside', address: 'Конигил, набережная Зарафшана', description: 'Тихий жилой комплекс у воды с готовыми предложениями вторичного рынка.',
    completionStatus: 'completed', completionLabel: 'Сдан в 2022', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=88', featured: 0, rating: 4.5, mapX: 78, mapY: 62, floors: 14,
  },
] as const;

export const units = [
  ['A-142', 'complex-bogishamol', 2, 72, 14, 'Чистовая', 685_000_000, 'PRIMARY_DEVELOPER', 'developer', 1],
  ['B-081', 'complex-bogishamol', 3, 91, 8, 'Предчистовая', 840_000_000, 'PRIMARY_DEVELOPER', 'developer', 1],
  ['A-097', 'complex-bogishamol', 2, 69, 9, 'С ремонтом', 730_000_000, 'SECONDARY_OWNER', 'owner', 0],
  ['R-204', 'complex-registan', 2, 82, 7, 'Предчистовая', 745_000_000, 'PRIMARY_DEVELOPER', 'developer', 1],
  ['R-315', 'complex-registan', 3, 106, 12, 'Чистовая', 980_000_000, 'PRIMARY_DEVELOPER', 'developer', 1],
  ['S-048', 'complex-silk-road', 1, 48, 4, 'Предчистовая', 540_000_000, 'PRIMARY_DEVELOPER', 'developer', 0],
  ['S-169', 'complex-silk-road', 2, 69, 11, 'С ремонтом', 690_000_000, 'SECONDARY_AGENCY', 'agency', 0],
  ['P-084', 'complex-afrasiyob', 2, 84, 5, 'Чистовая', 810_000_000, 'PRIMARY_DEVELOPER', 'developer', 1],
  ['P-133', 'complex-afrasiyob', 4, 133, 10, 'Чистовая', 1_350_000_000, 'PRIMARY_DEVELOPER', 'developer', 1],
  ['C-088', 'complex-samarkand-city', 2, 88, 16, 'Предчистовая', 930_000_000, 'PRIMARY_DEVELOPER', 'developer', 1],
  ['C-112', 'complex-samarkand-city', 3, 112, 20, 'С ремонтом', 1_200_000_000, 'SECONDARY_AGENCY', 'agency', 0],
  ['Z-052', 'complex-zarafshan', 1, 52, 3, 'С ремонтом', 575_000_000, 'SECONDARY_OWNER', 'owner', 0],
  ['Z-096', 'complex-zarafshan', 3, 96, 9, 'С ремонтом', 850_000_000, 'SECONDARY_OWNER', 'owner', 0],
] as const;
