import type { Metadata } from 'next';

import { readComplexDetail } from '@/lib/database';
import { formatPriceMillions } from '@/lib/marketplace';

type ComplexLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>;

export async function generateMetadata({ params }: ComplexLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await readComplexDetail(slug);
  if (!detail) return { title: 'Жилой комплекс не найден | EstateHub' };

  const { summary } = detail;
  const title = `${summary.name} — квартиры от ${formatPriceMillions(summary.priceFrom)} сум | EstateHub`;
  const description = `${summary.completionLabel}. ${summary.availableUnits} квартир в продаже в районе ${summary.district}: проверенные продавцы, история цены и запись на просмотр.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: summary.image, alt: `Жилой комплекс ${summary.name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [summary.image],
    },
  };
}

export default function ComplexLayout({ children }: ComplexLayoutProps) {
  return children;
}
