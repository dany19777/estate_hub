import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bog‘ishamol Residence — квартиры от 620 млн сум | EstateHub',
  description: 'Проверенные первичные и вторичные квартиры в Bog‘ishamol Residence, история цен и онлайн-бронирование.',
  openGraph: {
    title: 'Bog‘ishamol Residence — квартиры от 620 млн сум',
    description: '28 доступных квартир в сданном жилом комплексе в Самарканде.',
    images: [{
      url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=90',
      alt: 'Жилой комплекс Bog‘ishamol Residence',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bog‘ishamol Residence — квартиры от 620 млн сум',
    description: '28 доступных квартир в сданном жилом комплексе в Самарканде.',
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=90'],
  },
};

export default function ComplexLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
