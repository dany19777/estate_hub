import type { Metadata } from 'next';

import { readListingDetail } from '@/lib/database';
import { formatPriceMillions } from '@/lib/marketplace';

type Props = Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await readListingDetail(id);
  if (!detail) return { title: 'Объявление недоступно | EstateHub', robots: { index: false, follow: false } };
  const { listing, complex } = detail;
  const title = `${listing.rooms}-комнатная квартира, ${listing.areaSqm} м² в ${complex.name} | EstateHub`;
  const description = `${complex.city}, ${complex.district}. Цена ${formatPriceMillions(listing.priceUzs)} сум. Смотрите характеристики, историю цены и связывайтесь с продавцом на EstateHub.`;
  return {
    title, description,
    alternates: { canonical: `/listing/${encodeURIComponent(id)}` },
    openGraph: { title, description, type: 'website', images: [{ url: detail.gallery[0] ?? complex.image, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [detail.gallery[0] ?? complex.image] },
  };
}

export default function ListingLayout({ children }: Props) { return children; }
