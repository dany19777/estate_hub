export const reviewCategories = [
  ['construction_quality', 'Качество строительства'],
  ['location', 'Расположение'],
  ['infrastructure', 'Инфраструктура'],
  ['yard', 'Двор и территория'],
  ['sound_insulation', 'Звукоизоляция'],
  ['management_service', 'Управление и сервис'],
] as const;

export type ReviewCategory = typeof reviewCategories[number][0];

export type ReviewRatings = Record<ReviewCategory, number>;

export type PublicReview = {
  id: string;
  author: string;
  body: string;
  status: string;
  trustLevel: 'standard' | 'verified_resident';
  createdAt: string;
  updatedAt: string;
  overall: number;
  ratings: ReviewRatings;
  response: { organization: string; body: string; updatedAt: string } | null;
};

export type ReviewsPayload = {
  reviews: PublicReview[];
  aggregate: { overall: number; total: number; categories: ReviewRatings };
  myReview: (PublicReview & { moderationReason: string | null }) | null;
};
