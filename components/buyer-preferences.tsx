'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { buyerPageMessages } from '@/components/buyer-page-translations';

export type BuyerLocale = 'ru' | 'uz' | 'en';
export type BuyerCurrency = 'UZS' | 'USD';

const messages = {
  uz: {
    Купить: 'Sotib olish',
    Новостройки: 'Yangi uylar',
    'Вторичный рынок': 'Ikkilamchi bozor',
    'Продать квартиру': 'Kvartirani sotish',
    'Как это работает': 'Bu qanday ishlaydi',
    'Для застройщиков': 'Quruvchilar uchun',
    Избранное: 'Sevimlilar',
    Уведомления: 'Bildirishnomalar',
    'Личный кабинет': 'Shaxsiy kabinet',
    Войти: 'Kirish',
    Главная: 'Bosh sahifa',
    Поиск: 'Qidiruv',
    Сообщения: 'Xabarlar',
    Профиль: 'Profil',
    Каталог: 'Katalog',
    Карта: 'Xarita',
    Фильтры: 'Filtrlar',
    Цена: 'Narx',
    Комнаты: 'Xonalar',
    Все: 'Barchasi',
    Подробнее: 'Batafsil',
    Сравнить: 'Taqqoslash',
    'Онлайн-бронь': 'Onlayn band qilish',
    'Проверенный застройщик': 'Tekshirilgan quruvchi',
    Застройщик: 'Quruvchi',
    'Все предложения': 'Barcha takliflar',
    'Проверенные квартиры и застройщики':
      'Tekshirilgan kvartiralar va quruvchilar',
    'Сравнивайте реальные предложения, проверяйте историю цены и договаривайтесь о просмотре с продавцом.':
      'Haqiqiy takliflarni solishtiring, narx tarixini tekshiring va sotuvchi bilan ko‘rish vaqtini kelishing.',
    'Проверенные продавцы': 'Tekshirilgan sotuvchilar',
    'Документы и права проходят проверку': 'Hujjatlar va huquqlar tekshiriladi',
    'Актуальная цена': 'Amaldagi narx',
    'История изменений без фиктивных скидок':
      'Soxta chegirmalarsiz narx tarixi',
    'Умный подбор': 'Aqlli tanlov',
    'AI превращает запрос в точные фильтры':
      'AI so‘rovni aniq filtrlarga aylantiradi',
    'Связь с продавцом': 'Sotuvchi bilan bog‘lanish',
    'Заявка на просмотр и консультация без оплаты на сайте':
      'Saytda to‘lovsiz ko‘rish so‘rovi va maslahat',
    'Жилые комплексы для вашей жизни': 'Hayotingiz uchun turar joy majmualari',
    'Сначала выберите комплекс — внутри собраны все доступные квартиры от застройщиков, владельцев и агентств.':
      'Avval majmuani tanlang — unda quruvchilar, egalar va agentliklarning barcha mavjud kvartiralari jamlangan.',
    'Смотреть все комплексы': 'Barcha majmualarni ko‘rish',
    'Поиск по описанию': 'Tavsif bo‘yicha qidirish',
    'Язык интерфейса': 'Interfeys tili',
    Валюта: 'Valyuta',
    'Тип рынка': 'Bozor turi',
    Найти: 'Topish',
    'AI-поиск понимает обычный язык': 'AI qidiruvi oddiy tilni tushunadi',
    'Попробовать пример': 'Misolni sinab ko‘ring',
    'АКТУАЛЬНО В САМАРКАНДЕ': 'SAMARQANDDAGI DOLZARB TAKLIFLAR',
    'Вид результатов': 'Natijalar ko‘rinishi',
    'жилых комплексов': 'turar joy majmualari',
    'с актуальными предложениями в Самарканде':
      'Samarqanddagi dolzarb takliflar bilan',
    Открыть: 'Ochish',
    'Жилой комплекс': 'Turar joy majmuasi',
    проверен: 'tekshirilgan',
    Первичный: 'Birlamchi',
    'Оба рынка': 'Ikkala bozor',
    'Сдан в': 'Topshirilgan yil:',
    'Дом, который подходит': 'Sizga mos keladigan',
    'именно вам': 'uy',
    'Добавить в избранное': 'Sevimlilarga qo‘shish',
    'Удалить из избранного': 'Sevimlilardan o‘chirish',
    'Войти в аккаунт': 'Hisobga kirish',
    'Войдите, чтобы продолжить работу в своём кабинете.':
      'Kabinetda ishlashni davom ettirish uchun tizimga kiring.',
    'На главную': 'Bosh sahifaga',
    Логин: 'Login',
    Пароль: 'Parol',
    Выйти: 'Chiqish',
    'Проверяем доступ…': 'Kirish tekshirilmoqda…',
    'Открываем кабинет…': 'Kabinet ochilmoqda…',
    'Поиск сохранён': 'Qidiruv saqlandi',
    Сбросить: 'Tozalash',
    'Попробовать снова': 'Qayta urinib ko‘ring',
    'Например: двушка до 900 млн в сданном ЖК':
      'Masalan: topshirilgan majmuada 900 mln gacha ikki xonali kvartira',
    'Ищу двушку до 900 млн в сданном ЖК, не на первом этаже':
      'Topshirilgan majmuada 900 mln gacha, birinchi qavatda bo‘lmagan ikki xonali kvartira izlayapman',
    Самарканд: 'Samarqand',
    Регистан: 'Registon',
    Боғишамол: 'Bog‘ishamol',
    Центр: 'Markaz',
    Сиёб: 'Siyob',
    'кв.': 'chorak',
    от: 'dan boshlab',
    млн: 'mln',
    'Актуально в Самарканде': 'SAMARQANDDAGI DOLZARB TAKLIFLAR',
    'Эксклюзивная цена': 'Maxsus narx',
    Реклама: 'Reklama',
    'Выбор EstateHub': 'EstateHub tanlovi',
    'Курс Центрального банка': 'Markaziy bank kursi',
    'Поиск по каталогу': 'Katalog bo‘yicha qidirish',
    'ЖК, район или запрос на обычном языке':
      'Majmua, tuman yoki oddiy tildagi so‘rov',
    'AI-поиск готов': 'AI qidiruvi tayyor',
    'AI понял ваш запрос': 'AI so‘rovingizni tushundi',
    'Опишите квартиру обычным языком':
      'Kvartirani oddiy tilda tasvirlab bering',
    Состояние: 'Holati',
    Сдан: 'Topshirilgan',
    Строится: 'Qurilmoqda',
    Продавец: 'Sotuvchi',
    Владелец: 'Egasi',
    Агентство: 'Agentlik',
    'Город, район и ЖК': 'Shahar, tuman va majmua',
    Город: 'Shahar',
    Район: 'Tuman',
    'Все города': 'Barcha shaharlar',
    'Все районы': 'Barcha tumanlar',
    'Все жилые комплексы': 'Barcha turar joy majmualari',
    Отделка: 'Ta’mir',
    'Любая отделка': 'Istalgan ta’mir',
    'С ремонтом': 'Ta’mirlangan',
    Чистовая: 'Tayyor ta’mir',
    Предчистовая: 'Oq suvoq',
    'Площадь, м²': 'Maydon, m²',
    Этаж: 'Qavat',
    'Только проверенные': 'Faqat tekshirilganlar',
    'Спецпредложение EstateHub': 'EstateHub maxsus taklifi',
    'Сбросить фильтры': 'Filtrlarni tozalash',
    'Сохранить поиск': 'Qidiruvni saqlash',
    Сортировка: 'Saralash',
    'Сначала рекомендуемые': 'Avval tavsiya etilganlar',
    'Сначала дешевле': 'Avval arzonlari',
    'Сначала дороже': 'Avval qimmatlari',
    'По цене за м²': 'm² narxi bo‘yicha',
    'Сначала новые': 'Avval yangilari',
    'Сначала больше площадь': 'Avval maydoni kattalari',
    'Доступно онлайн-бронирование': 'Onlayn band qilish mavjud',
    комн: 'xona',
    Конигил: 'Konigil',
    Саттепо: 'Sattepo',
    'Все варианты покупки в одном каталоге':
      'Barcha xarid variantlari bitta katalogda',
    'Новостройки от проверенных застройщиков и квартиры собственников на вторичном рынке.':
      'Tekshirilgan quruvchilarning yangi uylari va ikkilamchi bozordagi mulkdor kvartiralari.',
    Раздел: 'Bo‘lim',
    Пример: 'Misol',
    'Проверяем актуальные объявления': 'Dolzarb e’lonlar tekshirilmoqda',
    'Применяем выбранные фильтры к опубликованным квартирам.':
      'Tanlangan filtrlar e’lon qilingan kvartiralarga qo‘llanmoqda.',
    'Минимальная цена': 'Minimal narx',
    'Максимальная цена': 'Maksimal narx',
    до: 'gacha',
    'Примеры раздела': 'Bo‘lim misollari',
    Разделы: 'Bo‘limlar',
    Недвижимость: 'Ko‘chmas mulk',
    'От поиска квартиры до связи с поддержкой':
      'Kvartira qidirishdan yordam xizmatigacha',
    'EstateHub помогает сравнить проверенные предложения, связаться с продавцом и получить помощь на каждом этапе.':
      'EstateHub tekshirilgan takliflarni solishtirish, sotuvchi bilan bog‘lanish va har bir bosqichda yordam olishga ko‘maklashadi.',
    'Найдите подходящий объект': 'Mos obyektni toping',
    'Используйте каталог, карту, фильтры и поиск обычным языком.':
      'Katalog, xarita, filtrlar va oddiy tildagi qidiruvdan foydalaning.',
    'Проверьте и сравните': 'Tekshiring va solishtiring',
    'Смотрите цены, документы, продавца и доступные квартиры.':
      'Narxlar, hujjatlar, sotuvchi va mavjud kvartiralarni ko‘ring.',
    'Свяжитесь с продавцом': 'Sotuvchi bilan bog‘laning',
    'Запишитесь на просмотр или задайте вопрос продавцу.':
      'Ko‘rishga yoziling yoki sotuvchiga savol bering.',
    'Поддержка EstateHub': 'EstateHub yordam xizmati',
    'Мы поможем разобраться': 'Biz sizga yordam beramiz',
    'Опишите вопрос — обращение сохранится в системе и автоматически поступит на почту службы поддержки.':
      'Savolingizni yozing — murojaat tizimda saqlanadi va yordam xizmatining pochtasiga avtomatik yuboriladi.',
    'Электронная почта': 'Elektron pochta',
    'Обычно отвечаем в течение рабочего дня':
      'Odatda bir ish kuni ichida javob beramiz',
    'Задать вопрос': 'Savol berish',
    'Напишите нам напрямую': 'Bizga bevosita yozing',
    'Ваше имя': 'Ismingiz',
    'Как к вам обращаться': 'Sizga qanday murojaat qilaylik',
    'Email для ответа': 'Javob uchun email',
    Тема: 'Mavzu',
    'Например: вопрос по бронированию': 'Masalan: band qilish bo‘yicha savol',
    'Ваш вопрос': 'Savolingiz',
    'Расскажите, с чем вам нужна помощь': 'Qanday yordam kerakligini yozing',
    'Отправляем…': 'Yuborilmoqda…',
    'Отправить вопрос': 'Savolni yuborish',
    'Нажимая кнопку, вы соглашаетесь на обработку данных для ответа на обращение.':
      'Tugmani bosib, murojaatga javob berish uchun ma’lumotlaringiz qayta ishlanishiga rozilik bildirasiz.',
    'Вопрос принят службой поддержки.':
      'Savol yordam xizmati tomonidan qabul qilindi.',
    'Вопрос отправлен в службу поддержки.': 'Savol yordam xizmatiga yuborildi.',
    'млн сум': 'mln so‘m',
    'млрд сум': 'mlrd so‘m',
    сум: 'so‘m',
    квартир: 'kvartira',
    квартиры: 'kvartira',
    квартира: 'kvartira',
    этаж: 'qavat',
    ...buyerPageMessages.uz,
    район: 'tuman',
  },
  en: {
    Купить: 'Buy',
    Новостройки: 'New builds',
    'Вторичный рынок': 'Resale',
    'Продать квартиру': 'Sell an apartment',
    'Как это работает': 'How it works',
    'Для застройщиков': 'For developers',
    Избранное: 'Favorites',
    Уведомления: 'Notifications',
    'Личный кабинет': 'Account',
    Войти: 'Sign in',
    Главная: 'Home',
    Поиск: 'Search',
    Сообщения: 'Messages',
    Профиль: 'Profile',
    Каталог: 'Catalog',
    Карта: 'Map',
    Фильтры: 'Filters',
    Цена: 'Price',
    Комнаты: 'Rooms',
    Все: 'All',
    Подробнее: 'Details',
    Сравнить: 'Compare',
    'Онлайн-бронь': 'Online reservation',
    'Проверенный застройщик': 'Verified developer',
    Застройщик: 'Developer',
    'Все предложения': 'All listings',
    'Проверенные квартиры и застройщики': 'Verified apartments and developers',
    'Сравнивайте реальные предложения, проверяйте историю цены и договаривайтесь о просмотре с продавцом.':
      'Compare real listings, check price history and arrange a viewing with the seller.',
    'Проверенные продавцы': 'Verified sellers',
    'Документы и права проходят проверку':
      'Documents and ownership rights are verified',
    'Актуальная цена': 'Current price',
    'История изменений без фиктивных скидок':
      'Price history without artificial discounts',
    'Умный подбор': 'Smart matching',
    'AI превращает запрос в точные фильтры':
      'AI turns your request into precise filters',
    'Связь с продавцом': 'Contact the seller',
    'Заявка на просмотр и консультация без оплаты на сайте':
      'Request a viewing or consultation without paying on the site',
    'Жилые комплексы для вашей жизни': 'Residential developments for your life',
    'Сначала выберите комплекс — внутри собраны все доступные квартиры от застройщиков, владельцев и агентств.':
      'Choose a development first to see all available apartments from developers, owners and agencies.',
    'Смотреть все комплексы': 'View all developments',
    'Поиск по описанию': 'Search by description',
    'Язык интерфейса': 'Interface language',
    Валюта: 'Currency',
    'Тип рынка': 'Market type',
    Найти: 'Search',
    'AI-поиск понимает обычный язык': 'AI search understands natural language',
    'Попробовать пример': 'Try an example',
    'АКТУАЛЬНО В САМАРКАНДЕ': 'CURRENT IN SAMARKAND',
    'Вид результатов': 'Results view',
    'жилых комплексов': 'residential developments',
    'с актуальными предложениями в Самарканде':
      'with current listings in Samarkand',
    Открыть: 'Open',
    'Жилой комплекс': 'Residential development',
    проверен: 'verified',
    Первичный: 'Primary',
    'Оба рынка': 'Both markets',
    'Сдан в': 'Completed in',
    'Дом, который подходит': 'A home made',
    'именно вам': 'for you',
    'Добавить в избранное': 'Add to favorites',
    'Удалить из избранного': 'Remove from favorites',
    'Войти в аккаунт': 'Sign in',
    'Войдите, чтобы продолжить работу в своём кабинете.':
      'Sign in to continue to your account.',
    'На главную': 'Back to home',
    Логин: 'Login',
    Пароль: 'Password',
    Выйти: 'Sign out',
    'Проверяем доступ…': 'Checking access…',
    'Открываем кабинет…': 'Opening your account…',
    'Поиск сохранён': 'Search saved',
    Сбросить: 'Reset',
    'Попробовать снова': 'Try again',
    'Например: двушка до 900 млн в сданном ЖК':
      'For example: a two-bedroom apartment under UZS 900M in a completed development',
    'Ищу двушку до 900 млн в сданном ЖК, не на первом этаже':
      'I am looking for a two-bedroom apartment under UZS 900M in a completed development, above the ground floor',
    Самарканд: 'Samarkand',
    Регистан: 'Registan',
    Боғишамол: 'Bogishamol',
    Центр: 'Central district',
    Сиёб: 'Siyob',
    'кв.': 'quarter',
    от: 'from',
    млн: 'M',
    'Актуально в Самарканде': 'CURRENT IN SAMARKAND',
    'Эксклюзивная цена': 'Exclusive price',
    Реклама: 'Sponsored',
    'Выбор EstateHub': 'EstateHub choice',
    'Курс Центрального банка': 'Central Bank rate',
    'Поиск по каталогу': 'Search catalog',
    'ЖК, район или запрос на обычном языке':
      'Development, district, or a natural-language request',
    'AI-поиск готов': 'AI search is ready',
    'AI понял ваш запрос': 'AI understood your request',
    'Опишите квартиру обычным языком':
      'Describe the apartment in natural language',
    Состояние: 'Status',
    Сдан: 'Completed',
    Строится: 'Under construction',
    Продавец: 'Seller',
    Владелец: 'Owner',
    Агентство: 'Agency',
    'Город, район и ЖК': 'City, district and development',
    Город: 'City',
    Район: 'District',
    'Все города': 'All cities',
    'Все районы': 'All districts',
    'Все жилые комплексы': 'All residential developments',
    Отделка: 'Finish',
    'Любая отделка': 'Any finish',
    'С ремонтом': 'Renovated',
    Чистовая: 'Finished',
    Предчистовая: 'Pre-finished',
    'Площадь, м²': 'Area, m²',
    Этаж: 'Floor',
    'Только проверенные': 'Verified only',
    'Спецпредложение EstateHub': 'EstateHub special offer',
    'Сбросить фильтры': 'Reset filters',
    'Сохранить поиск': 'Save search',
    Сортировка: 'Sort',
    'Сначала рекомендуемые': 'Recommended first',
    'Сначала дешевле': 'Lowest price first',
    'Сначала дороже': 'Highest price first',
    'По цене за м²': 'Price per m²',
    'Сначала новые': 'Newest first',
    'Сначала больше площадь': 'Largest area first',
    'Доступно онлайн-бронирование': 'Online reservation available',
    комн: 'rooms',
    Конигил: 'Konigil',
    Саттепо: 'Sattepo',
    'Все варианты покупки в одном каталоге':
      'Every buying option in one catalog',
    'Новостройки от проверенных застройщиков и квартиры собственников на вторичном рынке.':
      'New builds from verified developers and owner-listed resale apartments.',
    Раздел: 'Section',
    Пример: 'Example',
    'Проверяем актуальные объявления': 'Checking current listings',
    'Применяем выбранные фильтры к опубликованным квартирам.':
      'Applying your selected filters to published apartments.',
    'Минимальная цена': 'Minimum price',
    'Максимальная цена': 'Maximum price',
    до: 'to',
    'Примеры раздела': 'Section examples',
    Разделы: 'Sections',
    Недвижимость: 'Real estate',
    'От поиска квартиры до связи с поддержкой':
      'From finding a home to getting support',
    'EstateHub помогает сравнить проверенные предложения, связаться с продавцом и получить помощь на каждом этапе.':
      'EstateHub helps you compare verified listings, contact the seller and get assistance at every step.',
    'Найдите подходящий объект': 'Find the right property',
    'Используйте каталог, карту, фильтры и поиск обычным языком.':
      'Use the catalog, map, filters and natural-language search.',
    'Проверьте и сравните': 'Verify and compare',
    'Смотрите цены, документы, продавца и доступные квартиры.':
      'Review prices, documents, the seller and available apartments.',
    'Свяжитесь с продавцом': 'Contact the seller',
    'Запишитесь на просмотр или задайте вопрос продавцу.':
      'Schedule a viewing or ask the seller a question.',
    'Поддержка EstateHub': 'EstateHub support',
    'Мы поможем разобраться': 'We are here to help',
    'Опишите вопрос — обращение сохранится в системе и автоматически поступит на почту службы поддержки.':
      'Describe your question. It will be saved and automatically emailed to our support team.',
    'Электронная почта': 'Email',
    'Обычно отвечаем в течение рабочего дня':
      'We usually reply within one business day',
    'Задать вопрос': 'Ask a question',
    'Напишите нам напрямую': 'Message us directly',
    'Ваше имя': 'Your name',
    'Как к вам обращаться': 'How should we address you?',
    'Email для ответа': 'Reply email',
    Тема: 'Subject',
    'Например: вопрос по бронированию': 'For example: a reservation question',
    'Ваш вопрос': 'Your question',
    'Расскажите, с чем вам нужна помощь': 'Tell us how we can help',
    'Отправляем…': 'Sending…',
    'Отправить вопрос': 'Send question',
    'Нажимая кнопку, вы соглашаетесь на обработку данных для ответа на обращение.':
      'By submitting, you agree that we may process your data to respond to this request.',
    'Вопрос принят службой поддержки.':
      'Your question has been received by support.',
    'Вопрос отправлен в службу поддержки.':
      'Your question has been sent to support.',
    'млн сум': 'M UZS',
    'млрд сум': 'B UZS',
    сум: 'UZS',
    квартир: 'apartments',
    квартиры: 'apartments',
    квартира: 'apartment',
    этаж: 'floor',
    район: 'district',
    ...buyerPageMessages.en,
  },
} as const;

const languageTags: Record<BuyerLocale, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  en: 'en-US',
};

const compiledTranslations = Object.fromEntries(
  (['uz', 'en'] as const).map((locale) => {
    const dictionary = messages[locale] as Record<string, string>;
    const alternatives = Object.keys(dictionary)
      .sort((first, second) => second.length - first.length)
      .map((source) => source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    return [
      locale,
      {
        dictionary,
        regex: new RegExp(
          `(?<![\\p{L}\\p{N}])(${alternatives})(?![\\p{L}\\p{N}])`,
          'gu',
        ),
      },
    ];
  }),
) as Record<
  Exclude<BuyerLocale, 'ru'>,
  { dictionary: Record<string, string>; regex: RegExp }
>;

function translateText(value: string, locale: BuyerLocale) {
  if (locale === 'ru') return value;
  if (!/[А-Яа-яЁё]/.test(value)) return value;
  const { dictionary, regex } = compiledTranslations[locale];
  const trimmed = value.trim();
  if (!trimmed) return value;
  const complexTitle = trimmed.match(
    /^(.*?) — квартиры от (.+?)( \| EstateHub)$/,
  );
  if (complexTitle) {
    return locale === 'en'
      ? `${complexTitle[1]} — apartments from ${complexTitle[2]}${complexTitle[3]}`
      : `${complexTitle[1]} — narxi ${complexTitle[2]} dan boshlanadigan kvartiralar${complexTitle[3]}`;
  }
  const developmentCount = trimmed.match(/^(\d+) жилых комплексов$/);
  if (developmentCount) {
    return locale === 'en'
      ? `${developmentCount[1]} residential developments`
      : `${developmentCount[1]} ta turar joy majmuasi`;
  }
  const filterResultCount = trimmed.match(/^Показать (\d+) комплексов$/);
  if (filterResultCount) {
    return locale === 'en'
      ? `Show ${filterResultCount[1]} developments`
      : `${filterResultCount[1]} ta majmuani ko‘rsatish`;
  }
  const searchExample = trimmed.match(
    /^Например: двушка до (.+) в сданном ЖК$/,
  );
  if (searchExample) {
    return locale === 'en'
      ? `For example: a two-bedroom apartment under ${searchExample[1]} in a completed development`
      : `Masalan: topshirilgan majmuada ${searchExample[1]} gacha ikki xonali kvartira`;
  }
  const queryExample = trimmed.match(
    /^Ищу двушку до (.+) в сданном ЖК, не на первом этаже$/,
  );
  if (queryExample) {
    return locale === 'en'
      ? `I am looking for a two-bedroom apartment under ${queryExample[1]} in a completed development, above the ground floor`
      : `Topshirilgan majmuada ${queryExample[1]} gacha, birinchi qavatda bo‘lmagan ikki xonali kvartira izlayapman`;
  }
  if (dictionary[trimmed]) return value.replace(trimmed, dictionary[trimmed]);
  let translated = value.replace(regex, (source) => dictionary[source]);
  if (locale === 'en') {
    translated = translated
      .replace(/1\s+apartments/g, '1 apartment')
      .replace(/\b([IV]{1,3}) quarter (\d{4})\b/g, '$1 quarter, $2');
  }
  return translated;
}

function parseNumber(value: string) {
  const compact = value.replace(/\s/g, '');
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  return Number(normalized);
}

function convertPrices(
  value: string,
  currency: BuyerCurrency,
  usdUzs: number | null,
  locale: BuyerLocale,
) {
  if (currency !== 'USD' || !usdUzs) return value;
  return value.replace(
    /(\d[\d\s.,]*)(\s*(?:млн|млрд)(?:\s*сум)?|\s*сум)/gi,
    (_match, number: string, millions: string | undefined) => {
      const parsed = parseNumber(number);
      if (!Number.isFinite(parsed)) return _match;
      const uzs = parsed * (millions?.includes('млрд')
        ? 1_000_000_000
        : millions?.includes('млн')
          ? 1_000_000
          : 1);
      return new Intl.NumberFormat(languageTags[locale], {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(uzs / usdUzs);
    },
  );
}

type BuyerPreferences = {
  locale: BuyerLocale;
  currency: BuyerCurrency;
  usdUzs: number | null;
  rateDate: string | null;
  rateError: string;
  setLocale: (locale: BuyerLocale) => void;
  setCurrency: (currency: BuyerCurrency) => void;
  t: (value: string) => string;
  money: (uzs: number, compact?: boolean) => string;
};

const BuyerPreferencesContext = createContext<BuyerPreferences | null>(null);

export function BuyerPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<BuyerLocale>('ru');
  const [currency, setCurrencyState] = useState<BuyerCurrency>('UZS');
  const [usdUzs, setUsdUzs] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [rateError, setRateError] = useState('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showGlobalControls, setShowGlobalControls] = useState(false);
  const originalText = useRef(new WeakMap<Text, string>()).current;
  const renderedText = useRef(new WeakMap<Text, string>()).current;
  const originalAttributes = useRef(
    new WeakMap<Element, Map<string, string>>(),
  ).current;
  const renderedAttributes = useRef(
    new WeakMap<Element, Map<string, string>>(),
  ).current;

  useEffect(() => {
    const savedLocale = localStorage.getItem('estatehub.locale');
    const savedCurrency = localStorage.getItem('estatehub.currency');
    if (savedLocale === 'ru' || savedLocale === 'uz' || savedLocale === 'en')
      setLocaleState(savedLocale);
    if (savedCurrency === 'UZS' || savedCurrency === 'USD')
      setCurrencyState(savedCurrency);
    setShowGlobalControls(
      !['/admin', '/developer', '/seller'].some((path) =>
        window.location.pathname.startsWith(path),
      ),
    );
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    localStorage.setItem('estatehub.locale', locale);
    localStorage.setItem('estatehub.currency', currency);
  }, [currency, locale, preferencesLoaded]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/exchange-rate', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          usdUzs?: number;
          date?: string;
          message?: string;
        };
        if (!response.ok || !payload.usdUzs)
          throw new Error(payload.message || 'Exchange rate unavailable');
        setUsdUzs(payload.usdUzs);
        setRateDate(payload.date ?? null);
        setRateError('');
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setRateError('Курс ЦБ временно недоступен');
      });
    return () => controller.abort();
  }, []);

  const setLocale = useCallback((next: BuyerLocale) => {
    setLocaleState(next);
    localStorage.setItem('estatehub.locale', next);
  }, []);
  const setCurrency = useCallback((next: BuyerCurrency) => {
    setCurrencyState(next);
    localStorage.setItem('estatehub.currency', next);
  }, []);
  const t = useCallback(
    (value: string) => translateText(value, locale),
    [locale],
  );
  const money = useCallback(
    (uzs: number, compact = false) => {
      const value = currency === 'USD' && usdUzs ? uzs / usdUzs : uzs;
      return new Intl.NumberFormat(languageTags[locale], {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: currency === 'USD' ? 0 : compact ? 1 : 0,
      }).format(value);
    },
    [currency, locale, usdUzs],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    const attributes = ['title', 'aria-label', 'placeholder', 'alt'];

    const localizeText = (node: Text) => {
      if (
        node.parentElement?.closest(
          'script, style, textarea, [data-no-localize]',
        )
      )
        return;
      const previous = originalText.get(node);
      const lastRendered = renderedText.get(node);
      if (
        !previous ||
        (lastRendered !== undefined && node.data !== lastRendered)
      )
        originalText.set(node, node.data);
      const base = originalText.get(node) ?? node.data;
      const next =
        currency === 'USD' &&
        base.trim().toLowerCase() === 'сум' &&
        node.parentElement?.textContent?.includes('$')
          ? base.replace(/сум/i, '')
          : translateText(
              convertPrices(base, currency, usdUzs, locale),
              locale,
            );
      renderedText.set(node, next);
      if (node.data !== next) node.data = next;
    };
    const localizeElement = (element: Element) => {
      let saved = originalAttributes.get(element);
      let rendered = renderedAttributes.get(element);
      if (!saved) {
        saved = new Map();
        originalAttributes.set(element, saved);
      }
      if (!rendered) {
        rendered = new Map();
        renderedAttributes.set(element, rendered);
      }
      for (const attribute of attributes) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        const lastRendered = rendered.get(attribute);
        if (
          !saved.has(attribute) ||
          (lastRendered !== undefined && current !== lastRendered)
        )
          saved.set(attribute, current);
        const base = saved.get(attribute)!;
        const next = translateText(
          convertPrices(base, currency, usdUzs, locale),
          locale,
        );
        rendered.set(attribute, next);
        if (current !== next) element.setAttribute(attribute, next);
      }
    };
    const walk = (root: Node) => {
      if (root instanceof Text) localizeText(root);
      if (root instanceof Element) localizeElement(root);
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      );
      let node = walker.nextNode();
      while (node) {
        if (node instanceof Text) localizeText(node);
        else if (node instanceof Element) localizeElement(node);
        node = walker.nextNode();
      }
    };
    walk(document.head);
    walk(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData')
          localizeText(mutation.target as Text);
        mutation.addedNodes.forEach(walk);
      }
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    observer.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [
    currency,
    locale,
    originalAttributes,
    originalText,
    renderedAttributes,
    renderedText,
    usdUzs,
  ]);

  const value = useMemo(
    () => ({
      locale,
      currency,
      usdUzs,
      rateDate,
      rateError,
      setLocale,
      setCurrency,
      t,
      money,
    }),
    [
      currency,
      locale,
      money,
      rateDate,
      rateError,
      setCurrency,
      setLocale,
      t,
      usdUzs,
    ],
  );

  return (
    <BuyerPreferencesContext.Provider value={value}>
      {showGlobalControls && (
        <div
          className="global-buyer-preferences"
          aria-label="Настройки интерфейса"
        >
          <label>
            <span className="sr-only">Язык интерфейса</span>
            <select
              aria-label="Язык интерфейса"
              value={locale}
              onChange={(event) => setLocale(event.target.value as BuyerLocale)}
            >
              <option value="ru">RU</option>
              <option value="uz">UZ</option>
              <option value="en">EN</option>
            </select>
          </label>
          <label
            title={rateError || (rateDate ? `Курс ЦБ от ${rateDate}` : '')}
          >
            <span className="sr-only">Валюта</span>
            <select
              aria-label="Валюта"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as BuyerCurrency)
              }
            >
              <option value="UZS">UZS</option>
              <option value="USD" disabled={!rateDate}>
                USD
              </option>
            </select>
          </label>
        </div>
      )}
      {children}
    </BuyerPreferencesContext.Provider>
  );
}

export function useBuyerPreferences() {
  const context = useContext(BuyerPreferencesContext);
  if (!context) throw new Error('BuyerPreferencesProvider is missing');
  return context;
}
