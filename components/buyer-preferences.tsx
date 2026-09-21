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
    'Сравнивайте реальные предложения, проверяйте историю цены и бронируйте квартиру онлайн до визита в офис продаж.':
      'Haqiqiy takliflarni solishtiring, narx tarixini tekshiring va savdo ofisiga borishdan oldin kvartirani onlayn band qiling.',
    'Проверенные продавцы': 'Tekshirilgan sotuvchilar',
    'Документы и права проходят проверку': 'Hujjatlar va huquqlar tekshiriladi',
    'Актуальная цена': 'Amaldagi narx',
    'История изменений без фиктивных скидок':
      'Soxta chegirmalarsiz narx tarixi',
    'Умный подбор': 'Aqlli tanlov',
    'AI превращает запрос в точные фильтры':
      'AI so‘rovni aniq filtrlarga aylantiradi',
    'Онлайн-бронирование': 'Onlayn band qilish',
    '5 минут на оплату и 72 часа резерва':
      'To‘lov uchun 5 daqiqa va 72 soatlik band',
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
    'млн сум': 'mln so‘m',
    сум: 'so‘m',
    квартир: 'kvartira',
    квартира: 'kvartira',
    этаж: 'qavat',
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
    'Сравнивайте реальные предложения, проверяйте историю цены и бронируйте квартиру онлайн до визита в офис продаж.':
      'Compare real listings, check price history and reserve an apartment online before visiting the sales office.',
    'Проверенные продавцы': 'Verified sellers',
    'Документы и права проходят проверку':
      'Documents and ownership rights are verified',
    'Актуальная цена': 'Current price',
    'История изменений без фиктивных скидок':
      'Price history without artificial discounts',
    'Умный подбор': 'Smart matching',
    'AI превращает запрос в точные фильтры':
      'AI turns your request into precise filters',
    'Онлайн-бронирование': 'Online reservation',
    '5 минут на оплату и 72 часа резерва':
      '5 minutes to pay and a 72-hour reservation',
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
    'млн сум': 'M UZS',
    сум: 'UZS',
    квартир: 'apartments',
    квартира: 'apartment',
    этаж: 'floor',
    район: 'district',
  },
} as const;

const languageTags: Record<BuyerLocale, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  en: 'en-US',
};

function translateText(value: string, locale: BuyerLocale) {
  if (locale === 'ru') return value;
  const dictionary = messages[locale] as Record<string, string>;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (dictionary[trimmed]) return value.replace(trimmed, dictionary[trimmed]);
  let translated = value;
  for (const [source, target] of Object.entries(dictionary).sort(
    ([first], [second]) => second.length - first.length,
  )) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    translated = translated.replace(
      new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu'),
      target,
    );
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
    /(\d[\d\s.,]*)(\s*млн(?:\s*сум)?|\s*сум)/gi,
    (_match, number: string, millions: string | undefined) => {
      const parsed = parseNumber(number);
      if (!Number.isFinite(parsed)) return _match;
      const uzs = parsed * (millions?.includes('млн') ? 1_000_000 : 1);
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
  const originalAttributes = useRef(
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
    const attributes = ['title', 'aria-label', 'placeholder'];

    const localizeText = (node: Text) => {
      if (
        node.parentElement?.closest(
          'script, style, textarea, [data-no-localize]',
        )
      )
        return;
      if (
        currency === 'USD' &&
        node.data.trim().toLowerCase() === 'сум' &&
        node.parentElement?.textContent?.includes('$')
      ) {
        originalText.set(node, node.data);
        node.data = node.data.replace(/сум/i, '');
        return;
      }
      const previous = originalText.get(node);
      const expected = previous
        ? translateText(
            convertPrices(previous, currency, usdUzs, locale),
            locale,
          )
        : null;
      if (previous && node.data === expected) return;
      if (!previous || node.data !== expected)
        originalText.set(node, node.data);
      const base = originalText.get(node) ?? node.data;
      const next = translateText(
        convertPrices(base, currency, usdUzs, locale),
        locale,
      );
      if (node.data !== next) node.data = next;
    };
    const localizeElement = (element: Element) => {
      let saved = originalAttributes.get(element);
      if (!saved) {
        saved = new Map();
        originalAttributes.set(element, saved);
      }
      for (const attribute of attributes) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        if (!saved.has(attribute)) saved.set(attribute, current);
        const base = saved.get(attribute)!;
        const next = translateText(
          convertPrices(base, currency, usdUzs, locale),
          locale,
        );
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
    return () => observer.disconnect();
  }, [currency, locale, originalAttributes, originalText, usdUzs]);

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
