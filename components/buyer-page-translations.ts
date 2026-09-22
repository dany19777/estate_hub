// Full phrases take precedence over individual-word substitutions. Keeping the
// two translations together makes omissions visible during review.
const phrases: Record<string, { uz: string; en: string }> = {
  'Пользователь EstateHub': {
    uz: 'EstateHub foydalanuvchisi',
    en: 'EstateHub user',
  },
  'Тестовый покупатель': { uz: 'Sinov xaridori', en: 'Test buyer' },
  Тестовый: { uz: 'Sinov foydalanuvchisi', en: 'Test user' },
  'Телефон подтверждён': { uz: 'Telefon tasdiqlangan', en: 'Phone verified' },
  'Проверяем телефон…': {
    uz: 'Telefon tekshirilmoqda…',
    en: 'Checking phone…',
  },
  Обзор: { uz: 'Umumiy ko‘rinish', en: 'Overview' },
  Избранное: { uz: 'Sevimlilar', en: 'Favorites' },
  Сравнения: { uz: 'Taqqoslashlar', en: 'Comparisons' },
  'Сохранённые поиски': { uz: 'Saqlangan qidiruvlar', en: 'Saved searches' },
  Рекомендации: { uz: 'Tavsiyalar', en: 'Recommendations' },
  'Мои просмотры': { uz: 'Ko‘rishlarim', en: 'My viewings' },
  Бронирования: { uz: 'Band qilishlar', en: 'Reservations' },
  'Мои обращения': { uz: 'Murojaatlarim', en: 'My inquiries' },
  'Недавно просмотрено': { uz: 'Yaqinda ko‘rilganlar', en: 'Recently viewed' },
  Споры: { uz: 'Nizolar', en: 'Disputes' },
  Сообщения: { uz: 'Xabarlar', en: 'Messages' },
  Уведомления: { uz: 'Bildirishnomalar', en: 'Notifications' },
  Подписки: { uz: 'Obunalar', en: 'Subscriptions' },
  'Профиль и безопасность': {
    uz: 'Profil va xavfsizlik',
    en: 'Profile and security',
  },
  'Разделы личного кабинета': {
    uz: 'Shaxsiy kabinet bo‘limlari',
    en: 'Account sections',
  },
  'Личный кабинет': { uz: 'Shaxsiy kabinet', en: 'My account' },
  'Добрый день,': { uz: 'Xayrli kun,', en: 'Hello,' },
  'Ваши объекты, встречи и бронирования — в одном месте.': {
    uz: 'Obyektlaringiz, uchrashuvlaringiz va bandlaringiz bir joyda.',
    en: 'Your properties, viewings and reservations in one place.',
  },
  'Настроить профиль': { uz: 'Profilni sozlash', en: 'Edit profile' },
  'в избранном': { uz: 'sevimlilarda', en: 'in favorites' },
  'записей на просмотр': {
    uz: 'ta ko‘rishga yozilish',
    en: 'viewings scheduled',
  },
  'активных броней': { uz: 'ta faol band', en: 'active reservations' },
  'диалогов с продавцами': {
    uz: 'ta sotuvchilar bilan suhbat',
    en: 'seller conversations',
  },
  'Активная бронь': { uz: 'Faol band', en: 'Active reservation' },
  'Активных броней нет': {
    uz: 'Faol bandlar yo‘q',
    en: 'No active reservations',
  },
  'Платное бронирование пока недоступно. Для просмотра квартиры оставьте заявку продавцу.':
    {
      uz: 'Pulli band qilish hozircha mavjud emas. Kvartirani ko‘rish uchun sotuvchiga so‘rov yuboring.',
      en: 'Paid reservations are not available yet. Contact the seller to arrange a viewing.',
    },
  'Выбрать квартиру': { uz: 'Kvartira tanlash', en: 'Choose an apartment' },
  'Сохранено для вас': { uz: 'Siz uchun saqlangan', en: 'Saved for you' },
  'Избранные объекты': { uz: 'Sevimli obyektlar', en: 'Favorite properties' },
  'В избранном пока нет объектов. Сохраняйте понравившиеся ЖК из каталога.': {
    uz: 'Sevimlilarda hali obyekt yo‘q. Katalogdan yoqqan turar joy majmualarini saqlang.',
    en: 'No favorites yet. Save developments you like from the catalog.',
  },
  'Смотреть каталог': { uz: 'Katalogni ko‘rish', en: 'View catalog' },
  'Ближайшие события': {
    uz: 'Yaqinlashayotgan tadbirlar',
    en: 'Upcoming events',
  },
  'Запишитесь на просмотр на странице ЖК — здесь появятся время и статус подтверждения.':
    {
      uz: 'Majmua sahifasida ko‘rishga yoziling — vaqt va tasdiqlash holati shu yerda ko‘rinadi.',
      en: 'Schedule a viewing on the development page; the time and confirmation status will appear here.',
    },
  'Ваша AI-подборка': { uz: 'Siz uchun AI tanlovi', en: 'Your AI selection' },
  'Проверенные предложения Самарканда': {
    uz: 'Samarqanddagi tekshirilgan takliflar',
    en: 'Verified listings in Samarkand',
  },
  'Ваши предпочтения': { uz: 'Afzalliklaringiz', en: 'Your preferences' },
  'Подтвердите личность заранее': {
    uz: 'Shaxsingizni oldindan tasdiqlang',
    en: 'Verify your identity early',
  },
  'Проверку личности можно пройти заранее.': {
    uz: 'Shaxsingizni oldindan tasdiqlashingiz mumkin.',
    en: 'You can verify your identity in advance.',
  },
  'Готовность профиля': { uz: 'Profil tayyorligi', en: 'Profile readiness' },
  'Пройти проверку': { uz: 'Tekshiruvdan o‘tish', en: 'Start verification' },
  'Личность подтверждена': {
    uz: 'Shaxs tasdiqlangan',
    en: 'Identity verified',
  },
  'Ваши данные подтверждены для обращения к продавцам.': {
    uz: 'Sotuvchilarga murojaat qilish uchun maʼlumotlaringiz tasdiqlandi.',
    en: 'Your details are verified for contacting sellers.',
  },
  Подтверждено: { uz: 'Tasdiqlangan', en: 'Verified' },
  'Нужны новые данные': {
    uz: 'Yangi ma’lumotlar kerak',
    en: 'New information needed',
  },
  'На проверке': { uz: 'Tekshiruvda', en: 'Under review' },
  'Базовый аккаунт': { uz: 'Asosiy hisob', en: 'Basic account' },
  'Проверенный покупатель': {
    uz: 'Tekshirilgan xaridor',
    en: 'Verified buyer',
  },
  'Проверяем ваши данные': {
    uz: 'Ma’lumotlaringiz tekshirilmoqda',
    en: 'Checking your details',
  },
  'Проверка не пройдена': {
    uz: 'Tekshiruvdan o‘tilmadi',
    en: 'Verification failed',
  },
  Телефон: { uz: 'Telefon', en: 'Phone' },
  'Подтвердите телефон': {
    uz: 'Telefonni tasdiqlang',
    en: 'Verify your phone',
  },
  'Подтвердите номер телефона': {
    uz: 'Telefon raqamingizni tasdiqlang',
    en: 'Verify your phone number',
  },
  'Подтвердить номер': { uz: 'Raqamni tasdiqlash', en: 'Verify number' },
  'Нужно подтвердить телефон': {
    uz: 'Telefonni tasdiqlash kerak',
    en: 'Phone verification required',
  },
  'Это требуется для избранного, сообщений, сравнений, просмотров и сохранённых поисков.':
    {
      uz: 'Bu sevimlilar, xabarlar, taqqoslashlar, ko‘rishlar va saqlangan qidiruvlar uchun kerak.',
      en: 'This is required for favorites, messages, comparisons, viewings and saved searches.',
    },
  'Мой кабинет': { uz: 'Mening kabinetim', en: 'My account' },
  'Кабинет компании': { uz: 'Kompaniya kabineti', en: 'Company dashboard' },
  'Панель администратора': {
    uz: 'Administrator paneli',
    en: 'Admin dashboard',
  },
  'Загружаем кабинет…': { uz: 'Kabinet yuklanmoqda…', en: 'Loading account…' },
  'Загружаем обращения…': {
    uz: 'Murojaatlar yuklanmoqda…',
    en: 'Loading inquiries…',
  },
  'Загружаем статус…': { uz: 'Holat yuklanmoqda…', en: 'Loading status…' },
  'Ищем предложения…': {
    uz: 'Takliflar qidirilmoqda…',
    en: 'Finding listings…',
  },
  'Обновляем по актуальному каталогу…': {
    uz: 'Joriy katalog bo‘yicha yangilanmoqda…',
    en: 'Updating from the current catalog…',
  },
  'Сопоставляем сохранённые критерии с актуальным каталогом…': {
    uz: 'Saqlangan mezonlar joriy katalog bilan solishtirilmoqda…',
    en: 'Matching saved criteria with the current catalog…',
  },
  'Откройте несколько ЖК или квартир — они появятся здесь автоматически.': {
    uz: 'Bir nechta majmua yoki kvartirani oching — ular bu yerda avtomatik paydo bo‘ladi.',
    en: 'Open a few developments or apartments and they will appear here automatically.',
  },
  'Последние открытые жилые комплексы и квартиры, сохранённые в вашем аккаунте.':
    {
      uz: 'Hisobingizda saqlangan yaqinda ochilgan majmualar va kvartiralar.',
      en: 'Recently opened developments and apartments saved to your account.',
    },
  'История выбора': { uz: 'Tanlov tarixi', en: 'Browsing history' },
  'История контактов': { uz: 'Muloqot tarixi', en: 'Contact history' },
  'История пока пуста': { uz: 'Tarix hozircha bo‘sh', en: 'No history yet' },
  'Откройте поиск — фильтры можно уточнить в каталоге.': {
    uz: 'Qidiruvni oching — filtrlarni katalogda aniqlashtirishingiz mumkin.',
    en: 'Open search to refine the filters in the catalog.',
  },
  'Сохраните текущие фильтры в каталоге, чтобы быстро вернуться к подборке.': {
    uz: 'Tanlovga tez qaytish uchun katalogdagi joriy filtrlarni saqlang.',
    en: 'Save your current catalog filters to return to your selection quickly.',
  },
  'Открыть рекомендации': {
    uz: 'Tavsiyalarni ochish',
    en: 'View recommendations',
  },
  'Рекомендации для вас': {
    uz: 'Siz uchun tavsiyalar',
    en: 'Recommended for you',
  },
  'Персональная подборка': {
    uz: 'Shaxsiy tanlov',
    en: 'Personalized selection',
  },
  'Причины показаны у каждого объекта': {
    uz: 'Har bir obyekt uchun sabablar ko‘rsatilgan',
    en: 'Reasons are shown for each property',
  },
  'Смотреть все комплексы': {
    uz: 'Barcha majmualarni ko‘rish',
    en: 'View all developments',
  },
  'Открыть каталог': { uz: 'Katalogni ochish', en: 'Open catalog' },
  'Открыть квартиру': { uz: 'Kvartirani ochish', en: 'Open apartment' },
  'Открыть комплекс': { uz: 'Majmuani ochish', en: 'Open development' },
  'Открыть страницу ЖК': {
    uz: 'Majmua sahifasini ochish',
    en: 'Open development page',
  },
  'Открыть сообщения': { uz: 'Xabarlarni ochish', en: 'Open messages' },
  'Открыть сравнение': { uz: 'Taqqoslashni ochish', en: 'Open comparison' },
  'Открыть ЖК': { uz: 'Majmuani ochish', en: 'Open development' },
  'Перейти в каталог': { uz: 'Katalogga o‘tish', en: 'Go to catalog' },
  'Сохранить поиск': { uz: 'Qidiruvni saqlash', en: 'Save search' },
  'Обращений пока нет': {
    uz: 'Hozircha murojaatlar yo‘q',
    en: 'No inquiries yet',
  },
  'Запросите консультацию или просмотр на странице квартиры — статус появится здесь.':
    {
      uz: 'Kvartira sahifasida maslahat yoki ko‘rishni so‘rang — holat shu yerda ko‘rinadi.',
      en: 'Request a consultation or viewing on the apartment page; its status will appear here.',
    },
  'Напишите продавцу со страницы квартиры — диалог сохранится здесь.': {
    uz: 'Kvartira sahifasidan sotuvchiga yozing — suhbat shu yerda saqlanadi.',
    en: 'Message the seller from an apartment page; the conversation will be saved here.',
  },
  'Сообщения продавцам': {
    uz: 'Sotuvchilarga xabarlar',
    en: 'Messages to sellers',
  },
  'Написать продавцу': { uz: 'Sotuvchiga yozish', en: 'Message seller' },
  'Написать менеджеру': { uz: 'Menejerga yozish', en: 'Message manager' },
  'Новое обращение': { uz: 'Yangi murojaat', en: 'New inquiry' },
  Обращение: { uz: 'Murojaat', en: 'Inquiry' },
  Консультация: { uz: 'Maslahat', en: 'Consultation' },
  Просмотр: { uz: 'Ko‘rish', en: 'Viewing' },
  'Просмотр назначен': { uz: 'Ko‘rish belgilangan', en: 'Viewing scheduled' },
  'Просмотр состоялся': { uz: 'Ko‘rish o‘tkazilgan', en: 'Viewing completed' },
  'Менеджер подтвердил встречу': {
    uz: 'Menejer uchrashuvni tasdiqladi',
    en: 'Manager confirmed the meeting',
  },
  'Требуется согласовать новое время': {
    uz: 'Yangi vaqtni kelishish kerak',
    en: 'A new time must be arranged',
  },
  'Ждёт звонка': { uz: 'Qo‘ng‘iroq kutilmoqda', en: 'Awaiting call' },
  Связались: { uz: 'Bog‘lanildi', en: 'Contacted' },
  Подбор: { uz: 'Tanlash', en: 'Selection' },
  'Сделка в работе': { uz: 'Bitim jarayonda', en: 'Deal in progress' },
  Закрыто: { uz: 'Yopilgan', en: 'Closed' },
  Новое: { uz: 'Yangi', en: 'New' },
  Завершено: { uz: 'Yakunlangan', en: 'Completed' },
  Ожидает: { uz: 'Kutilmoqda', en: 'Pending' },
  'Источник:': { uz: 'Manba:', en: 'Source:' },
  Обновлено: { uz: 'Yangilangan', en: 'Updated' },
  Обновлена: { uz: 'Yangilangan', en: 'Updated' },
  'Споры по бронированиям': {
    uz: 'Bandlar bo‘yicha nizolar',
    en: 'Reservation disputes',
  },
  'Если застройщик не соблюдает условия оплаченной брони, откройте спор из карточки бронирования.':
    {
      uz: 'Quruvchi to‘langan band shartlariga amal qilmasa, band kartasidan nizo oching.',
      en: 'If the developer does not honor a paid reservation, open a dispute from its reservation card.',
    },
  'Спор рассматривается': {
    uz: 'Nizo ko‘rib chiqilmoqda',
    en: 'Dispute under review',
  },
  'Спор закрыт без возврата': {
    uz: 'Nizo qaytarimsiz yopilgan',
    en: 'Dispute closed without refund',
  },
  'Полный возврат одобрен': {
    uz: 'To‘liq qaytarim tasdiqlangan',
    en: 'Full refund approved',
  },
  'Финансовый специалист рассматривает спор': {
    uz: 'Moliya mutaxassisi nizoni ko‘rib chiqmoqda',
    en: 'A finance specialist is reviewing the dispute',
  },
  'Решение специалиста появится здесь. Обычно это занимает до одного рабочего дня.':
    {
      uz: 'Mutaxassis qarori shu yerda chiqadi. Odatda bu bir ish kunigacha davom etadi.',
      en: 'The specialist’s decision will appear here. This usually takes up to one business day.',
    },
  'Нет доступа к этому кабинету': {
    uz: 'Bu kabinetga kirish huquqi yo‘q',
    en: 'No access to this dashboard',
  },
  'Этот раздел доступен только застройщикам': {
    uz: 'Bu bo‘lim faqat quruvchilar uchun',
    en: 'This section is for developers only',
  },
  'Сейчас вы вошли как': {
    uz: 'Hozir siz quyidagi hisob bilan kirdingiz:',
    en: 'You are signed in as',
  },
  '. Если вы застройщик, выйдите из этого профиля и войдите с логином и паролем застройщика.':
    {
      uz: '. Agar quruvchi bo‘lsangiz, bu hisobdan chiqing va quruvchi login-paroli bilan kiring.',
      en: '. If you are a developer, sign out and sign in with your developer credentials.',
    },
  'Выйти и войти как застройщик': {
    uz: 'Chiqish va quruvchi sifatida kirish',
    en: 'Sign out and sign in as a developer',
  },
  'Вернуться в мой кабинет': {
    uz: 'Kabinetimga qaytish',
    en: 'Return to my account',
  },
  'Ещё нет аккаунта застройщика?': {
    uz: 'Hali quruvchi hisobingiz yo‘qmi?',
    en: 'No developer account yet?',
  },
  'Оставьте заявку на регистрацию через форму поддержки — мы поможем подключить вашу компанию.':
    {
      uz: 'Yordam shakli orqali ro‘yxatdan o‘tish uchun ariza yuboring — kompaniyangizni ulashda yordam beramiz.',
      en: 'Request registration through the support form and we will help connect your company.',
    },
  'Оставить заявку на регистрацию →': {
    uz: 'Ro‘yxatdan o‘tish uchun ariza yuborish →',
    en: 'Request registration →',
  },
  'На главную EstateHub': {
    uz: 'EstateHub bosh sahifasiga',
    en: 'Go to EstateHub home',
  },
  'Войдите в аккаунт.': {
    uz: 'Hisobingizga kiring.',
    en: 'Sign in to your account.',
  },
  'Перейти ко входу': { uz: 'Kirish sahifasiga o‘tish', en: 'Go to sign in' },
  'Вы вошли как': {
    uz: 'Siz quyidagi hisob bilan kirdingiz:',
    en: 'Signed in as',
  },
  'Вход в аккаунт': { uz: 'Hisobga kirish', en: 'Sign in to your account' },
  'Входим…': { uz: 'Kirilmoqda…', en: 'Signing in…' },
  'Не удалось войти.': {
    uz: 'Kirish amalga oshmadi.',
    en: 'Could not sign in.',
  },
  'Не удалось связаться с сервером.': {
    uz: 'Serverga ulanib bo‘lmadi.',
    en: 'Could not connect to the server.',
  },
  'Сервер не определил кабинет.': {
    uz: 'Server kabinetni aniqlay olmadi.',
    en: 'The server could not determine your dashboard.',
  },
};

Object.assign(phrases, {
  'Загружаем жилой комплекс': {
    uz: 'Turar joy majmuasi yuklanmoqda',
    en: 'Loading development',
  },
  'Проверяем квартиры, цены и продавцов.': {
    uz: 'Kvartiralar, narxlar va sotuvchilar tekshirilmoqda.',
    en: 'Checking apartments, prices and sellers.',
  },
  'Жилой комплекс недоступен': {
    uz: 'Turar joy majmuasi mavjud emas',
    en: 'Development unavailable',
  },
  'Объект не найден.': { uz: 'Obyekt topilmadi.', en: 'Property not found.' },
  'Вернуться в каталог': { uz: 'Katalogga qaytish', en: 'Return to catalog' },
  'Вернуться к поиску': { uz: 'Qidiruvga qaytish', en: 'Back to search' },
  'Показать на карте': { uz: 'Xaritada ko‘rsatish', en: 'Show on map' },
  Поделиться: { uz: 'Ulashish', en: 'Share' },
  'В избранное': { uz: 'Sevimlilarga qo‘shish', en: 'Add to favorites' },
  'В избранном': { uz: 'Sevimlilarda', en: 'In favorites' },
  Следить: { uz: 'Kuzatish', en: 'Follow' },
  'Следующее фото ·': { uz: 'Keyingi surat ·', en: 'Next photo ·' },
  'О жилом комплексе': {
    uz: 'Turar joy majmuasi haqida',
    en: 'About the development',
  },
  'Главное о проекте': {
    uz: 'Loyiha haqida asosiy ma’lumotlar',
    en: 'Project highlights',
  },
  'Состав проекта': { uz: 'Loyiha tarkibi', en: 'Project buildings' },
  'Корпуса и сроки сдачи': {
    uz: 'Binolar va topshirish muddatlari',
    en: 'Buildings and completion dates',
  },
  'Данные застройщика и реестра предложений': {
    uz: 'Quruvchi va takliflar reyestri ma’lumotlari',
    en: 'Developer and listing register data',
  },
  Корпус: { uz: 'Bino', en: 'Building' },
  'этажей максимум': { uz: 'qavatgacha', en: 'floors maximum' },
  этажей: { uz: 'qavat', en: 'floors' },
  'этажей ·': { uz: 'qavat ·', en: 'floors ·' },
  секция: { uz: 'seksiya', en: 'section' },
  'Предложений сейчас нет': {
    uz: 'Hozircha takliflar yo‘q',
    en: 'No listings available yet',
  },
  Расположение: { uz: 'Joylashuv', en: 'Location' },
  'Метка показывает точное положение жилого комплекса. Масштаб карты можно менять.':
    {
      uz: 'Belgi majmuaning aniq manzilini ko‘rsatadi. Xarita masshtabini o‘zgartirishingiz mumkin.',
      en: 'The marker shows the development’s exact location. You can zoom the map.',
    },
  'На территории': { uz: 'Hududda', en: 'On-site' },
  Удобства: { uz: 'Qulayliklar', en: 'Amenities' },
  'Рядом с домом': { uz: 'Uy yaqinida', en: 'Nearby' },
  Инфраструктура: { uz: 'Infratuzilma', en: 'Infrastructure' },
  'Юридическая прозрачность': {
    uz: 'Huquqiy shaffoflik',
    en: 'Legal transparency',
  },
  'Документы проекта': { uz: 'Loyiha hujjatlari', en: 'Project documents' },
  'Копия доступна по запросу': {
    uz: 'Nusxasi so‘rov bo‘yicha beriladi',
    en: 'Copy available on request',
  },
  Проверено: { uz: 'Tekshirilgan', en: 'Verified' },
  'Проверенный ЖК': {
    uz: 'Tekshirilgan turar joy majmuasi',
    en: 'Verified development',
  },
  'Доступные предложения': { uz: 'Mavjud takliflar', en: 'Available listings' },
  'Квартиры в': { uz: 'Kvartiralar:', en: 'Apartments in' },
  'предложений подходят под условия': {
    uz: 'ta taklif shartlarga mos',
    en: 'listings match the criteria',
  },
  'Фильтры квартир': { uz: 'Kvartira filtrlari', en: 'Apartment filters' },
  'Уточнить выбор': { uz: 'Tanlovni aniqlashtirish', en: 'Refine selection' },
  Первичный: { uz: 'Birlamchi', en: 'New build' },
  Вторичный: { uz: 'Ikkilamchi', en: 'Resale' },
  Любой: { uz: 'Istalgan', en: 'Any' },
  Любое: { uz: 'Istalgan', en: 'Any' },
  Комнат: { uz: 'Xonalar soni', en: 'Rooms' },
  'Минимальная площадь': { uz: 'Eng kichik maydon', en: 'Minimum area' },
  'Максимальная площадь': { uz: 'Eng katta maydon', en: 'Maximum area' },
  'Минимальный этаж': { uz: 'Eng past qavat', en: 'Minimum floor' },
  'Максимальный этаж': { uz: 'Eng yuqori qavat', en: 'Maximum floor' },
  'Только проверенные продавцы': {
    uz: 'Faqat tekshirilgan sotuvchilar',
    en: 'Verified sellers only',
  },
  'Нет первичных квартир': {
    uz: 'Birlamchi kvartiralar yo‘q',
    en: 'No new-build apartments',
  },
  'Нет квартир по этим условиям': {
    uz: 'Bu shartlarga mos kvartiralar yo‘q',
    en: 'No apartments match these criteria',
  },
  'Измените диапазон или сбросьте фильтры — исходные предложения останутся на странице.':
    {
      uz: 'Oraliqni o‘zgartiring yoki filtrlarni tiklang — boshlang‘ich takliflar sahifada qoladi.',
      en: 'Change the range or reset filters; the original listings will remain on the page.',
    },
  'В наличии · цена из реестра': {
    uz: 'Mavjud · reyestrdagi narx',
    en: 'Available · registered price',
  },
  'Цена из реестра': { uz: 'Reyestrdagi narx', en: 'Registered price' },
  Забронировать: { uz: 'Band qilish', en: 'Reserve' },
  'Прозрачность цены': { uz: 'Narx shaffofligi', en: 'Price transparency' },
  'История стоимости за м²': {
    uz: 'm² narxi tarixi',
    en: 'Price per m² history',
  },
  'История средней цены за квадратный метр': {
    uz: 'Bir kvadrat metr o‘rtacha narxi tarixi',
    en: 'Average price per square meter history',
  },
  'Средняя цена активных объявлений по данным реестра EstateHub': {
    uz: 'EstateHub reyestriga ko‘ra faol e’lonlarning o‘rtacha narxi',
    en: 'Average price of active listings in the EstateHub register',
  },
  '% за период': { uz: '% davr davomida', en: '% over the period' },
  'Отзывы и рейтинг': { uz: 'Sharhlar va baholar', en: 'Reviews and ratings' },
  'Что говорят о': { uz: 'Sharhlar:', en: 'What people say about' },
  'Похожие жилые комплексы': {
    uz: 'O‘xshash turar joy majmualari',
    en: 'Similar developments',
  },
  'Все ЖК': { uz: 'Barcha majmualar', en: 'All developments' },
  'Качество строительства': {
    uz: 'Qurilish sifati',
    en: 'Construction quality',
  },
  'Проверенный рейтинг': { uz: 'Tasdiqlangan baho', en: 'Verified rating' },
  'Записаться на просмотр': {
    uz: 'Ko‘rishga yozilish',
    en: 'Schedule a viewing',
  },
  'Выберите дату и время — менеджер подтвердит визит.': {
    uz: 'Sana va vaqtni tanlang — menejer tashrifni tasdiqlaydi.',
    en: 'Choose a date and time; a manager will confirm your visit.',
  },
  'Доступность записи': {
    uz: 'Yozilish uchun bo‘sh vaqtlar',
    en: 'Viewing availability',
  },
  Ближайший: { uz: 'Eng yaqin', en: 'Soonest' },
  Доступно: { uz: 'Mavjud', en: 'Available' },
  'В день': { uz: 'Kuniga', en: 'Per day' },
  'Выбрать время': { uz: 'Vaqtni tanlash', en: 'Choose time' },
  'Получить консультацию': { uz: 'Maslahat olish', en: 'Request consultation' },
  'Читать отзывы и оценки': {
    uz: 'Sharhlar va baholarni o‘qish',
    en: 'Read reviews and ratings',
  },
  'Сравнение квартир': {
    uz: 'Kvartiralarni taqqoslash',
    en: 'Compare apartments',
  },
  'Подбор по параметрам': {
    uz: 'Mezonlar bo‘yicha tanlash',
    en: 'Match by criteria',
  },
  'До четырёх реальных предложений: цены и характеристики берутся из опубликованного реестра.':
    {
      uz: 'To‘rttagacha haqiqiy taklif: narxlar va xususiyatlar e’lon qilingan reyestrdan olinadi.',
      en: 'Compare up to four real listings. Prices and details come from the published register.',
    },
  'Объяснимое сравнение': {
    uz: 'Tushunarli taqqoslash',
    en: 'Clear comparison',
  },
  'AI покажет различия без субъективного «лучше»': {
    uz: 'AI farqlarni subyektiv baholarsiz ko‘rsatadi',
    en: 'AI highlights differences without subjective rankings',
  },
  'Цена, площадь и готовность берутся из опубликованных объявлений.': {
    uz: 'Narx, maydon va tayyorlik e’lon qilingan takliflardan olinadi.',
    en: 'Prices, area and completion details come from published listings.',
  },
  'Сравнить с AI': { uz: 'AI bilan taqqoslash', en: 'Compare with AI' },
  'Сравниваем…': { uz: 'Taqqoslanmoqda…', en: 'Comparing…' },
  'Обновить выводы': { uz: 'Xulosalarni yangilash', en: 'Refresh insights' },
  'Добавьте квартиры для сравнения': {
    uz: 'Taqqoslash uchun kvartiralar qo‘shing',
    en: 'Add apartments to compare',
  },
  'Откройте ЖК, выберите «Сравнить» у подходящей квартиры — можно добавить до четырёх вариантов.':
    {
      uz: 'Majmuani oching va mos kvartirada «Taqqoslash»ni tanlang — to‘rttagacha variant qo‘shish mumkin.',
      en: 'Open a development and select Compare on an apartment. You can add up to four.',
    },
  Параметр: { uz: 'Ko‘rsatkich', en: 'Feature' },
  'Готовность ЖК': { uz: 'Majmua tayyorligi', en: 'Development completion' },
  Действие: { uz: 'Amal', en: 'Action' },
  'Цена за м²': { uz: 'm² narxi', en: 'Price per m²' },
  'Квартира №': { uz: 'Kvartira №', en: 'Apartment no.' },
  'Сохранённые поиски': { uz: 'Saqlangan qidiruvlar', en: 'Saved searches' },
  'Объявление недоступно': {
    uz: 'E’lon mavjud emas',
    en: 'Listing unavailable',
  },
  'Объявление не найдено.': {
    uz: 'E’lon topilmadi.',
    en: 'Listing not found.',
  },
  'Загружаем объявление и историю цены…': {
    uz: 'E’lon va narx tarixi yuklanmoqda…',
    en: 'Loading listing and price history…',
  },
  'Данные квартиры': { uz: 'Kvartira ma’lumotlari', en: 'Apartment details' },
  'О квартире': { uz: 'Kvartira haqida', en: 'About the apartment' },
  'История изменения цены': {
    uz: 'Narx o‘zgarishi tarixi',
    en: 'Price history',
  },
  'История пока формируется': {
    uz: 'Tarix hozircha shakllanmoqda',
    en: 'History is still being collected',
  },
  'Только фактические записи этого объявления из неизменяемого журнала.': {
    uz: 'Faqat ushbu e’lonning o‘zgarmas jurnalidagi haqiqiy yozuvlar.',
    en: 'Only actual records for this listing from the immutable log.',
  },
  'Текущая цена': { uz: 'Joriy narx', en: 'Current price' },
  'Первая публикация': { uz: 'Birinchi e’lon', en: 'First published' },
  'Продавец изменил цену': {
    uz: 'Sotuvchi narxni o‘zgartirdi',
    en: 'Seller changed the price',
  },
  'Корректировка платформы': {
    uz: 'Platforma tuzatishi',
    en: 'Platform adjustment',
  },
  'Квартира в': { uz: 'Kvartira:', en: 'Apartment in' },
  Продавцу: { uz: 'Sotuvchiga', en: 'To seller' },
  'Отправить сообщение': { uz: 'Xabar yuborish', en: 'Send message' },
  'Сообщить о проблеме': {
    uz: 'Muammo haqida xabar berish',
    en: 'Report an issue',
  },
  'Проверенный продавец': {
    uz: 'Tekshirilgan sotuvchi',
    en: 'Verified seller',
  },
  проверяется: { uz: 'tekshirilmoqda', en: 'under review' },
  Проверен: { uz: 'Tekshirilgan', en: 'Verified' },
  'проверен EstateHub': {
    uz: 'EstateHub tomonidan tekshirilgan',
    en: 'verified by EstateHub',
  },
  Бронирование: { uz: 'Band qilish', en: 'Reservation' },
  'Бронь действует до': { uz: 'Band muddati:', en: 'Reservation valid until' },
  'Визит в офис': { uz: 'Savdo ofisiga tashrif', en: 'Office visit' },
  'Высокий приоритет': { uz: 'Yuqori ustuvorlik', en: 'High priority' },
  'Диалог создан': { uz: 'Suhbat boshlangan', en: 'Conversation started' },
  'Добавьте квартиры со страниц ЖК, чтобы увидеть их параметры рядом.': {
    uz: 'Kvartiralarni yonma-yon ko‘rish uchun ularni majmua sahifalaridan qo‘shing.',
    en: 'Add apartments from development pages to compare their details side by side.',
  },
  'Загружаем историю…': { uz: 'Tarix yuklanmoqda…', en: 'Loading history…' },
  'Загружаем…': { uz: 'Yuklanmoqda…', en: 'Loading…' },
  'Защита покупателя': { uz: 'Xaridor himoyasi', en: 'Buyer protection' },
  'Заявка на проверке': {
    uz: 'Ariza tekshiruvda',
    en: 'Application under review',
  },
  'Заявка передана ответственному менеджеру': {
    uz: 'Ariza mas’ul menejerga yuborildi',
    en: 'Application sent to the responsible manager',
  },
  'Здесь видны статус, решение и комментарий финансового специалиста.': {
    uz: 'Holat, qaror va moliya mutaxassisining izohi shu yerda ko‘rinadi.',
    en: 'Status, decision and the finance specialist’s comments appear here.',
  },
  'Исправьте данные и отправьте заявку повторно.': {
    uz: 'Ma’lumotlarni tuzatib, arizani qayta yuboring.',
    en: 'Correct the details and resubmit the application.',
  },
  'Консультации, просмотры и бронирования с актуальным статусом из CRM.': {
    uz: 'CRMdagi joriy holatga ega maslahatlar, ko‘rishlar va bandlar.',
    en: 'Consultations, viewings and reservations with current CRM status.',
  },
  'Критерии прозрачны': { uz: 'Mezonlar shaffof', en: 'Transparent criteria' },
  'Мобильная навигация': { uz: 'Mobil navigatsiya', en: 'Mobile navigation' },
  'Найти квартиру': { uz: 'Kvartira topish', en: 'Find an apartment' },
  Обычный: { uz: 'Oddiy', en: 'Standard' },
  'Ожидает оплаты': { uz: 'To‘lov kutilmoqda', en: 'Awaiting payment' },
  'Ожидает подтверждения': {
    uz: 'Tasdiq kutilmoqda',
    en: 'Awaiting confirmation',
  },
  'Оплата брони': { uz: 'Band to‘lovi', en: 'Reservation payment' },
  'Оплата зарегистрирована. Посетите офис продаж до окончания срока брони.': {
    uz: 'To‘lov qayd etildi. Band muddati tugashidan oldin savdo ofisiga boring.',
    en: 'Payment recorded. Visit the sales office before the reservation expires.',
  },
  'Оплатить до': { uz: 'To‘lash muddati:', en: 'Pay by' },
  Перенос: { uz: 'Boshqa vaqtga ko‘chirish', en: 'Reschedule' },
  'Подать заново': { uz: 'Qayta yuborish', en: 'Resubmit' },
  'Подбор квартир': { uz: 'Kvartira tanlash', en: 'Apartment selection' },
  'Показываем проверенные предложения из каталога.': {
    uz: 'Katalogdagi tekshirilgan takliflar ko‘rsatilmoqda.',
    en: 'Showing verified listings from the catalog.',
  },
  'Проверенные предложения': {
    uz: 'Tekshirilgan takliflar',
    en: 'Verified listings',
  },
  'Проверяем…': { uz: 'Tekshirilmoqda…', en: 'Checking…' },
  'Прямой контакт': { uz: 'Bevosita aloqa', en: 'Direct contact' },
  Решение: { uz: 'Qaror', en: 'Decision' },
  'Сначала подтвердите телефон': {
    uz: 'Avval telefonni tasdiqlang',
    en: 'Verify your phone first',
  },
  Сообщение: { uz: 'Xabar', en: 'Message' },
  Спор: { uz: 'Nizo', en: 'Dispute' },
  'Требуется OTP': {
    uz: 'Bir martalik kod kerak',
    en: 'One-time code required',
  },
  'Цена зафиксирована': { uz: 'Narx belgilandi', en: 'Price locked' },
  'в работе': { uz: 'jarayonda', en: 'in progress' },
  'в течение 72 часов': { uz: '72 soat davomida', en: 'within 72 hours' },
  диалог: { uz: 'suhbat', en: 'conversation' },
  диалога: { uz: 'suhbat', en: 'conversations' },
  'квартир ·': { uz: 'kvartira ·', en: 'apartments ·' },
  'комнаты ·': { uz: 'xona ·', en: 'rooms ·' },
  'м²': { uz: 'm²', en: 'm²' },
  открыт: { uz: 'ochiq', en: 'open' },
  покупатель: { uz: 'xaridor', en: 'buyer' },
  'покупка или отказ': {
    uz: 'sotib olish yoki rad etish',
    en: 'purchase or cancellation',
  },
  '-комнатная квартира,': {
    uz: '-xonali kvartira,',
    en: '-room apartment,',
  },
  '1 день': { uz: '1 kun', en: '1 day' },
  '30 дней': { uz: '30 kun', en: '30 days' },
  '5 слотов': { uz: '5 ta vaqt', en: '5 time slots' },
  'В сравнении': { uz: 'Taqqoslashda', en: 'In comparison' },
  'В сравнении:': { uz: 'Taqqoslashda:', en: 'Comparing:' },
  'График истории средней цены за квадратный метр': {
    uz: 'Bir kvadrat metr o‘rtacha narxi tarixi grafigi',
    en: 'Average price per square meter history chart',
  },
  'График появится после первого подтверждённого изменения цены.': {
    uz: 'Grafik birinchi tasdiqlangan narx o‘zgarishidan keyin paydo bo‘ladi.',
    en: 'The chart will appear after the first verified price change.',
  },
  Да: { uz: 'Ha', en: 'Yes' },
  Нет: { uz: 'Yo‘q', en: 'No' },
  Квартиры: { uz: 'Kvartiralar', en: 'Apartments' },
  'Максимальная цена, млн сум': {
    uz: 'Eng yuqori narx, mln so‘m',
    en: 'Maximum price, million UZS',
  },
  'Минимальная цена, млн сум': {
    uz: 'Eng past narx, mln so‘m',
    en: 'Minimum price, million UZS',
  },
  'Можно сравнить': { uz: 'Taqqoslash mumkin', en: 'You may also compare' },
  'Официальная копия': { uz: 'Rasmiy nusxa', en: 'Official copy' },
  'Подписка активна': { uz: 'Obuna faol', en: 'Subscription active' },
  Сейчас: { uz: 'Hozir', en: 'Now' },
  Собственник: { uz: 'Mulkdor', en: 'Owner' },
  'Цена, млн сум': { uz: 'Narx, mln so‘m', en: 'Price, million UZS' },
  'в продаже': { uz: 'sotuvda', en: 'for sale' },
  из: { uz: 'dan', en: 'of' },
  'из 4 квартир': { uz: '4 ta kvartiradan', en: 'of 4 apartments' },
  корпуса: { uz: 'bino', en: 'buildings' },
  'первичка / вторичка': {
    uz: 'birlamchi / ikkilamchi',
    en: 'new build / resale',
  },
  рейтинг: { uz: 'baho', en: 'rating' },
  статус: { uz: 'holat', en: 'status' },
  'этаж ·': { uz: 'qavat ·', en: 'floor ·' },
  'В каталог': { uz: 'Katalogga', en: 'Go to catalog' },
  Доступна: { uz: 'Mavjud', en: 'Available' },
  'Нет данных:': { uz: 'Ma’lumot yo‘q:', en: 'No data:' },
  Площадь: { uz: 'Maydon', en: 'Area' },
  'Без отделки': { uz: 'Ta’mirsiz', en: 'Unfinished' },
  'Все поля обязательны': {
    uz: 'Barcha maydonlar majburiy',
    en: 'All fields are required',
  },
  'Выберите существующий ЖК, подтвердите право собственности и оплатите размещение. Оплата не означает автоматическую публикацию: каждое объявление проходит проверку.':
    {
      uz: 'Mavjud majmuani tanlang, mulk huquqini tasdiqlang va joylashtirish uchun to‘lang. To‘lov avtomatik e’lon qilishni anglatmaydi: har bir e’lon tekshiriladi.',
      en: 'Choose an existing development, verify ownership and pay for placement. Payment does not publish a listing automatically; every listing is reviewed.',
    },
  Добавить: { uz: 'Qo‘shish', en: 'Add' },
  'Добавить квартиру': { uz: 'Kvartira qo‘shish', en: 'Add apartment' },
  'Добавить первую квартиру': {
    uz: 'Birinchi kvartirani qo‘shish',
    en: 'Add your first apartment',
  },
  Доверенность: { uz: 'Ishonchnoma', en: 'Power of attorney' },
  'Документ проверяет специалист платформы.': {
    uz: 'Hujjatni platforma mutaxassisi tekshiradi.',
    en: 'A platform specialist reviews the document.',
  },
  Документы: { uz: 'Hujjatlar', en: 'Documents' },
  'Документы и оплата приняты, проверяем карточку.': {
    uz: 'Hujjatlar va to‘lov qabul qilindi, e’lon tekshirilmoqda.',
    en: 'Documents and payment received. Reviewing the listing.',
  },
  'ЖК и корпус выбираются из справочника EstateHub. Продавец не может изменять официальные данные комплекса.':
    {
      uz: 'Majmua va bino EstateHub ma’lumotnomasidan tanlanadi. Sotuvchi majmuaning rasmiy ma’lumotlarini o‘zgartira olmaydi.',
      en: 'Select the development and building from the EstateHub directory. Sellers cannot change official development details.',
    },
  'Заполните форму ниже — заявка сразу попадёт на проверку документов.': {
    uz: 'Quyidagi shaklni to‘ldiring — ariza darhol hujjatlar tekshiruviga yuboriladi.',
    en: 'Complete the form below to submit the application for document review.',
  },
  'Здесь видны проверка, оплата, срок публикации и история.': {
    uz: 'Tekshiruv, to‘lov, e’lon muddati va tarixi shu yerda ko‘rinadi.',
    en: 'Review, payment, publication period and history appear here.',
  },
  'И только потом публикация': {
    uz: 'Shundan keyingina e’lon qilinadi',
    en: 'Publication follows approval',
  },
  'Исправленный номер или референс документа': {
    uz: 'Tuzatilgan hujjat raqami yoki havolasi',
    en: 'Corrected document number or reference',
  },
  'Исправьте данные и отправьте повторно.': {
    uz: 'Ma’lumotlarni tuzatib, qayta yuboring.',
    en: 'Correct the details and resubmit.',
  },
  'Кабинет продавца': { uz: 'Sotuvchi kabineti', en: 'Seller dashboard' },
  Модерация: { uz: 'Moderatsiya', en: 'Moderation' },
  'Мои объявления': { uz: 'E’lonlarim', en: 'My listings' },
  'На модерации': { uz: 'Moderatsiyada', en: 'Under review' },
  'На этом закрытом стенде сохраняется только референс документа, без файла.': {
    uz: 'Ushbu yopiq sinov sahifasida fayl emas, faqat hujjat havolasi saqlanadi.',
    en: 'This private test environment stores only the document reference, not the file.',
  },
  'Новая цена, млн сум': {
    uz: 'Yangi narx, mln so‘m',
    en: 'New price, million UZS',
  },
  'Новое объявление': { uz: 'Yangi e’lon', en: 'New listing' },
  'Номер или референс документа': {
    uz: 'Hujjat raqami yoki havolasi',
    en: 'Document number or reference',
  },
  'Номер станет контактом продавца и нужен перед отправкой документов.': {
    uz: 'Bu raqam sotuvchining aloqa raqami bo‘ladi va hujjatlarni yuborishdan oldin kerak.',
    en: 'This number will be the seller’s contact and is required before submitting documents.',
  },
  'Нужно исправить': { uz: 'Tuzatish kerak', en: 'Changes required' },
  'Нужно подтвердить': { uz: 'Tasdiqlash kerak', en: 'Verification required' },
  'Объявление видно покупателям.': {
    uz: 'E’lon xaridorlarga ko‘rinadi.',
    en: 'The listing is visible to buyers.',
  },
  'Объявление сохранено в истории.': {
    uz: 'E’lon tarixda saqlandi.',
    en: 'The listing was saved to history.',
  },
  'Объявлений пока нет': {
    uz: 'Hozircha e’lonlar yo‘q',
    en: 'No listings yet',
  },
  'Оплата запускает срок, но не гарантирует одобрение.': {
    uz: 'To‘lov muddatni boshlaydi, ammo tasdiqni kafolatlamaydi.',
    en: 'Payment starts the placement period but does not guarantee approval.',
  },
  'Оплата отдельно': { uz: 'Alohida to‘lov', en: 'Separate payment' },
  'Оплата размещения выполняется после создания объявления в кабинете. Провайдер сейчас работает в безопасном sandbox-режиме.':
    {
      uz: 'Joylashtirish to‘lovi kabinetda e’lon yaratilgandan so‘ng amalga oshiriladi. To‘lov provayderi hozir xavfsiz sinov rejimida ishlayapti.',
      en: 'Pay for placement after creating the listing in your dashboard. The payment provider is currently in a safe sandbox mode.',
    },
  Оплатить: { uz: 'To‘lash', en: 'Pay' },
  Опубликовано: { uz: 'E’lon qilingan', en: 'Published' },
  Основание: { uz: 'Asos', en: 'Basis' },
  'Отметить квартиру как проданную? Вернуть объявление в каталог после этого нельзя.':
    {
      uz: 'Kvartirani sotilgan deb belgilaysizmi? Shundan keyin e’lonni katalogga qaytarib bo‘lmaydi.',
      en: 'Mark this apartment as sold? You will not be able to restore its listing to the catalog.',
    },
  'Отправить на проверку': {
    uz: 'Tekshiruvga yuborish',
    en: 'Submit for review',
  },
  'Отправить снова': { uz: 'Qayta yuborish', en: 'Resend' },
  Подтверждён: { uz: 'Tasdiqlangan', en: 'Verified' },
  'После окончания объявление можно продлить.': {
    uz: 'Muddat tugagach e’lonni uzaytirish mumkin.',
    en: 'You can renew the listing after it expires.',
  },
  'Право собственности': { uz: 'Mulk huquqi', en: 'Ownership' },
  'Проверка документов': {
    uz: 'Hujjatlarni tekshirish',
    en: 'Document review',
  },
  'Проверка собственности': {
    uz: 'Mulkni tekshirish',
    en: 'Ownership verification',
  },
  'Продайте квартиру': {
    uz: 'Kvartirangizni soting',
    en: 'Sell your apartment',
  },
  Продано: { uz: 'Sotilgan', en: 'Sold' },
  Продать: { uz: 'Sotish', en: 'Sell' },
  'Продлите размещение ещё на 30 дней.': {
    uz: 'Joylashtirishni yana 30 kunga uzaytiring.',
    en: 'Extend placement by another 30 days.',
  },
  Продлить: { uz: 'Uzaytirish', en: 'Extend' },
  Размещение: { uz: 'Joylashtirish', en: 'Placement' },
  'Сначала проверка': { uz: 'Avval tekshiruv', en: 'Review first' },
  'Создать объявление': { uz: 'E’lon yaratish', en: 'Create listing' },
  'Специалист сверяет право собственности.': {
    uz: 'Mutaxassis mulk huquqini tekshiradi.',
    en: 'A specialist verifies ownership.',
  },
  'Срок закончился': { uz: 'Muddat tugadi', en: 'Expired' },
  'Статус объявления обновляется автоматически.': {
    uz: 'E’lon holati avtomatik yangilanadi.',
    en: 'Listing status updates automatically.',
  },
  'Статусы в реальном времени': {
    uz: 'Holatlar real vaqtda',
    en: 'Live statuses',
  },
  'Фиксированная стоимость': { uz: 'Belgilangan narx', en: 'Fixed cost' },
  'Шаг 1 из 4': { uz: '4 bosqichdan 1-si', en: 'Step 1 of 4' },
  Этажей: { uz: 'Qavatlar soni', en: 'Floors' },
  'в каталоге': { uz: 'katalogda', en: 'in catalog' },
  всего: { uz: 'jami', en: 'total' },
  'дней в каталоге': { uz: 'kun katalogda', en: 'days in catalog' },
  'комн.': { uz: 'xona', en: 'rooms' },
  'на проверке': { uz: 'tekshiruvda', en: 'under review' },
  'не оплачено': { uz: 'to‘lanmagan', en: 'unpaid' },
  'прозрачно и безопасно': {
    uz: 'shaffof va xavfsiz',
    en: 'transparent and secure',
  },
  'срок одного размещения': {
    uz: 'bitta joylashtirish muddati',
    en: 'single placement period',
  },
  '№ квартиры': { uz: 'kvartira №', en: 'apartment no.' },
  'Без изменений': { uz: 'O‘zgarishsiz', en: 'No change' },
  'Бронь доступна только у застройщика и подтверждается отдельной оплатой.': {
    uz: 'Band qilish faqat quruvchi takliflarida mavjud va alohida to‘lov bilan tasdiqlanadi.',
    en: 'Reservations are available only for developer listings and require a separate payment.',
  },
  'Все квартиры в': { uz: 'Barcha kvartiralar:', en: 'All apartments in' },
  'Для вторичного рынка онлайн-бронирование недоступно: условия просмотра и сделки согласуются с продавцом.':
    {
      uz: 'Ikkilamchi bozorda onlayn band yo‘q: ko‘rish va bitim shartlari sotuvchi bilan kelishiladi.',
      en: 'Online reservations are unavailable for resale listings; arrange viewing and sale terms with the seller.',
    },
  'Документы прошли проверку': {
    uz: 'Hujjatlar tekshiruvdan o‘tgan',
    en: 'Documents verified',
  },
  'Изменение с первой записи': {
    uz: 'Birinchi yozuvdan beri o‘zgarish',
    en: 'Change since first record',
  },
  'Изменение цены': { uz: 'Narx o‘zgarishi', en: 'Price change' },
  'Об объекте': { uz: 'Obyekt haqida', en: 'About the property' },
  'Объект связан с реестром ЖК': {
    uz: 'Obyekt majmualar reyestriga bog‘langan',
    en: 'Linked to the development register',
  },
  'Объявление связано с официальной карточкой ЖК и не меняет данные комплекса.':
    {
      uz: 'E’lon majmuaning rasmiy sahifasiga bog‘langan va uning ma’lumotlarini o‘zgartirmaydi.',
      en: 'The listing links to the official development page and cannot change its details.',
    },
  Отслеживается: { uz: 'Kuzatilmoqda', en: 'Following' },
  'Официальная карточка ЖК': {
    uz: 'Majmuaning rasmiy sahifasi',
    en: 'Official development page',
  },
  'Первичный рынок': { uz: 'Birlamchi bozor', en: 'New builds' },
  'Подача объявления': { uz: 'E’lon yuborish', en: 'Listing submission' },
  Продвигается: { uz: 'Reklama qilinmoqda', en: 'Promoted' },
  'Цена квартиры': { uz: 'Kvartira narxi', en: 'Apartment price' },
  дом: { uz: 'uy', en: 'building' },
  комнаты: { uz: 'xona', en: 'rooms' },
  площадь: { uz: 'maydon', en: 'area' },
  состояние: { uz: 'holat', en: 'condition' },
  фото: { uz: 'surat', en: 'photos' },
  'Кабинет застройщика': { uz: 'Quruvchi kabineti', en: 'Developer dashboard' },
  'EstateHub — главная': {
    uz: 'EstateHub — bosh sahifa',
    en: 'EstateHub — home',
  },
  'Основная навигация': { uz: 'Asosiy navigatsiya', en: 'Main navigation' },
  'Мобильное меню': { uz: 'Mobil menyu', en: 'Mobile menu' },
  'Открыть меню': { uz: 'Menyuni ochish', en: 'Open menu' },
  'Закрыть меню': { uz: 'Menyuni yopish', en: 'Close menu' },
  'Закрыть фильтры': { uz: 'Filtrlarni yopish', en: 'Close filters' },
  Закрыть: { uz: 'Yopish', en: 'Close' },
  Готово: { uz: 'Tayyor', en: 'Done' },
  Отмена: { uz: 'Bekor qilish', en: 'Cancel' },
  Отправить: { uz: 'Yuborish', en: 'Send' },
  Сохранить: { uz: 'Saqlash', en: 'Save' },
  'Сохраняем…': { uz: 'Saqlanmoqda…', en: 'Saving…' },
  'Выходим…': { uz: 'Chiqilmoqda…', en: 'Signing out…' },
  'Не удалось выйти. Повторите попытку.': {
    uz: 'Chiqib bo‘lmadi. Qayta urinib ko‘ring.',
    en: 'Could not sign out. Please try again.',
  },
  'Загружаем проверенные комплексы': {
    uz: 'Tekshirilgan majmualar yuklanmoqda',
    en: 'Loading verified developments',
  },
  'Получаем актуальные цены и доступность квартир.': {
    uz: 'Joriy narxlar va kvartiralar mavjudligi olinmoqda.',
    en: 'Fetching current prices and apartment availability.',
  },
  'Каталог временно недоступен': {
    uz: 'Katalog vaqtincha ishlamayapti',
    en: 'Catalog temporarily unavailable',
  },
  'Не удалось загрузить результаты': {
    uz: 'Natijalarni yuklab bo‘lmadi',
    en: 'Could not load results',
  },
  'Подходящих комплексов пока нет': {
    uz: 'Mos majmualar hozircha yo‘q',
    en: 'No matching developments yet',
  },
  'Измените тип рынка или перейдите в полный каталог.': {
    uz: 'Bozor turini o‘zgartiring yoki to‘liq katalogga o‘ting.',
    en: 'Change the market type or open the full catalog.',
  },
  'Сбросьте часть фильтров или измените формулировку запроса.': {
    uz: 'Ba’zi filtrlarni olib tashlang yoki so‘rovni o‘zgartiring.',
    en: 'Remove some filters or rephrase your search.',
  },
  'Точных совпадений нет': {
    uz: 'Aniq mosliklar yo‘q',
    en: 'No exact matches',
  },
  'Готовые квартиры от владельцев и агентств': {
    uz: 'Mulkdorlar va agentliklardan tayyor kvartiralar',
    en: 'Completed apartments from owners and agencies',
  },
  'Квартиры напрямую от застройщиков': {
    uz: 'To‘g‘ridan-to‘g‘ri quruvchilardan kvartiralar',
    en: 'Apartments direct from developers',
  },
  'Квартиры в Самарканде': {
    uz: 'Samarqanddagi kvartiralar',
    en: 'Apartments in Samarkand',
  },
  'Смотрите готовые и строящиеся комплексы, сроки сдачи и доступные квартиры.':
    {
      uz: 'Tayyor va qurilayotgan majmualarni, topshirish muddatlarini va mavjud kvartiralarni ko‘ring.',
      en: 'Explore completed and upcoming developments, completion dates and available apartments.',
    },
  'Сравнивайте предложения в сданных домах, состояние квартиры и историю актуальной цены.':
    {
      uz: 'Topshirilgan uylardagi takliflar, kvartira holati va narx tarixini solishtiring.',
      en: 'Compare listings in completed buildings, apartment condition and price history.',
    },
  'ЖК по выбранным фильтрам': {
    uz: 'Tanlangan filtrlarga mos majmualar',
    en: 'Developments matching your filters',
  },
  'от 40 000': { uz: '40 000 dan', en: 'from 40,000' },
  'до 80 000': { uz: '80 000 gacha', en: 'up to 80,000' },
  'от 450 млн': { uz: '450 mln dan', en: 'from 450 million' },
  'до 900 млн': { uz: '900 mln gacha', en: 'up to 900 million' },
  '· от': { uz: '· dan', en: '· from' },
  'Цена,': { uz: 'Narx,', en: 'Price,' },
  'Поиск:': { uz: 'Qidiruv:', en: 'Search:' },
  'Пока не учитываем:': {
    uz: 'Hozircha hisobga olinmaydi:',
    en: 'Not considered yet:',
  },
  'Раздел:': { uz: 'Bo‘lim:', en: 'Section:' },
  'все квартиры': { uz: 'barcha kvartiralar', en: 'all apartments' },
  доступность: { uz: 'mavjudlik', en: 'availability' },
  'новые квартиры': { uz: 'yangi kvartiralar', en: 'new apartments' },
  цена: { uz: 'narx', en: 'price' },
  предложения: { uz: 'takliflar', en: 'listings' },
  объект: { uz: 'obyekt', en: 'property' },
  объекта: { uz: 'obyekt', en: 'properties' },
  объектов: { uz: 'obyekt', en: 'properties' },
  'сохранённый поиск': { uz: 'saqlangan qidiruv', en: 'saved search' },
  'сохранённых поиска': { uz: 'saqlangan qidiruv', en: 'saved searches' },
  'сохранённых поисков': { uz: 'saqlangan qidiruv', en: 'saved searches' },
  отзыв: { uz: 'sharh', en: 'review' },
  отзыва: { uz: 'sharh', en: 'reviews' },
  'ID-карта': { uz: 'ID-karta', en: 'ID card' },
  Паспорт: { uz: 'Pasport', en: 'Passport' },
  Документ: { uz: 'Hujjat', en: 'Document' },
  'Серия и номер': { uz: 'Seriya va raqam', en: 'Series and number' },
  'Дата рождения': { uz: 'Tug‘ilgan sana', en: 'Date of birth' },
  'Имя и фамилия': { uz: 'Ism va familiya', en: 'First and last name' },
  'Иван Иванов': { uz: 'Ivan Ivanov', en: 'Ivan Ivanov' },
  'Номер телефона': { uz: 'Telefon raqami', en: 'Phone number' },
  'Изменить номер': { uz: 'Raqamni o‘zgartirish', en: 'Change number' },
  'Получить код': { uz: 'Kod olish', en: 'Get code' },
  'Создаём код…': { uz: 'Kod yaratilmoqda…', en: 'Creating code…' },
  'Введите код из SMS': { uz: 'SMS kodni kiriting', en: 'Enter the SMS code' },
  'Шестизначный код': { uz: 'Olti xonali kod', en: 'Six-digit code' },
  'OTP-код': { uz: 'Bir martalik kod', en: 'One-time code' },
  'Демо-код текущего стенда': {
    uz: 'Sinov muhitining demo kodi',
    en: 'Demo code for this test environment',
  },
  'Код действует 10 минут. Для закрытого стенда используется безопасный демонстрационный провайдер.':
    {
      uz: 'Kod 10 daqiqa amal qiladi. Yopiq sinov muhiti xavfsiz demo provayderdan foydalanadi.',
      en: 'The code is valid for 10 minutes. The private test environment uses a safe demo provider.',
    },
  Подтвердить: { uz: 'Tasdiqlash', en: 'Confirm' },
  'Подтверждаем…': { uz: 'Tasdiqlanmoqda…', en: 'Confirming…' },
  'Не удалось получить код.': {
    uz: 'Kodni olib bo‘lmadi.',
    en: 'Could not get the code.',
  },
  'Не удалось подтвердить код.': {
    uz: 'Kodni tasdiqlab bo‘lmadi.',
    en: 'Could not verify the code.',
  },
  'Базовый аккаунт активирован': {
    uz: 'Asosiy hisob faollashtirildi',
    en: 'Basic account activated',
  },
  'Теперь доступны персональные функции EstateHub. Для платной брони отдельно потребуется проверка личности.':
    {
      uz: 'EstateHub shaxsiy funksiyalari endi mavjud. Pulli band uchun alohida shaxsni tekshirish talab etiladi.',
      en: 'Personal EstateHub features are now available. Paid reservations require a separate identity check.',
    },
  'После OTP-проверки станут доступны избранное, сравнение, сообщения, просмотры и сохранённые поиски.':
    {
      uz: 'Bir martalik kod tasdiqlangach, sevimlilar, taqqoslash, xabarlar, ko‘rishlar va saqlangan qidiruvlar ochiladi.',
      en: 'Favorites, comparisons, messages, viewings and saved searches become available after code verification.',
    },
  'Проверка личности': {
    uz: 'Shaxsni tekshirish',
    en: 'Identity verification',
  },
  'Подтвердите данные покупателя': {
    uz: 'Xaridor ma’lumotlarini tasdiqlang',
    en: 'Confirm buyer details',
  },
  'Вы можете заранее отправить данные на проверку специалисту EstateHub. Полный номер документа не сохраняется.':
    {
      uz: 'Maʼlumotlaringizni EstateHub mutaxassisiga oldindan tekshiruv uchun yuborishingiz mumkin. Hujjatning to‘liq raqami saqlanmaydi.',
      en: 'You can send your details for an advance check by an EstateHub specialist. The full document number is not stored.',
    },
  'Я согласен на добровольную проверку личности в EstateHub': {
    uz: 'EstateHubʼda shaxsimni ixtiyoriy tekshirishga roziman',
    en: 'I consent to optional identity verification in EstateHub',
  },
  'Провайдер проверки подключается через защищённый адаптер': {
    uz: 'Tekshiruv provayderi himoyalangan adapter orqali ulanadi',
    en: 'Verification provider connects through a secure adapter',
  },
  'Перейти к проверке личности': {
    uz: 'Shaxsni tekshirishga o‘tish',
    en: 'Continue to identity verification',
  },
  'Данные защищены': {
    uz: 'Ma’lumotlar himoyalangan',
    en: 'Your data is protected',
  },
  'Не удалось отправить данные.': {
    uz: 'Ma’lumotlarni yuborib bo‘lmadi.',
    en: 'Could not submit details.',
  },
  'Связаться с застройщиком': {
    uz: 'Quruvchi bilan bog‘lanish',
    en: 'Contact developer',
  },
  'Запись на просмотр': { uz: 'Ko‘rishga yozilish', en: 'Schedule viewing' },
  'Запросить просмотр': { uz: 'Ko‘rishni so‘rash', en: 'Request viewing' },
  'Бесплатная консультация': { uz: 'Bepul maslahat', en: 'Free consultation' },
  'Бесплатный просмотр': { uz: 'Bepul ko‘rish', en: 'Free viewing' },
  'Менеджер свяжется с вами': {
    uz: 'Menejer siz bilan bog‘lanadi',
    en: 'A manager will contact you',
  },
  'Менеджер подтвердит просмотр': {
    uz: 'Menejer ko‘rishni tasdiqlaydi',
    en: 'A manager will confirm the viewing',
  },
  'Заявка отправлена': { uz: 'Ariza yuborildi', en: 'Request sent' },
  'Заявка отправлена.': { uz: 'Ariza yuborildi.', en: 'Request sent.' },
  'Заявка зарегистрирована': {
    uz: 'Ariza qayd etildi',
    en: 'Request registered',
  },
  'Обращение зарегистрировано': {
    uz: 'Murojaat qayd etildi',
    en: 'Inquiry registered',
  },
  'Мы связали её с вашим существующим профилем клиента.': {
    uz: 'Uni mavjud mijoz profilingiz bilan bog‘ladik.',
    en: 'We linked it to your existing customer profile.',
  },
  'Что вас интересует?': {
    uz: 'Sizni nima qiziqtiradi?',
    en: 'What would you like to know?',
  },
  'Например, расскажите об условиях рассрочки': {
    uz: 'Masalan, bo‘lib to‘lash shartlari haqida ayting',
    en: 'For example, tell me about installment terms',
  },
  'Например, хочу посмотреть отделку и планировку': {
    uz: 'Masalan, ta’mir va rejani ko‘rmoqchiman',
    en: 'For example, I would like to see the finish and floor plan',
  },
  'Комментарий менеджеру': { uz: 'Menejerga izoh', en: 'Note to manager' },
  'Я согласен на обработку данных для ответа на заявку': {
    uz: 'Arizamga javob berish uchun ma’lumotlarimni qayta ishlashga roziman',
    en: 'I consent to data processing for a response to my request',
  },
  'Не удалось отправить заявку.': {
    uz: 'Arizani yuborib bo‘lmadi.',
    en: 'Could not send the request.',
  },
  '· квартира №': { uz: '· kvartira №', en: '· apartment no.' },
  '. Заявка попадёт напрямую в CRM застройщика.': {
    uz: '. Ariza bevosita quruvchining CRM tizimiga yuboriladi.',
    en: '. The request goes directly to the developer’s CRM.',
  },
  'Спор по бронированию': {
    uz: 'Band bo‘yicha nizo',
    en: 'Reservation dispute',
  },
  'Спор передан специалисту': {
    uz: 'Nizo mutaxassisga yuborildi',
    en: 'Dispute sent to a specialist',
  },
  'Решение принимается по данным брони и аудита': {
    uz: 'Qaror band va audit ma’lumotlariga asoslanadi',
    en: 'Decisions are based on reservation and audit records',
  },
  'Полный возврат выполняется только после подтверждения вины застройщика.': {
    uz: 'To‘liq qaytarim faqat quruvchining aybi tasdiqlangandan keyin amalga oshiriladi.',
    en: 'A full refund is issued only after developer fault is confirmed.',
  },
  'В этой версии решение подтверждает специалист EstateHub.': {
    uz: 'Hozirgi versiyada qarorni EstateHub mutaxassisi tasdiqlaydi.',
    en: 'In this version, an EstateHub specialist confirms the decision.',
  },
  'Обращению назначен высокий приоритет.': {
    uz: 'Murojaatga yuqori ustuvorlik berildi.',
    en: 'The inquiry was marked high priority.',
  },
  Причина: { uz: 'Sabab', en: 'Reason' },
  'Что произошло?': { uz: 'Nima yuz berdi?', en: 'What happened?' },
  'Квартира фактически недоступна': {
    uz: 'Kvartira amalda mavjud emas',
    en: 'Apartment is actually unavailable',
  },
  'Застройщик не соблюдает условия': {
    uz: 'Quruvchi shartlarga amal qilmayapti',
    en: 'Developer is not honoring the terms',
  },
  'Застройщик отменил бронь': {
    uz: 'Quruvchi bandni bekor qildi',
    en: 'Developer canceled the reservation',
  },
  'Проблема с оплатой': { uz: 'To‘lov muammosi', en: 'Payment issue' },
  'Другая причина': { uz: 'Boshqa sabab', en: 'Other reason' },
  'Опишите ситуацию и укажите, какие условия не были выполнены': {
    uz: 'Vaziyatni va qaysi shartlar bajarilmaganini yozing',
    en: 'Describe the situation and which terms were not met',
  },
  'Передать на рассмотрение': {
    uz: 'Ko‘rib chiqishga yuborish',
    en: 'Submit for review',
  },
  'Статус и решение будут доступны в профиле.': {
    uz: 'Holat va qaror profilingizda ko‘rinadi.',
    en: 'Status and decision will appear in your profile.',
  },
  'Статус обновится в профиле после решения специалиста.': {
    uz: 'Mutaxassis qaroridan so‘ng holat profilingizda yangilanadi.',
    en: 'Status will update in your profile after the specialist’s decision.',
  },
  'После решения он появится в общем списке.': {
    uz: 'Qarordan so‘ng u umumiy ro‘yxatda paydo bo‘ladi.',
    en: 'It will appear in the main list after a decision.',
  },
  'Не удалось зарегистрировать спор.': {
    uz: 'Nizoni qayd etib bo‘lmadi.',
    en: 'Could not register the dispute.',
  },
  'Следите за ЖК, ценой, доступностью и новыми квартирами.': {
    uz: 'Majmua, narx, mavjudlik va yangi kvartiralarni kuzating.',
    en: 'Follow the development, its prices, availability and new apartments.',
  },
  'Отслеживание изменений': {
    uz: 'O‘zgarishlarni kuzatish',
    en: 'Track changes',
  },
  'Следить за': { uz: 'Kuzatish:', en: 'Follow' },
  'Снижение цены': { uz: 'Narx tushishi', en: 'Price drop' },
  'Снова в продаже': { uz: 'Yana sotuvda', en: 'Back on sale' },
  'Новые квартиры': { uz: 'Yangi kvartiralar', en: 'New apartments' },
  'Новый инвентарь в этом жилом комплексе.': {
    uz: 'Ushbu majmuadagi yangi kvartiralar.',
    en: 'New inventory in this development.',
  },
  'Предложения и акции': {
    uz: 'Takliflar va aksiyalar',
    en: 'Offers and promotions',
  },
  'Новые предложения и ограниченные условия продавца.': {
    uz: 'Yangi takliflar va sotuvchining cheklangan muddatli shartlari.',
    en: 'New listings and limited-time seller offers.',
  },
  'Сообщить, когда цена квартиры станет ниже.': {
    uz: 'Kvartira narxi tushganda xabar berish.',
    en: 'Notify me when the apartment price drops.',
  },
  'Сообщить, когда удержание или бронь освободятся.': {
    uz: 'Ushlab turish yoki band bo‘shaganda xabar berish.',
    en: 'Notify me when a hold or reservation becomes available.',
  },
  'Подписки и watchlist': {
    uz: 'Obunalar va kuzatuv ro‘yxati',
    en: 'Subscriptions and watchlist',
  },
  'Персональная подписка': { uz: 'Shaxsiy obuna', en: 'Personal subscription' },
  'Подписок на объекты пока нет': {
    uz: 'Obyektlarga obunalar hozircha yo‘q',
    en: 'No property subscriptions yet',
  },
  'Добавьте подписку на ЖК или сохраните поиск.': {
    uz: 'Majmuaga obuna bo‘ling yoki qidiruvni saqlang.',
    en: 'Follow a development or save a search.',
  },
  'Откройте страницу ЖК и нажмите «Следить».': {
    uz: 'Majmua sahifasini ochib, «Kuzatish»ni bosing.',
    en: 'Open a development page and select Follow.',
  },
  Отключить: { uz: 'O‘chirish', en: 'Turn off' },
  'Отключить подписку': { uz: 'Obunani bekor qilish', en: 'Unsubscribe' },
  'Не удалось сохранить подписку.': {
    uz: 'Obunani saqlab bo‘lmadi.',
    en: 'Could not save subscription.',
  },
  'Не удалось отключить подписку.': {
    uz: 'Obunani bekor qilib bo‘lmadi.',
    en: 'Could not unsubscribe.',
  },
  'Сообщать о новых совпадениях': {
    uz: 'Yangi mosliklar haqida xabar berish',
    en: 'Notify me of new matches',
  },
  'Каналы и согласия': {
    uz: 'Kanallar va roziliklar',
    en: 'Channels and consent',
  },
  'Email-уведомления': {
    uz: 'Email bildirishnomalari',
    en: 'Email notifications',
  },
  'SMS для критических событий': {
    uz: 'Muhim hodisalar uchun SMS',
    en: 'SMS for critical events',
  },
  'Только с отдельного согласия': {
    uz: 'Faqat alohida rozilik bilan',
    en: 'Only with separate consent',
  },
  'Sandbox-очередь': { uz: 'Sinov navbati', en: 'Sandbox queue' },
  'In-app работает сразу. Email и SMS находятся в sandbox-очереди до подключения боевых провайдеров.':
    {
      uz: 'Sayt ichidagi xabarlar darhol ishlaydi. Email va SMS provayderlar ulangunga qadar sinov navbatida bo‘ladi.',
      en: 'In-app notifications work immediately. Email and SMS remain in the sandbox queue until live providers are connected.',
    },
  'Критические события дедуплицируются и записываются в аудит.': {
    uz: 'Muhim hodisalar takrorlanmasdan auditga yoziladi.',
    en: 'Critical events are deduplicated and recorded in the audit log.',
  },
  'Выберите события. Повторные уведомления автоматически исключаются.': {
    uz: 'Hodisalarni tanlang. Takroriy bildirishnomalar avtomatik chetlatiladi.',
    en: 'Choose events. Duplicate notifications are removed automatically.',
  },
  'Центр уведомлений': {
    uz: 'Bildirishnomalar markazi',
    en: 'Notification center',
  },
  'События аккаунта': { uz: 'Hisob hodisalari', en: 'Account activity' },
  'Новых событий нет': { uz: 'Yangi hodisalar yo‘q', en: 'No new activity' },
  'Все события просмотрены.': {
    uz: 'Barcha hodisalar ko‘rildi.',
    en: 'All events have been viewed.',
  },
  'Загружаем события…': {
    uz: 'Hodisalar yuklanmoqda…',
    en: 'Loading activity…',
  },
  'Прочитать всё': { uz: 'Hammasini o‘qish', en: 'Mark all as read' },
  'Загружаем подписки…': {
    uz: 'Obunalar yuklanmoqda…',
    en: 'Loading subscriptions…',
  },
  'Чат по объявлению': { uz: 'E’lon bo‘yicha suhbat', en: 'Listing chat' },
  'Напишите продавцу…': { uz: 'Sotuvchiga yozing…', en: 'Message the seller…' },
  'Начните диалог: уточните условия сделки, документы или удобное время просмотра.':
    {
      uz: 'Suhbatni boshlang: bitim shartlari, hujjatlar yoki ko‘rish vaqtini so‘rang.',
      en: 'Start a conversation about the deal terms, documents or a convenient viewing time.',
    },
  '. Продавец сразу видит, по какому объекту вы пишете.': {
    uz: '. Sotuvchi qaysi obyekt haqida yozayotganingizni darhol ko‘radi.',
    en: '. The seller can immediately see which property you are asking about.',
  },
  'Загружаем переписку…': {
    uz: 'Xabarlar yuklanmoqda…',
    en: 'Loading conversation…',
  },
  'Не удалось загрузить переписку.': {
    uz: 'Xabarlarni yuklab bo‘lmadi.',
    en: 'Could not load the conversation.',
  },
  'Не удалось отправить сообщение.': {
    uz: 'Xabarni yuborib bo‘lmadi.',
    en: 'Could not send the message.',
  },
  Вы: { uz: 'Siz', en: 'You' },
  'Бронь подтверждена': { uz: 'Band tasdiqlandi', en: 'Reservation confirmed' },
  'Квартира удержана': {
    uz: 'Kvartira vaqtincha ushlab turildi',
    en: 'Apartment held',
  },
  'Удержать на 5 минут': {
    uz: '5 daqiqaga ushlab turish',
    en: 'Hold for 5 minutes',
  },
  'Завершите защищённый тестовый платёж в течение 5 минут. Цена квартиры зафиксирована на момент удержания.':
    {
      uz: '5 daqiqa ichida himoyalangan sinov to‘lovini yakunlang. Kvartira narxi ushlab turish vaqtida belgilanadi.',
      en: 'Complete the secure test payment within 5 minutes. The apartment price is locked when the hold starts.',
    },
  'После подтверждения данных квартира будет удержана только для вас на 5 минут — до завершения оплаты.':
    {
      uz: 'Ma’lumotlar tasdiqlangach, to‘lov tugaguncha kvartira 5 daqiqaga faqat siz uchun ushlab turiladi.',
      en: 'After your details are confirmed, the apartment will be held for you for 5 minutes while you complete payment.',
    },
  'Оплата зарегистрирована, квартира снята с доступной витрины на 72 часа.': {
    uz: 'To‘lov qayd etildi, kvartira 72 soatga sotuvdan olindi.',
    en: 'Payment recorded. The apartment is removed from available listings for 72 hours.',
  },
  'Стоимость бронирования': { uz: 'Band narxi', en: 'Reservation fee' },
  'Подтвердить тестовую оплату': {
    uz: 'Sinov to‘lovini tasdiqlash',
    en: 'Confirm test payment',
  },
  'Я принимаю условия онлайн-бронирования': {
    uz: 'Onlayn band qilish shartlariga roziman',
    en: 'I accept the online reservation terms',
  },
  'Не удалось удержать квартиру.': {
    uz: 'Kvartirani ushlab turib bo‘lmadi.',
    en: 'Could not hold the apartment.',
  },
  'Не удалось подтвердить оплату.': {
    uz: 'To‘lovni tasdiqlab bo‘lmadi.',
    en: 'Could not confirm payment.',
  },
  'Ваш опыт': { uz: 'Tajribangiz', en: 'Your experience' },
  'Оставить отзыв': { uz: 'Sharh qoldirish', en: 'Leave a review' },
  'Изменить отзыв': { uz: 'Sharhni o‘zgartirish', en: 'Edit review' },
  'Изменить свой отзыв': { uz: 'Sharhimni o‘zgartirish', en: 'Edit my review' },
  'Отзыв отправлен': { uz: 'Sharh yuborildi', en: 'Review submitted' },
  'Ваш отзыв на модерации': {
    uz: 'Sharhingiz moderatsiyada',
    en: 'Your review is under review',
  },
  'Отзыв требует изменений': {
    uz: 'Sharhni tuzatish kerak',
    en: 'Review needs changes',
  },
  'Один активный отзыв на аккаунт. Изменения заменят текущую версию после повторной модерации.':
    {
      uz: 'Har bir hisob uchun bitta faol sharh. O‘zgartirishlar qayta tekshirilgach joriy versiyani almashtiradi.',
      en: 'One active review per account. Edits replace the current version after another review.',
    },
  'Оценки проходят модерацию. Отзывы подтверждённых владельцев имеют больший вес.':
    {
      uz: 'Baholar moderatsiyadan o‘tadi. Tasdiqlangan mulkdorlarning sharhlari ko‘proq ahamiyatga ega.',
      en: 'Ratings are moderated. Reviews from verified owners carry more weight.',
    },
  'Проверенный владелец / житель': {
    uz: 'Tasdiqlangan mulkdor / yashovchi',
    en: 'Verified owner / resident',
  },
  'Загружаем проверенные отзывы…': {
    uz: 'Tekshirilgan sharhlar yuklanmoqda…',
    en: 'Loading verified reviews…',
  },
  'Пока нет опубликованных отзывов': {
    uz: 'Hozircha e’lon qilingan sharhlar yo‘q',
    en: 'No published reviews yet',
  },
  'Станьте первым — после модерации ваш опыт поможет другим покупателям.': {
    uz: 'Birinchi bo‘lib yozing — tekshiruvdan so‘ng tajribangiz boshqa xaridorlarga yordam beradi.',
    en: 'Be the first to review. After moderation, your experience will help other buyers.',
  },
  'Модерация защищает рейтинг': {
    uz: 'Moderatsiya baholar ishonchliligini saqlaydi',
    en: 'Moderation protects ratings',
  },
  'Расскажите о качестве дома, дворе, сервисе и расположении…': {
    uz: 'Uy sifati, hovli, xizmat va joylashuv haqida yozing…',
    en: 'Tell us about the building, grounds, service and location…',
  },
  'Подтверждаю достоверность описания': {
    uz: 'Tavsifning to‘g‘riligini tasdiqlayman',
    en: 'I confirm this description is accurate',
  },
  'Отправить на модерацию': {
    uz: 'Moderatsiyaga yuborish',
    en: 'Submit for moderation',
  },
  'Не удалось сохранить отзыв.': {
    uz: 'Sharhni saqlab bo‘lmadi.',
    en: 'Could not save the review.',
  },
  Пожаловаться: { uz: 'Shikoyat qilish', en: 'Report' },
  'Что нарушает правила в этом отзыве?': {
    uz: 'Bu sharh qaysi qoidani buzmoqda?',
    en: 'How does this review violate the rules?',
  },
  Ответ: { uz: 'Javob', en: 'Reply' },
  'Email, необязательно': { uz: 'Email, majburiy emas', en: 'Email, optional' },
  'Номер заявки:': { uz: 'Ariza raqami:', en: 'Request number:' },
  'Номер:': { uz: 'Raqam:', en: 'Number:' },
  '/1500 · минимум 20 символов': {
    uz: '/1500 · kamida 20 belgi',
    en: '/1500 · at least 20 characters',
  },
  '. Обращение увидит финансовый специалист EstateHub.': {
    uz: '. Murojaatni EstateHub moliya mutaxassisi ko‘rib chiqadi.',
    en: '. An EstateHub finance specialist will review the inquiry.',
  },
  '2 500 000 сум': { uz: '2 500 000 so‘m', en: 'UZS 2,500,000' },
  'EstateHub — квартиры в Самарканде': {
    uz: 'EstateHub — Samarqanddagi kvartiralar',
    en: 'EstateHub — apartments in Samarkand',
  },
  Время: { uz: 'Vaqt', en: 'Time' },
  Дата: { uz: 'Sana', en: 'Date' },
  'Жилой комплекс не найден | EstateHub': {
    uz: 'Turar joy majmuasi topilmadi | EstateHub',
    en: 'Development not found | EstateHub',
  },
  'Карта жилых комплексов Самарканда': {
    uz: 'Samarqand turar joy majmualari xaritasi',
    en: 'Samarkand developments map',
  },
  'Курс ЦБ временно недоступен': {
    uz: 'Markaziy bank kursi vaqtincha mavjud emas',
    en: 'Central Bank rate temporarily unavailable',
  },
  'Курс Центрального банка от': {
    uz: 'Markaziy bank kursi, sana:',
    en: 'Central Bank rate as of',
  },
  'Камерный жилой комплекс с закрытым двором, панорамными окнами и готовой инфраструктурой.':
    {
      uz: 'Yopiq hovli, panoramali derazalar va tayyor infratuzilmaga ega shinam turar joy majmuasi.',
      en: 'An intimate development with a private courtyard, panoramic windows and established infrastructure.',
    },
  'Современный квартал рядом с историческим центром и приватным зелёным двором.':
    {
      uz: 'Tarixiy markaz yaqinidagi shaxsiy yashil hovliga ega zamonaviy mahalla.',
      en: 'A modern neighborhood near the historic center with a private green courtyard.',
    },
  'Городской комплекс с семейными планировками и развитой инфраструктурой.': {
    uz: 'Oilaviy rejalari va rivojlangan infratuzilmasi bor shahar majmuasi.',
    en: 'An urban development with family-friendly layouts and established infrastructure.',
  },
  'Готовый семейный комплекс с просторными квартирами и благоустроенным парком.':
    {
      uz: 'Keng kvartiralar va obodonlashtirilgan bog‘ga ega tayyor oilaviy majmua.',
      en: 'A completed family development with spacious apartments and a landscaped park.',
    },
  'Многофункциональный городской квартал с сервисами, магазинами и прогулочными зонами.':
    {
      uz: 'Xizmatlar, do‘konlar va sayr hududlariga ega ko‘p funksiyali shahar mahallasi.',
      en: 'A mixed-use city neighborhood with services, shops and walking areas.',
    },
  'Тихий жилой комплекс у воды с готовыми предложениями вторичного рынка.': {
    uz: 'Suv bo‘yidagi sokin majmua, tayyor ikkilamchi bozor takliflari bilan.',
    en: 'A quiet waterfront development with ready resale listings.',
  },
  'Закрытый двор': { uz: 'Yopiq hovli', en: 'Private courtyard' },
  'Территория без машин и доступ по карте': {
    uz: 'Avtomobilsiz hudud va karta orqali kirish',
    en: 'Car-free grounds with access by card',
  },
  Видеонаблюдение: { uz: 'Videokuzatuv', en: 'Video surveillance' },
  'Камеры в подъездах и по периметру': {
    uz: 'Kirish joylari va hudud bo‘ylab kameralar',
    en: 'Cameras in entrances and around the perimeter',
  },
  'Детская площадка': { uz: 'Bolalar maydonchasi', en: 'Playground' },
  'Безопасное покрытие и зоны для разных возрастов': {
    uz: 'Xavfsiz qoplama va turli yoshdagilar uchun joylar',
    en: 'Safe surfacing and areas for different ages',
  },
  'Подземный паркинг': {
    uz: 'Yerosti avtoturargohi',
    en: 'Underground parking',
  },
  'Лифт из паркинга на жилые этажи': {
    uz: 'Avtoturargohdan yashash qavatlariga lift',
    en: 'Lift from parking to residential floors',
  },
  'Школа и детский сад': {
    uz: 'Maktab va bolalar bog‘chasi',
    en: 'School and kindergarten',
  },
  'До 15 минут пешком': {
    uz: 'Piyoda 15 daqiqagacha',
    en: 'Within a 15-minute walk',
  },
  Супермаркет: { uz: 'Supermarket', en: 'Supermarket' },
  'Магазины повседневного спроса рядом': {
    uz: 'Kundalik ehtiyoj do‘konlari yaqinida',
    en: 'Everyday shops nearby',
  },
  'Общественный транспорт': { uz: 'Jamoat transporti', en: 'Public transport' },
  'Остановки в пределах 500 метров': {
    uz: 'Bekatlar 500 metr ichida',
    en: 'Stops within 500 meters',
  },
  'Парк и прогулочные зоны': {
    uz: 'Bog‘ va sayr hududlari',
    en: 'Park and walking areas',
  },
  'Благоустроенные маршруты рядом с домом': {
    uz: 'Uy yaqinidagi obodonlashtirilgan yo‘laklar',
    en: 'Landscaped walking routes near home',
  },
  'Разрешение на строительство': {
    uz: 'Qurilish ruxsatnomasi',
    en: 'Construction permit',
  },
  'Проектная декларация': {
    uz: 'Loyiha deklaratsiyasi',
    en: 'Project declaration',
  },
  редакция: { uz: 'tahrir', en: 'revision' },
  'Заключение технической экспертизы': {
    uz: 'Texnik ekspertiza xulosasi',
    en: 'Technical review report',
  },
  'ул.': { uz: 'ko‘chasi', en: 'St.' },
  'просп.': { uz: 'shohko‘chasi', en: 'Ave.' },
  набережная: { uz: 'sohilbo‘yi', en: 'embankment' },
  'Шёлкового пути': { uz: 'Ipak yo‘li', en: 'Silk Road' },
  'Амир Темура': { uz: 'Amir Temur', en: 'Amir Temur' },
  Университетская: { uz: 'Universitet', en: 'University' },
  Афросиаб: { uz: 'Afrosiyob', en: 'Afrasiyob' },
  Зарафшана: { uz: 'Zarafshon', en: 'Zarafshan' },
  'ул. Амир Темура, 142': {
    uz: 'Amir Temur ko‘chasi, 142',
    en: '142 Amir Temur St.',
  },
  'ул. Регистан, 18': { uz: 'Registon ko‘chasi, 18', en: '18 Registan St.' },
  'просп. Шёлкового пути, 27': {
    uz: 'Ipak yo‘li shohko‘chasi, 27',
    en: '27 Silk Road Ave.',
  },
  'ул. Афросиаб, 84': { uz: 'Afrosiyob ko‘chasi, 84', en: '84 Afrasiyob St.' },
  'ул. Университетская, 9': {
    uz: 'Universitet ko‘chasi, 9',
    en: '9 University St.',
  },
  'Конигил, набережная Зарафшана': {
    uz: 'Konigil, Zarafshon sohilbo‘yi',
    en: 'Konigil, Zarafshan Embankment',
  },
  'основное фото': { uz: 'asosiy surat', en: 'main photo' },
  'История стоимости: сейчас': {
    uz: 'Narx tarixi: hozir',
    en: 'Price history: current',
  },
  'в наличии': { uz: 'mavjud', en: 'available' },
  март: { uz: 'mart', en: 'Mar' },
  июнь: { uz: 'iyun', en: 'Jun' },
  сент: { uz: 'sent', en: 'Sep' },
  'г.': { uz: 'y.', en: '' },
  г: { uz: 'y.', en: '' },
  'Двор и территория': { uz: 'Hovli va hudud', en: 'Courtyard and grounds' },
  Звукоизоляция: { uz: 'Ovoz izolyatsiyasi', en: 'Sound insulation' },
  'Управление и сервис': {
    uz: 'Boshqaruv va xizmat',
    en: 'Management and service',
  },
  'Например, 14:16:01:02:1234': {
    uz: 'Masalan, 14:16:01:02:1234',
    en: 'For example, 14:16:01:02:1234',
  },
  'Например, 72': { uz: 'Masalan, 72', en: 'For example, 72' },
  'Настройки интерфейса': {
    uz: 'Interfeys sozlamalari',
    en: 'Interface settings',
  },
  'Не удалось отправить вопрос. Попробуйте ещё раз.': {
    uz: 'Savolni yuborib bo‘lmadi. Qayta urinib ko‘ring.',
    en: 'Could not send your question. Please try again.',
  },
  'Не удалось сохранить': { uz: 'Saqlab bo‘lmadi', en: 'Could not save' },
  'Ошибка отправки': { uz: 'Yuborishda xatolik', en: 'Sending failed' },
  'Проверенные жилые комплексы, реальные цены и запись на просмотр квартир в Самарканде.':
    {
      uz: 'Samarqanddagi tekshirilgan turar joy majmualari, haqiqiy narxlar va kvartiralarni ko‘rishga yozilish.',
      en: 'Verified developments, real prices and apartment viewing requests in Samarkand.',
    },
  'Создание объявления': { uz: 'E’lon yaratish', en: 'Create listing' },
  'Специальное предложение': { uz: 'Maxsus taklif', en: 'Special offer' },
  'Условия просмотра и сделки согласуются с продавцом.': { uz: 'Ko‘rish va bitim shartlari sotuvchi bilan kelishiladi.', en: 'Arrange the viewing and sale terms with the seller.' },
  'Оставьте заявку — застройщик свяжется с вами для консультации.': { uz: 'So‘rov qoldiring — quruvchi maslahat uchun siz bilan bog‘lanadi.', en: 'Send a request and the developer will contact you for a consultation.' },
  'Теперь доступны персональные функции EstateHub. Онлайн-бронирование пока не подключено; для просмотра квартиры свяжитесь с продавцом.': { uz: 'EstateHub shaxsiy funksiyalari mavjud. Onlayn band qilish hali yoqilmagan; kvartirani ko‘rish uchun sotuvchi bilan bog‘laning.', en: 'EstateHub personal features are now available. Online reservations are not enabled yet; contact the seller to arrange a viewing.' },
  'Документы одобрены. Объявление откроется после подтверждения перевода.': { uz: 'Hujjatlar tasdiqlandi. E’lon pul o‘tkazmasi tasdiqlangach ochiladi.', en: 'Documents approved. The listing will go live after the transfer is verified.' },
  'Не удалось отправить номер операции.': { uz: 'Operatsiya raqamini yuborib bo‘lmadi.', en: 'Could not submit the transaction reference.' },
  'Публикация после одобрения': { uz: 'Tasdiqdan keyingi e’lon', en: 'Publication after approval' },
  'Оплатить размещение': { uz: 'E’lon joylash uchun to‘lash', en: 'Pay for publication' },
  'Переведите точную сумму по реквизитам. Номер операции отправьте после перевода — суперадмин сверит поступление по банковской выписке.': { uz: 'Aniq summani rekvizitlarga o‘tkazing. So‘ng operatsiya raqamini yuboring — superadmin tushumni bank ko‘chirmasi bilan solishtiradi.', en: 'Transfer the exact amount to the details shown. Then submit the transaction reference; the superadmin will verify the funds in the bank statement.' },
  'Сумма за': { uz: 'To‘lov miqdori:', en: 'Amount for' },
  дней: { uz: 'kun', en: 'days' },
  'Способ перевода': { uz: 'O‘tkazma usuli', en: 'Transfer method' },
  'Банковский перевод': { uz: 'Bank o‘tkazmasi', en: 'Bank transfer' },
  '· счёт': { uz: '· hisob', en: '· account' },
  'Перевод на карту': { uz: 'Kartaga o‘tkazma', en: 'Card transfer' },
  'Номер банковской операции': { uz: 'Bank operatsiyasi raqami', en: 'Bank transaction reference' },
  'Из чека или выписки': { uz: 'Chek yoki ko‘chirmadan', en: 'From the receipt or statement' },
  'Наличные не принимаются. Отправка номера операции сама по себе не публикует объявление.': { uz: 'Naqd pul qabul qilinmaydi. Operatsiya raqamini yuborishning o‘zi e’lonni chop etmaydi.', en: 'Cash is not accepted. Submitting a transaction reference does not publish the listing.' },
  'Номер перевода получен. Ожидается сверка банковской выписки.': { uz: 'O‘tkazma raqami olindi. Bank ko‘chirmasi tekshirilmoqda.', en: 'Transaction reference received. Awaiting bank statement verification.' },
  'Перевод не подтверждён:': { uz: 'O‘tkazma tasdiqlanmadi:', en: 'Transfer not verified:' },
  'уточните данные и отправьте номер операции повторно': { uz: 'ma’lumotlarni aniqlashtirib, operatsiya raqamini qayta yuboring', en: 'check the details and resubmit the transaction reference' },
  'Реквизиты для перевода пока настраиваются. Объявление остаётся скрытым.': { uz: 'O‘tkazma rekvizitlari sozlanmoqda. E’lon yashirin qoladi.', en: 'Transfer details are being set up. The listing remains hidden.' },
  'Реквизиты для оплаты': { uz: 'To‘lov rekvizitlari', en: 'Payment details' },
  'Продлить переводом': { uz: 'O‘tkazma orqali uzaytirish', en: 'Renew by transfer' },
  'Выберите существующий ЖК, подтвердите право собственности и после одобрения оплатите размещение переводом. Объявление появится в каталоге только после проверки поступления денег.': { uz: 'Mavjud majmuani tanlang, mulk huquqini tasdiqlang va ma’qullangach e’lon joylash uchun pul o‘tkazing. E’lon mablag‘ kelib tushgani tekshirilgandan keyingina katalogda paydo bo‘ladi.', en: 'Choose an existing development, verify ownership, then pay for publication by transfer after approval. The listing appears in the catalog only after the funds are verified.' },
  'Реквизиты для перевода станут доступны после одобрения объявления. Наличные не принимаются.': { uz: 'O‘tkazma rekvizitlari e’lon tasdiqlangach ochiladi. Naqd pul qabul qilinmaydi.', en: 'Transfer details become available after the listing is approved. Cash is not accepted.' },
});

export const buyerPageMessages = {
  uz: Object.fromEntries(
    Object.entries(phrases).map(([key, value]) => [key, value.uz]),
  ) as Record<string, string>,
  en: Object.fromEntries(
    Object.entries(phrases).map(([key, value]) => [key, value.en]),
  ) as Record<string, string>,
};
