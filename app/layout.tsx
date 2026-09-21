import type { Metadata } from 'next';
import { BuyerPreferencesProvider } from '@/components/buyer-preferences';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      'https://estatehub-samarkand.daniyarovmuhammad39.chatgpt.site',
  ),
  title: 'EstateHub — квартиры в Самарканде',
  description:
    'Проверенные жилые комплексы, реальные цены и онлайн-бронирование квартир в Самарканде.',
  openGraph: {
    title: 'EstateHub — квартиры в Самарканде',
    description:
      'Проверенные жилые комплексы, реальные цены и онлайн-бронирование квартир в Самарканде.',
    images: [
      {
        url: '/og.png',
        width: 1731,
        height: 909,
        alt: 'EstateHub — квартиры в Самарканде',
      },
    ],
    locale: 'ru_UZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EstateHub — квартиры в Самарканде',
    description:
      'Проверенные жилые комплексы, реальные цены и онлайн-бронирование квартир в Самарканде.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <BuyerPreferencesProvider>{children}</BuyerPreferencesProvider>
      </body>
    </html>
  );
}
