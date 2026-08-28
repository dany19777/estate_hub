import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'EstateHub — квартиры в Самарканде',
  description: 'Проверенные жилые комплексы, реальные цены и онлайн-бронирование квартир в Самарканде.',
  openGraph: {
    title: 'EstateHub — квартиры в Самарканде',
    description: 'Проверенные жилые комплексы, реальные цены и онлайн-бронирование квартир в Самарканде.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'EstateHub — квартиры в Самарканде' }],
    locale: 'ru_UZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EstateHub — квартиры в Самарканде',
    description: 'Проверенные жилые комплексы, реальные цены и онлайн-бронирование квартир в Самарканде.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
