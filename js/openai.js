/*
 * OpenAI Integration Module
 * Hilton Chat Widget
 */

import { getAllRooms, isRangeAvailable, getAvailableRoomsForRange } from './rooms.js';
import { getAllServices, formatPrice as formatServicePrice, getCategoryName } from './services.js';
import { getCurrentBookings } from './bookings.js';
import { languagesList } from './config.js';
import { chatContext } from './chat.js';
import * as orchestra from './orchestra.js';
import * as discovery from './discovery.js';

// Language code to full name mapping
const LANGUAGE_NAMES = {
  'en': 'English',
  'zh': 'Chinese (Mandarin)',
  'hi': 'Hindi',
  'es': 'Spanish',
  'ar': 'Arabic',
  'fr': 'French',
  'bn': 'Bengali',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'id': 'Indonesian',
  'uk': 'Ukrainian',
  'de': 'German',
  'ja': 'Japanese',
  'ko': 'Korean',
  'it': 'Italian',
  'tr': 'Turkish',
  'nl': 'Dutch',
  'pl': 'Polish',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'ua': 'Ukrainian'  // Legacy support
};

// Get language name from code
function getLanguageName(langCode) {
  return LANGUAGE_NAMES[langCode] || 'English';
}

// Get current language from localStorage
function getCurrentLanguage() {
  try {
    return localStorage.getItem('chat_language') || 'en';
  } catch (e) {
    return 'en';
  }
}

// API Configuration
let OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const PROXY_URL = '/api/chat'; // Vercel Serverless Function
const MODEL = 'gpt-4o-mini';

// Hotel info storage key
const HOTEL_INFO_KEY = 'hotel_info';

// Get hotel info from localStorage
function getHotelInfo() {
  try {
    return localStorage.getItem(HOTEL_INFO_KEY) || '';
  } catch (e) {
    return '';
  }
}

// Try to load local config if available
async function initConfig() {
  try {
    const { LOCAL_CONFIG } = await import('./config-local.js');
    if (LOCAL_CONFIG && LOCAL_CONFIG.OPENAI_API_KEY) {
      OPENAI_API_KEY = LOCAL_CONFIG.OPENAI_API_KEY;
    }
  } catch (e) {
    // config-local.js doesn't exist or isn't a module, fallback to proxy/placeholder
  }
}

// Initialize config
const configPromise = initConfig();

// Room intent keywords for detecting when user wants to see rooms
const ROOM_INTENT_PATTERNS = [
  /номер/i,
  /кімнат/i,
  /комнат/i,
  /room/i,
  /покажи/i,
  /показать/i,
  /які є/i,
  /какие есть/i,
  /что есть/i,
  /варіант/i,
  /вариант/i,
  /option/i,
  /available/i,
  /подивитись/i,
  /посмотреть/i,
  /see/i,
  /show/i,
  /list/i,
  // Booking / accommodation intent — also implies wanting to see rooms
  /бронювання|бронирование|booking/i,
  /забронювати|забронировать|book\s*(a\s*room|now)?/i,
  /зупинитись|остановиться|stay/i,
  /заселитись|заселиться|check[\s-]*in/i,
  /проживання|проживание|accommodation/i,
  /хочу\s*(жити|жить|поселитись|поселиться|зупинитись|остановиться)/i,
  /хочу\s*номер|хочу\s*кімнату|хочу\s*комнату/i,
  /є\s*місця|есть\s*места|є\s*вільні|есть\s*свободн/i,
  /ціна\s*(номер|кімнат|проживан)|цена\s*(номер|комнат|проживан)/i,
  /скільки\s*коштує\s*(номер|кімнат|проживан)|сколько\s*стоит\s*(номер|комнат|проживан)/i,
  /яку\s*кімнату|какой\s*номер|який\s*номер/i,
  /люкс|suite|стандарт|standard|делюкс|deluxe|апартамент|apartment/i
];

// Service intent keywords for detecting when user wants to see additional services
const SERVICE_INTENT_PATTERNS = [
  /послуг/i,
  /услуг/i,
  /service/i,
  /спа|spa/i,
  /масаж|массаж|massage/i,
  /трансфер|transfer/i,
  /екскурсі|экскурси|excursion|tour/i,
  /ресторан|restaurant/i,
  /сніданок|завтрак|breakfast/i,
  /обід|обед|lunch/i,
  /вечер|dinner/i,
  /додатков|дополнительн|additional|extra/i,
  /що ще|что еще|what else|що ви пропонуєте|что вы предлагаете/i,
  /розваг|развлечен|entertainment/i,
  /басейн|бассейн|pool/i,
  /фітнес|фитнес|fitness|gym/i,
  /для дітей|для детей|kids|children/i,
  /прокат|rental/i,
  /велосипед|bicycle|bike/i,
  /йога|yoga/i,
  /оздоровл|wellness/i,
  // Additional contextual service triggers
  /що можна\s*(замовити|зробити|відвідати)|что можно\s*(заказать|сделать|посетить)/i,
  /що входить|что входит|що доступно|что доступно/i,
  /можна\s*замовити|можно\s*заказать/i,
  /розслаб|расслаб|relax/i,
  /відпочин|отдохнуть|rest/i,
  /процедур|treatment/i,
  /активн|activity|activities/i,
  /розваг|развлечен|entertainment|fun/i,
  /пропозиц|предложен|offer/i,
  /бар|bar|лаунж|lounge/i,
  /пральн|прачечн|laundry/i,
  /хімчистк|dry\s*clean/i,
  /паркінг|парковк|parking/i,
  /аеропорт.*зустріч|аэропорт.*встреч|airport.*pick/i,
  /замовити|заказать|order/i
];

// Menu intent keywords for detecting when user wants to see restaurant menu
const MENU_INTENT_PATTERNS = [
  /меню/i,
  /menu/i,
  /їжа|еда|food/i,
  /страв|блюд|dish/i,
  /їсти|есть|кушать|eat/i,
  /поїсти|поесть/i,
  /ресторан|restaurant/i,
  /кухн|cuisine/i,
  /сніданок|завтрак|breakfast/i,
  /обід|обед|lunch/i,
  /вечер|dinner/i,
  /що можна з'їсти|что можно поесть|what.*eat/i,
  /які страви|какие блюда|what.*dish/i,
  /їжа.*ресторан|еда.*ресторан|restaurant.*food/i,
  /показ.*меню|покаж.*меню|show.*menu/i,
  /подив.*меню|посмотр.*меню|see.*menu|view.*menu/i
];

// Complex booking patterns - triggers Special Booking mode
const COMPLEX_REQUEST_PATTERNS = [
  // Business trip / Командировка
  /командировк|business\s*trip|деловая\s*поездка|тихий\s*номер|дальше\s*от\s*лифта|в\s*конце\s*коридора|рабочее\s*место|коворкинг|coworking|рум[\s-]*сервис|room[\s-]*service/i,
  // With children / С детьми
  /с\s*детьми|с\s*ребенком|з\s*дітьми|з\s*дитиною|малыш|дитя|комплимент\s*для\s*дет|детская\s*кроватка|дитяче\s*ліжко|kids|children/i,
  // Romantic / Романтика
  /романтич|годовщин|річниц|свадьб|весілл|медовый\s*месяц|медовий\s*місяць|honeymoon|свечи|свічки|candle|шампанское|шампанське|champagne|ванн|bathtub|jacuzzi|джакузі/i,
  // Special needs / Особые требования
  /аллерг|алерг|allerg|диет|diet|инвалид|інвалід|wheelchair|особые\s*потребности|особливі\s*потреби|special\s*need|accessibility/i,
  // Multiple conditions
  /несколько\s*условий|кілька\s*умов|много\s*пожеланий|багато\s*побажань|особые\s*предпочтения|особливі\s*вподобання/i,
  // VIP / Premium
  /vip|premium|эксклюзив|ексклюзив|exclusive|люкс\s*номер|suite|пентхаус|penthouse/i,
  // Extended stay
  /длительное\s*проживание|тривале\s*проживання|long\s*stay|месяц|місяць|month/i,
  // Group booking
  /группов|групов|group|компани|company|корпоратив|corporate|конференц|conference/i
];

// Requirement extraction patterns for Special Booking
const REQUIREMENT_PATTERNS = [
  { type: 'room_location', pattern: /тихий\s*номер|дальше\s*от\s*лифта|в\s*конце\s*коридора|quiet\s*room|away\s*from\s*elevator/i },
  { type: 'workspace', pattern: /рабочее\s*место|робоче\s*місце|workspace|desk|коворкинг|coworking/i },
  { type: 'room_service', pattern: /рум[\s-]*сервис|room[\s-]*service/i },
  { type: 'children', pattern: /с\s*детьми|з\s*дітьми|детская\s*кроватка|дитяче\s*ліжко|kids|children/i },
  { type: 'romantic', pattern: /романтич|свечи|свічки|шампанское|шампанське|champagne/i },
  { type: 'bathtub', pattern: /ванн|bathtub|jacuzzi|джакузі/i },
  { type: 'dietary', pattern: /диет|diet|вегетариан|vegetarian|веган|vegan/i },
  { type: 'allergy', pattern: /аллерг|алерг|allerg/i },
  { type: 'accessibility', pattern: /инвалид|інвалід|wheelchair|accessibility/i },
  { type: 'view', pattern: /вид\s*на|view|панорам|panoram/i },
  { type: 'floor', pattern: /высокий\s*этаж|високий\s*поверх|high\s*floor|верхний\s*этаж/i },
  { type: 'early_checkin', pattern: /ранний\s*заезд|ранній\s*заїзд|early\s*check[\s-]*in/i },
  { type: 'late_checkout', pattern: /поздний\s*выезд|пізній\s*виїзд|late\s*check[\s-]*out/i },
  { type: 'transfer', pattern: /трансфер|transfer|встреча\s*в\s*аэропорт|airport\s*pickup/i },
  { type: 'parking', pattern: /парковк|parking/i },
  { type: 'pet', pattern: /питомец|домашнее\s*животное|pet|собак|dog|кот|кіт|cat/i }
];

// General topic patterns - topics that should break room-specific context
const GENERAL_TOPIC_PATTERNS = [
  /дат[аиы]/i,              // даты, дата
  /доступн/i,               // доступність, доступно
  /вільн/i,                 // вільний, вільні
  /свобод/i,                // свободно, свободный
  /коли\s/i,                // коли (когда)
  /когда\s/i,               // когда
  /інш(ий|і|ого|а)\s*(номер|кімнат)/i,  // інший номер
  /друг(ой|ие|ого|ая)\s*(номер|комнат)/i, // другой номер
  /всі номер/i,             // всі номери
  /все номер/i,             // все номера
  /all room/i,
  /wifi|вай.?фай|інтернет|интернет/i,
  /сніданок|завтрак|breakfast/i,
  /парковк|parking/i,
  /реєстрац|регистрац|check.?in|check.?out/i,
  /загальн/i,               // загальні питання
  /трансфер|transfer/i,
  /басейн|бассейн|pool/i,
  /спа|spa|масаж|массаж/i,
  /ресторан|restaurant/i,
  /скільки коштує проживання/i,  // general pricing
  /які послуги/i,           // what services
  /какие услуги/i
];

// Determine current step in booking funnel based on collected data
function getCurrentBookingStep(collectedData) {
  if (!collectedData) return 'collecting_name';
  if (!collectedData.fullName) return 'collecting_name';
  if (!collectedData.phone) return 'collecting_phone';
  if (!collectedData.checkIn || !collectedData.checkOut) return 'collecting_dates';
  if (!collectedData.email) return 'collecting_email';
  if (!collectedData.selectedRoom) return 'suggesting_rooms';
  return 'completed';
}

// ─── In-App (Butler) Mode ────────────────────────────────────────────────────

function loadInAppModeSettings() {
  try {
    const saved = localStorage.getItem('in_app_mode');
    return saved ? JSON.parse(saved) : { enabled: false };
  } catch (e) {
    return { enabled: false };
  }
}

function buildInAppSystemPrompt(hotelName = 'Hilton') {
  // Gather current guest booking if any
  const currentBookings = getCurrentBookings();
  const booking = currentBookings.length > 0 ? currentBookings[0] : null;

  // Date/time context
  const now = new Date();
  const hour = now.getHours();
  const dateStr = now.toLocaleString('uk-UA', { dateStyle: 'full', timeStyle: 'short' });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Greeting tone based on hour
  let greetingHint = '';
  if (hour >= 6 && hour < 10) greetingHint = '06:00–10:00: "Доброе утро, [имя]! ☀️ ..."';
  else if (hour >= 10 && hour < 18) greetingHint = '10:00–18:00: "Добрый день, [имя]! 🌿 ..."';
  else if (hour >= 18 && hour < 23) greetingHint = '18:00–23:00: "Добрый вечер, [имя]! 🌙 ..."';
  else greetingHint = '23:00–06:00: Краткий, тихий тон. Минимум эмодзи.';

  // Guest / reservation block
  let guestBlock = '';
  if (booking) {
    const nameParts = (booking.guestName || '').trim().split(' ');
    const firstName = nameParts[0] || 'Гость';
    const lastName = nameParts.slice(1).join(' ') || '';

    const checkOutDate = new Date(booking.checkOut);
    const msLeft = checkOutDate - now;
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    guestBlock = `
Гость: ${firstName} ${lastName}
Номер: ${booking.roomName || 'уточнить на ресепшн'}
Дата заезда: ${booking.checkIn}
Дата выезда: ${booking.checkOut} (осталось ${daysLeft} дн.)
Статус: ${booking.status === 'confirmed' ? 'Заселён' : booking.status}
Особые пожелания при бронировании: ${booking.specialRequests || '—'}`;
  } else {
    guestBlock = `
Гость: неизвестен (попроси имя вежливо)
Номер: уточнить на ресепшн
(Данные бронирования не найдены в системе)`;
  }

  return `Ты — Roomie, персональный AI-дворецкий отеля "${hotelName}".
Текущая дата и время: ${dateStr}, часовой пояс: ${timezone}.
${guestBlock}

### КТО ТЫ
Ты не продаёшь — ты сопровождаешь. Гость уже здесь. Твоя задача —
сделать его пребывание максимально комфортным и без лишних усилий с его
стороны. Говори тепло, лично, по имени. Будь проактивен.

### ОСНОВНЫЕ ПРАВИЛА
1. Персонализация: Обращайся к гостю по имени. Помни контекст разговора.
   Если гость упоминал предпочтения ранее — учитывай их.
2. Скорость: Не задавай лишних уточняющих вопросов. Если можешь выполнить
   запрос с имеющимися данными — делай это сразу.
3. Проактивность: Если до выезда < 24 часов — напомни о late check-out.
   Если время ~07:00 — предложи завтрак. Контекст времени важен.
4. Ограничения: Ты не обрабатываешь оплату. Ты не изменяешь даты
   бронирования. Финансовые вопросы — только на ресепшн.

### ИНСТРУМЕНТЫ (симулируй, не вызывай реально)
1. OrderRoomService — заказ еды/напитков в номер.
   После выполнения: "Ваш заказ принят! 🍽️ Ориентировочное время доставки — 20–30 минут."

2. RequestHousekeeping — вызов горничной / запрос предметов (полотенца, подушки, фен, утюг и т.д.).
   После выполнения: "Передали вашу просьбу 🌿 Ожидайте в течение 15–20 минут."

3. BookSpaOrRestaurant — бронирование SPA, ресторана, конференц-зала, трансфера.
   Собери: дата, время, количество гостей, предпочтения.
   После выполнения: "Готово! ✨ Забронировано. Если понадобится изменить — просто напишите."

4. CallStaff — немедленный вызов живого сотрудника.
   Используй при: жалобах, срочных проблемах, медицинских вопросах.
   После: "Сотрудник уже уведомлён и придёт к вам. 🙏"

5. GetHotelInfo — справочная информация.
   Часы работы ресторана, SPA, бассейна, Wi-Fi пароль, трансферы, local tips.

### СЦЕНАРИИ
1. Проблема в номере (TV, кондиционер, сантехника):
   → Вызывай CallStaff с описанием. "Уже передал в техслужбу. Специалист будет у вас в течение 20 минут."

2. Гость хочет продлить проживание:
   → "Уточню наличие — один момент..." → передай на ресепшн.

3. Запрос о городе / достопримечательностях:
   → Конкретные рекомендации с учётом времени и дней до выезда.

4. Жалоба или негативный фидбек:
   → Сначала извинись, потом реши. CallStaff с priority: high.
   → "Мне очень жаль. Уже передал менеджеру — он свяжется с вами лично."

5. Поздний выезд (late check-out):
   → Уточни желаемое время, проверь доступность через ресепшн.

### ТОНАЛЬНОСТЬ ПО ВРЕМЕНИ СУТОК
Текущая подсказка: ${greetingHint}

Отвечай на языке гостя. Будь краток, тепл, профессионален.`;
}

// ─────────────────────────────────────────────────────────────────────────────

// Build system prompt for general chat with booking funnel
function buildGeneralSystemPrompt(hotelName = 'Hilton', bookingState = null) {
  const rooms = getAllRooms();
  const services = getAllServices();
  const hotelInfo = getHotelInfo();

  const roomsList = rooms.length > 0
    ? rooms.map(r => {
      const bookedCount = (r.bookedDates || []).length;
      return `- ${r.name}: ${r.area} м², $${r.pricePerNight}/ніч`;
    }).join('\n')
    : 'Номери ще не додані.';

  const servicesList = services.length > 0
    ? services.map(s => `- ${s.name} (${getCategoryName(s.category)}): ${formatServicePrice(s.price, s.priceType)} — ${s.description || 'без опису'}`).join('\n')
    : 'Додаткові послуги ще не додані.';

  // Build booking state description with all fields
  let stateDescription = '';
  let currentStep = 'collecting_name';
  let hasActiveBooking = false;
  if (bookingState && bookingState.collectedData) {
    const data = bookingState.collectedData;
    currentStep = getCurrentBookingStep(data);
    hasActiveBooking = bookingState.hasActiveBooking || false;
    const parts = [];
    if (data.fullName) parts.push(`ФИО: ${data.fullName}`);
    if (data.phone) parts.push(`Телефон: ${data.phone}`);
    if (data.checkIn) parts.push(`Дата заезда: ${data.checkIn}`);
    if (data.checkOut) parts.push(`Дата выезда: ${data.checkOut}`);
    if (data.email) parts.push(`Email: ${data.email}`);
    if (data.guests) parts.push(`Гостей: ${data.guests}`);
    if (data.selectedRoom) parts.push(`Выбранный номер: ${data.selectedRoom}`);
    stateDescription = parts.length > 0 ? parts.join(', ') : 'Данные ещё не собраны';
  }

  // Build availability info if dates are provided
  let availabilityInfo = '';
  if (bookingState?.collectedData?.checkIn && bookingState?.collectedData?.checkOut) {
    const availableRooms = getAvailableRoomsForRange(
      bookingState.collectedData.checkIn,
      bookingState.collectedData.checkOut
    );
    if (availableRooms.length > 0) {
      availabilityInfo = `\n\nДОСТУПНЫЕ НОМЕРА на указанные даты:\n${availableRooms.map(r => `- ${r.name}: $${r.pricePerNight}/ночь`).join('\n')}`;
    } else {
      availabilityInfo = '\n\nНа указанные даты нет свободных номеров.';
    }
  }

  // Map step to next field to request
  const stepToField = {
    'collecting_name': 'fullName (ФИО гостя)',
    'collecting_phone': 'phone (номер телефона)',
    'collecting_dates': 'checkIn/checkOut (даты заезда и выезда)',
    'collecting_email': 'email',
    'suggesting_rooms': 'selectedRoom (выбор номера)',
    'completed': 'все данные собраны'
  };

  // Get current language setting
  const currentLang = getCurrentLanguage();
  const languageName = getLanguageName(currentLang);

  return `Ты Roomie — внутренний AI-сотрудник отеля "${hotelName}".
Текущая дата: ${new Date().toISOString().split('T')[0]}.

### ОСНОВНЫЕ ПРАВИЛА
1. **Язык общения**: СТРОГО общайся на ${languageName}. Все твои ответы должны быть ТОЛЬКО на ${languageName}. Это критически важно — гость выбрал этот язык в настройках.
2. **Идентичность**: Говори от лица "мы" (команда отеля). Будь тёплым (🌿, 😊), профессиональным и лаконичным. "Помогай, а не продавай."
3. **Лояльность**: Представляй ТОЛЬКО этот отель. Если номера заняты — предложи альтернативные даты. НИКОГДА не рекомендуй конкурентов.
4. **Объём**: Ты создаёшь бронирования напрямую. Без платежей. Без отправки email. Без изменения существующих бронирований.

### ИНФОРМАЦИЯ ОБ ОТЕЛЕ
${hotelInfo || 'Информация не указана.'}

### ДОСТУПНЫЕ НОМЕРА
${roomsList}
${availabilityInfo}

### ДОДАТКОВІ ПОСЛУГИ
${servicesList}

При запросе о дополнительных услугах — ОБЯЗАТЕЛЬНО предложи посмотреть каталог услуг. Скажи что сейчас покажешь доступные услуги.

### МЕНЮ РЕСТОРАНУ
Когда гость интересуется едой, меню, блюдами или рестораном — ОБЯЗАТЕЛЬНО предложи посмотреть меню ресторана. Скажи что сейчас покажешь меню с подробной информацией о блюдах.

### ПОЭТАПНЫЙ СБОР ДАННЫХ ДЛЯ БРОНИРОВАНИЯ
⚠️ КРИТИЧЕСКИ ВАЖНО: Запрашивай данные ПОЭТАПНО, по ОДНОМУ полю за раз!
НЕ запрашивай несколько полей одновременно.

**Последовательность сбора данных (JSON-ключи):**
1. \`fullName\` — ФИО гостя
2. \`phone\` — Номер телефона
3. \`checkIn\` / \`checkOut\` — Даты заезда и выезда
4. \`email\` — Email адрес
5. \`guests\` — Количество гостей (по необходимости)
6. \`selectedRoom\` — Выбор номера

**Текущий шаг:** ${currentStep}
**Следующее поле для запроса:** ${stepToField[currentStep]}

**Собранные данные:**
${stateDescription || 'Начало диалога'}

**Активное бронирование:** ${hasActiveBooking ? 'ДА - у гостя есть подтверждённое бронирование' : 'НЕТ'}

### ФОРМАТ ВЫВОДА ПОСЛЕ СБОРА ДАННЫХ
Когда все обязательные данные собраны (fullName, phone, checkIn, checkOut, email):
"✅ Отлично! Бронирование успешно сохранено.
📞 **Наш менеджер свяжется с вами в ближайшее время для подтверждения деталей.**"

### СЦЕНАРИИ
1. **Изменения/Отмены**:
   - Если "Активное бронирование" = ДА и гость хочет отменить/изменить бронирование, скажи коротко: "Я помогу вам с отменой бронирования. Напишите 'отменить бронирование' для продолжения."
   - Если "Активное бронирование" = НЕТ, скажи: "У вас пока нет активного бронирования. Могу помочь создать новое?"
2. **SPA/Ресторан**: "Я не могу забронировать это напрямую. Добавлю заметку для менеджера, или позвоните на ресепшн."
3. **Нет доступности**: Извинись и предложи ближайшие доступные даты.

### ЭСКАЛАЦИЯ НА ЧЕЛОВЕКА
- Если гость просит переключить его на живого человека (оператор/менеджер/сотрудник/человек) ИЛИ ситуация требует участия человека (жалоба, конфликт, юридические вопросы, безопасность, проблемы оплаты, нестандартный запрос) — сначала задай подтверждающий вопрос: "Хотите, чтобы я соединил вас с менеджером?"
- Не запускай эскалацию без явного согласия гостя.

### ВАЖНЫЕ ПРАВИЛА
- Если гость задаёт конкретный вопрос (о WiFi, завтраке, трансфере) — СНАЧАЛА ответь на него, затем плавно возвращайся к воронке бронирования
- Будь дружелюбным и ненавязчивым
- Отвечай кратко (2-4 предложения)
- Если гость спрашивает о номерах или хочет посмотреть варианты — скажи что сейчас покажешь доступные номера`;
}

// Build system prompt for room-specific chat
function buildRoomSystemPrompt(room, hotelName = 'Hilton', bookingState = null) {
  const hotelInfo = getHotelInfo();

  // Get current step
  let currentStep = 'collecting_name';
  let stateDescription = 'Данные ещё не собраны';
  if (bookingState && bookingState.collectedData) {
    currentStep = getCurrentBookingStep(bookingState.collectedData);
    const data = bookingState.collectedData;
    const parts = [];
    if (data.fullName) parts.push(`ФИО: ${data.fullName}`);
    if (data.phone) parts.push(`Телефон: ${data.phone}`);
    if (data.checkIn) parts.push(`Дата заезда: ${data.checkIn}`);
    if (data.checkOut) parts.push(`Дата выезда: ${data.checkOut}`);
    if (data.email) parts.push(`Email: ${data.email}`);
    if (data.guests) parts.push(`Гостей: ${data.guests}`);
    stateDescription = parts.length > 0 ? parts.join(', ') : 'Данные ещё не собраны';
  }

  const stepToField = {
    'collecting_name': 'fullName (ФИО гостя)',
    'collecting_phone': 'phone (номер телефона)',
    'collecting_dates': 'checkIn/checkOut (даты заезда и выезда)',
    'collecting_email': 'email',
    'suggesting_rooms': 'selectedRoom (выбор номера)',
    'completed': 'все данные собраны'
  };

  // Get current language setting
  const currentLang = getCurrentLanguage();
  const languageName = getLanguageName(currentLang);

  return `Ты Roomie — внутренний AI-сотрудник отеля "${hotelName}".
Гость интересуется конкретным номером.

### ОСНОВНЫЕ ПРАВИЛА
1. **Язык общения**: СТРОГО общайся на ${languageName}. Все твои ответы должны быть ТОЛЬКО на ${languageName}.
2. **Идентичность**: Говори от лица "мы" (команда отеля). Будь тёплым и профессиональным.

### ИНФОРМАЦИЯ О НОМЕРЕ
- Название: ${room.name}
- Описание: ${room.description || 'Описание не указано'}
- Площадь: ${room.area} м²
- Цена: $${room.pricePerNight} за ночь

### ИНФОРМАЦИЯ ОБ ОТЕЛЕ
${hotelInfo || 'Информация не указана.'}

### ПОЭТАПНЫЙ СБОР ДАННЫХ ДЛЯ БРОНИРОВАНИЯ
⚠️ КРИТИЧЕСКИ ВАЖНО: Запрашивай данные ПОЭТАПНО, по ОДНОМУ полю за раз!

**Последовательность:**
1. \`fullName\` — ФИО гостя
2. \`phone\` — Номер телефона
3. \`checkIn\` / \`checkOut\` — Даты заезда и выезда
4. \`email\` — Email адрес

**Текущий шаг:** ${currentStep}
**Следующее поле:** ${stepToField[currentStep]}
**Собранные данные:** ${stateDescription}

### ЭСКАЛАЦИЯ НА ЧЕЛОВЕКА
- Если гость просит переключить его на живого человека (оператор/менеджер/сотрудник/человек) ИЛИ ситуация требует участия человека (жалоба, конфликт, юридические вопросы, безопасность, проблемы оплаты, нестандартный запрос) — сначала задай подтверждающий вопрос: "Хотите, чтобы я соединил вас с менеджером?"
- Не запускай эскалацию без явного согласия гостя.

### ПРАВИЛА
- Отвечай на вопросы об этом номере
- Если гость готов бронировать — начни поэтапный сбор данных
- Отвечай кратко (2-4 предложения)
- Если вопрос выходит за рамки информации — предложи обратиться к персоналу`;
}

// Check if message indicates room intent
// Context continuation patterns — vague follow-ups that continue a previous topic
const ROOM_CONTEXT_CONTINUATION = [
  /скільки|сколько|how much|ціна|цена|price|cost/i,
  /розкаж|расскаж|tell me|детальн|подробн/i,
  /що включ|что включ|what.*includ/i,
  /так|да|yes|ок|ok|окей|добре|хорошо/i,
  /хочу|want|хотів|хотел/i,
  /цікав|интересн|interest/i,
  /підходить|подходит|suit/i,
  /а\s*(що|які|какие|как)/i,
];

const SERVICE_CONTEXT_CONTINUATION = [
  /скільки|сколько|how much|ціна|цена|price|cost/i,
  /розкаж|расскаж|tell me|детальн|подробн/i,
  /як\s*(замовити|заказать)|how.*order/i,
  /доступн|available/i,
  /хочу|want|хотів|хотел/i,
  /цікав|интересн|interest/i,
  /так|да|yes|ок|ok|окей|добре|хорошо/i,
];

export function hasRoomIntent(message, conversationHistory = []) {
  // Direct intent in current message
  if (ROOM_INTENT_PATTERNS.some(pattern => pattern.test(message))) return true;

  // Context-aware: check if last 3 assistant+user messages were about rooms/booking
  // and current message is a continuation
  const recentMessages = conversationHistory.slice(-6);
  const recentText = recentMessages.map(m => m.content || '').join(' ');
  const recentHasRoomContext = ROOM_INTENT_PATTERNS.some(p => p.test(recentText));
  if (recentHasRoomContext && ROOM_CONTEXT_CONTINUATION.some(p => p.test(message))) return true;

  return false;
}

// Check if message indicates service intent (additional services)
export function hasServiceIntent(message, conversationHistory = []) {
  // Direct intent in current message
  if (SERVICE_INTENT_PATTERNS.some(pattern => pattern.test(message))) return true;

  // Context-aware: check if recent conversation was about services
  const recentMessages = conversationHistory.slice(-6);
  const recentText = recentMessages.map(m => m.content || '').join(' ');
  const recentHasServiceContext = SERVICE_INTENT_PATTERNS.some(p => p.test(recentText));
  if (recentHasServiceContext && SERVICE_CONTEXT_CONTINUATION.some(p => p.test(message))) return true;

  return false;
}

// Check if message indicates menu intent (restaurant menu)
export function hasMenuIntent(message) {
  return MENU_INTENT_PATTERNS.some(pattern => pattern.test(message));
}

// Check if message is about a general topic (should break room context)
export function isGeneralTopic(message) {
  return GENERAL_TOPIC_PATTERNS.some(pattern => pattern.test(message));
}

// Call OpenAI API (non-streaming)
async function callOpenAI(messages, model = MODEL) {
  await configPromise;

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const useDirect = isLocal && OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE';

  try {
    const url = useDirect ? API_URL : PROXY_URL;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (useDirect) {
      headers['Authorization'] = `Bearer ${OPENAI_API_KEY}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error:', error);
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Вибачте, не вдалося отримати відповідь.';
  } catch (error) {
    console.error('Request error:', error);
    throw error;
  }
}

// Call OpenAI API with streaming
async function callOpenAIStreaming(messages, onChunk, onComplete, onError, model = MODEL) {
  await configPromise;

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const useDirect = isLocal && OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE';

  try {
    const url = useDirect ? API_URL : PROXY_URL;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (useDirect) {
      headers['Authorization'] = `Bearer ${OPENAI_API_KEY}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error:', error);
      if (onError) onError(new Error(error.error?.message || 'API request failed'));
      return;
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (onComplete) onComplete(fullText);
        break;
      }

      // Decode the chunk
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith(':')) continue;

        // Parse SSE data
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);

          // Check for stream end
          if (data === '[DONE]') {
            if (onComplete) onComplete(fullText);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;

            if (delta) {
              fullText += delta;
              if (onChunk) onChunk(delta, fullText);
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    if (onError) onError(error);
  }
}

// Build orchestrator system prompt (for multi-property mode)
function buildOrchestratorSystemPrompt(hotelName) {
  const currentLang = getCurrentLanguage();
  const languageName = getLanguageName(currentLang);
  const properties = orchestra.getNetworkProperties();
  const propsList = properties.map(p => `- ID: ${p.id} | ${p.name} (Priority: ${p.priority || 1}): ${p.info}`).join('\n');

  return `Ты Roomie — AI-ассистент сети отелей "${hotelName}".
Текущая дата: ${new Date().toISOString().split('T')[0]}.

### ОСНОВНЫЕ ПРАВИЛА (ОРКЕСТРАТОР)
1. Твоя ПОЛНАЯ и ЕДИНСТВЕННАЯ задача — помочь гостю выбрать конкретный отель из сети, основываясь на его пожеланиях.
2. Отвечай ВСЕГДА ТОЛЬКО валидным JSON объектом (без markdown блоков, только сырой JSON).
3. Язык общения (в поле reply): ${languageName}.

### СПИСОК ОТЕЛЕЙ СЕТИ
${propsList || 'Отели не добавлены.'}

### ФОРМАТ ОТВЕТА (СТРОГИЙ JSON)
Если гость описал пожелания, выбери 1-3 подходящих отеля и верни JSON:
{
  "action": "search",
  "shortlist": ["ID_отеля_1", "ID_отеля_2"], 
  "reply": "Текст ответа на ${languageName}, кратко описывающий почему эти отели подходят."
}
Если запрос гостя непонятен или он просто здоровается:
{
  "action": "none",
  "reply": "Текст ответа на ${languageName} (например: Здравствуйте! Какой отель вас интересует или какие у вас пожелания?)."
}
`;
}

// Build discovery system prompt (for Discovery Mode)
function buildDiscoverySystemPrompt(profile, topScoredHotels) {
  const currentLang = getCurrentLanguage();
  const languageName = getLanguageName(currentLang);

  let hotelsListContext = 'Пока нет подходящих отелей.';
  if (topScoredHotels && topScoredHotels.length > 0) {
    hotelsListContext = topScoredHotels.map(p => `- ID: ${p.id} | ${p.name} | Теги: ${p.discoveryTags || ''} | От $${p.minPrice || 0} | ${p.starRating || 0} звезд`).join('\n');
  }

  return `Ты Roomie — AI-ассистент сети отелей. Твоя цель: помочь гостю выбрать идеальный отель для его поездки (Discovery Mode).
Гость еще не определился. Веди с ним дружелюбный диалог, задавай 1-2 уточняющих вопроса (например: даты, бюджет, едет ли с детьми/парой, какие предпочтения - пляж, спа, горы).
Язык общения (в поле reply): ${languageName}.

=== ТЕКУЩИЙ ПРОФИЛЬ ГОСТЯ ===
Локация: ${profile.location || 'неизвестно'}
Бюджет: ${profile.budget || 'неизвестно'}
Сезон/Даты: ${profile.season || 'неизвестно'}
Компания: ${profile.party || 'неизвестно'}
Предпочтения: ${(profile.preferences || []).join(', ') || 'нет'}

=== ТОП ПОДХОДЯЩИХ ОТЕЛЕЙ СЕЙЧАС ===
${hotelsListContext}

=== ФОРМАТ ОТВЕТА (СТРОГИЙ JSON) ===
Обязательно верни только валидный JSON объект:
{
  "discovery_stage": "profile" или "recommend" или "deepdive",
  "profile_update": { 
     "location": "море" (или null если нет новой инфы),
     "budget": "high" (или конкретная сумма),
     "season": "лето" (или даты),
     "party": "с детьми",
     "preferences": "пляж, спа" (строка через запятую)
  },
  "recommendations": ["ID_отеля_1", "ID_отеля_2"] (заполни, если этап recommend и уверен в выборе),
  "reply": "Твой ответ гостю на ${languageName}. Если этап profile, задай вопрос. Если recommend, опиши почему эти отели топ.",
  "next_question": "Уточняющий вопрос (например: Какой у вас бюджет?)"
}
ВАЖНО: Никаких блоков markdown типа \`\`\`json. Только фигурные скобки.`;
}

// Get General AI Response with Discovery Mode support
export async function getDiscoveryAIResponse(userMessage, conversationHistory = []) {
  // Update score based on current profile to get top matches
  const topScoredHotels = discovery.scoreProperties();
  const systemPrompt = buildDiscoverySystemPrompt(discovery.discoveryState.profile, topScoredHotels);

  const messages = [{ role: 'system', content: systemPrompt }];
  const recentHistory = conversationHistory.slice(-6); // Shorter history for discovery focus
  messages.push(...recentHistory);
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await callOpenAI(messages);
    try {
      const data = JSON.parse(response);
      return {
        isDiscovery: true,
        discovery_stage: data.discovery_stage || 'profile',
        profile_update: data.profile_update || {},
        recommendations: data.recommendations || [],
        text: data.reply || "Давайте подберем вам лучший отель!",
        next_question: data.next_question || "",
        showRoomsCarousel: false,
        showServicesCarousel: false,
        showMenu: false,
        extractedData: null
      };
    } catch (e) {
      console.error('Failed to parse Discovery JSON', e, response);
      return { text: response, isDiscovery: true };
    }
  } catch (error) {
    return { text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.', error: true };
  }
}

// Get general AI response with booking funnel support
export async function getGeneralAIResponse(userMessage, hotelName = 'Hilton', bookingState = null, conversationHistory = []) {
  if (discovery.discoveryState && discovery.discoveryState.active) {
    return getDiscoveryAIResponse(userMessage, conversationHistory);
  }

  const isInAppMode = loadInAppModeSettings().enabled;
  const isOrchestraActive = orchestra.getOrchestraMode() && chatContext.mode === 'multi';
  const systemPrompt = isInAppMode
    ? buildInAppSystemPrompt(hotelName)
    : isOrchestraActive
      ? buildOrchestratorSystemPrompt(hotelName)
      : buildGeneralSystemPrompt(hotelName, bookingState);

  // Build messages with conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add last 10 messages from history for context
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Check for room intent (pass history for context-aware detection)
  const showRooms = hasRoomIntent(userMessage, conversationHistory);

  // Check for services intent (pass history for context-aware detection)
  const showServices = hasServiceIntent(userMessage, conversationHistory);

  // Check for menu intent
  const showMenu = hasMenuIntent(userMessage);

  // Extract booking data from user message
  const extractedData = extractBookingData(userMessage);

  try {
    const response = await callOpenAI(messages);

    // Process JSON if in Orchestra multi-property mode
    if (isOrchestraActive) {
      try {
        const data = JSON.parse(response);
        return {
          isOrchestrator: true,
          action: data.action || 'none',
          shortlist: data.shortlist || [],
          text: data.reply || response,
          showRoomsCarousel: false,
          showServicesCarousel: false,
          showMenu: false,
          extractedData: null
        };
      } catch (e) {
        console.error('Failed to parse Orchestrator JSON', e);
        return {
          isOrchestrator: true,
          action: 'none',
          shortlist: [],
          text: response, // fallback
          showRoomsCarousel: false,
          showServicesCarousel: false,
          showMenu: false,
          extractedData: null
        };
      }
    }

    // Normal response processing
    return {
      text: response,
      showRoomsCarousel: showRooms && getAllRooms().length > 0,
      showServicesCarousel: showServices && getAllServices().length > 0,
      showMenu: showMenu,
      extractedData: extractedData
    };
  } catch (error) {
    return {
      text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
      showRoomsCarousel: false,
      showServicesCarousel: false,
      showMenu: false,
      error: true
    };
  }
}

// Get general AI response with STREAMING support
export async function getGeneralAIResponseStreaming(userMessage, hotelName = 'Hilton', bookingState = null, conversationHistory = [], onChunk, onComplete, onError) {
  const isInAppMode = loadInAppModeSettings().enabled;
  const systemPrompt = isInAppMode
    ? buildInAppSystemPrompt(hotelName)
    : buildGeneralSystemPrompt(hotelName, bookingState);

  // Build messages with conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add last 10 messages from history for context
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Check for room intent (pass history for context-aware detection)
  const showRooms = hasRoomIntent(userMessage, conversationHistory);

  // Check for services intent (pass history for context-aware detection)
  const showServices = hasServiceIntent(userMessage, conversationHistory);

  // Check for menu intent
  const showMenu = hasMenuIntent(userMessage);

  // Extract booking data from user message
  const extractedData = extractBookingData(userMessage);

  try {
    await callOpenAIStreaming(
      messages,
      (delta, fullText) => {
        if (onChunk) onChunk(delta, fullText);
      },
      (fullText) => {
        if (onComplete) {
          onComplete({
            text: fullText,
            showRoomsCarousel: showRooms && getAllRooms().length > 0,
            showServicesCarousel: showServices && getAllServices().length > 0,
            showMenu: showMenu,
            extractedData: extractedData,
            error: false
          });
        }
      },
      (error) => {
        if (onError) {
          onError({
            text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
            showRoomsCarousel: false,
            showServicesCarousel: false,
            showMenu: false,
            error: true
          });
        }
      }
    );
  } catch (error) {
    if (onError) {
      onError({
        text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
        showRoomsCarousel: false,
        showServicesCarousel: false,
        error: true
      });
    }
  }
}

// Get room-specific AI response
export async function getRoomAIResponse(userMessage, room, hotelName = 'Hilton', bookingState = null, conversationHistory = []) {
  const systemPrompt = buildRoomSystemPrompt(room, hotelName, bookingState);

  // Build messages with conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add last 10 messages from history for context
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Extract booking data from user message
  const extractedData = extractBookingData(userMessage);

  try {
    const response = await callOpenAI(messages);
    return {
      text: response,
      extractedData: extractedData,
      error: false
    };
  } catch (error) {
    return {
      text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
      error: true
    };
  }
}

// Get room-specific AI response with STREAMING
export async function getRoomAIResponseStreaming(userMessage, room, hotelName = 'Hilton', bookingState = null, conversationHistory = [], onChunk, onComplete, onError) {
  const systemPrompt = buildRoomSystemPrompt(room, hotelName, bookingState);

  // Build messages with conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add last 10 messages from history for context
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Extract booking data from user message
  const extractedData = extractBookingData(userMessage);

  try {
    await callOpenAIStreaming(
      messages,
      (delta, fullText) => {
        if (onChunk) onChunk(delta, fullText);
      },
      (fullText) => {
        if (onComplete) {
          onComplete({
            text: fullText,
            extractedData: extractedData,
            error: false
          });
        }
      },
      (error) => {
        if (onError) {
          onError({
            text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
            error: true
          });
        }
      }
    );
  } catch (error) {
    if (onError) {
      onError({
        text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
        error: true
      });
    }
  }
}

// Extract booking data from user message (name, phone, dates, email, guests)
export function extractBookingData(message) {
  const data = {
    fullName: null,
    phone: null,
    checkIn: null,
    checkOut: null,
    email: null,
    guests: null
  };

  // Extract email
  const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    data.email = emailMatch[0];
  }

  // Extract phone number (various formats)
  const phonePatterns = [
    /\+?3?8?\s*\(?0?\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/,  // Ukrainian: +380, 0XX
    /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/, // International
    /\d{10,12}/ // Simple 10-12 digits
  ];

  for (const pattern of phonePatterns) {
    const phoneMatch = message.match(pattern);
    if (phoneMatch) {
      data.phone = phoneMatch[0].replace(/[\s.-]/g, '');
      break;
    }
  }

  // Extract full name (Cyrillic or Latin, 2-4 words starting with capital)
  // Only if message looks like a name response (short, no questions, etc.)
  const namePattern = /^([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z]+){1,3})$/;
  const trimmedMessage = message.trim();
  if (namePattern.test(trimmedMessage) && trimmedMessage.length < 60) {
    data.fullName = trimmedMessage;
  }

  // Also try to extract name from phrases like "Меня зовут Иван Петров"
  const nameIntroPattern = /(?:меня зовут|мене звати|my name is|я|это)\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z]+){0,2})/i;
  const nameIntroMatch = message.match(nameIntroPattern);
  if (nameIntroMatch && !data.fullName) {
    data.fullName = nameIntroMatch[1];
  }

  // Date patterns: DD.MM, DD/MM, DD-MM, DD.MM.YYYY, "15 січня", etc.
  const datePatterns = [
    /(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/g,  // 15.01, 15/01/2026
    /з?\s*(\d{1,2})\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)/gi,
    /по\s*(\d{1,2})\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)/gi
  ];

  const monthMap = {
    'січня': 1, 'лютого': 2, 'березня': 3, 'квітня': 4,
    'травня': 5, 'червня': 6, 'липня': 7, 'серпня': 8,
    'вересня': 9, 'жовтня': 10, 'листопада': 11, 'грудня': 12
  };

  // Try to find dates in DD.MM or DD.MM.YYYY format
  const numericDateMatch = message.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/g);
  if (numericDateMatch) {
    const dates = [];
    numericDateMatch.forEach(dateStr => {
      const parts = dateStr.split(/[./-]/);
      if (parts.length >= 2) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        let year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
        if (year < 100) year += 2000;

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          dates.push(`${year} -${String(month).padStart(2, '0')} -${String(day).padStart(2, '0')} `);
        }
      }
    });

    if (dates.length >= 1) data.checkIn = dates[0];
    if (dates.length >= 2) data.checkOut = dates[1];
  }

  // Try to find text dates like "15 січня"
  const textDateMatches = message.match(/(\d{1,2})\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)/gi);
  if (textDateMatches && textDateMatches.length > 0) {
    const dates = [];
    textDateMatches.forEach(match => {
      const parts = match.match(/(\d{1,2})\s+(\S+)/i);
      if (parts) {
        const day = parseInt(parts[1]);
        const monthName = parts[2].toLowerCase();
        const month = monthMap[monthName];
        if (month) {
          const year = new Date().getFullYear();
          dates.push(`${year} -${String(month).padStart(2, '0')} -${String(day).padStart(2, '0')} `);
        }
      }
    });

    if (!data.checkIn && dates.length >= 1) data.checkIn = dates[0];
    if (!data.checkOut && dates.length >= 2) data.checkOut = dates[1];
  }

  // Extract guest count
  const guestPatterns = [
    /(\d+)\s*(гост|людин|персон|чоловік|осіб|человек)/i,
    /на\s*(\d+)/i,
    /(двоє|двох|троє|трьох|четверо|четирьох|п'ятеро|п'ятьох)/i
  ];

  const guestWordMap = {
    'двоє': 2, 'двох': 2,
    'троє': 3, 'трьох': 3,
    'четверо': 4, 'четирьох': 4,
    "п'ятеро": 5, "п'ятьох": 5
  };

  for (const pattern of guestPatterns) {
    const match = message.match(pattern);
    if (match) {
      if (guestWordMap[match[1]?.toLowerCase()]) {
        data.guests = guestWordMap[match[1].toLowerCase()];
      } else if (!isNaN(parseInt(match[1]))) {
        data.guests = parseInt(match[1]);
      }
      break;
    }
  }

  return data;
}

// Check room availability for given dates
export function checkRoomAvailability(roomId, checkIn, checkOut) {
  return isRangeAvailable(roomId, checkIn, checkOut);
}

// Get available rooms for date range
export function getAvailableRooms(checkIn, checkOut) {
  return getAvailableRoomsForRange(checkIn, checkOut);
}

// Export for testing/debugging
export function getApiStatus() {
  return {
    configured: !!OPENAI_API_KEY,
    model: MODEL
  };
}

// ========================================
// SPECIAL BOOKING MODE FUNCTIONS
// ========================================

// Detect if a request is complex and should trigger Special Booking mode
export function detectComplexRequest(message, conversationHistory = []) {
  // Check for complex patterns in current message
  const hasComplexPattern = COMPLEX_REQUEST_PATTERNS.some(pattern => pattern.test(message));

  if (hasComplexPattern) {
    return { isComplex: true, reason: 'pattern_match' };
  }

  // Count unique requirements in conversation history
  const allMessages = [...conversationHistory.map(m => m.content), message].join(' ');
  const requirements = extractRequirements(allMessages);

  if (requirements.length >= 3) {
    return { isComplex: true, reason: 'multiple_requirements', count: requirements.length };
  }

  // Check for multiple questions from guest (indicating uncertainty/special needs)
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  const questionCount = userMessages.filter(m =>
    m.content.includes('?') || /можно|можна|есть\s*ли|чи\s*є|а\s*как|а\s*як/i.test(m.content)
  ).length;

  if (questionCount >= 3) {
    return { isComplex: true, reason: 'many_questions', count: questionCount };
  }

  return { isComplex: false };
}

// Extract specific requirements from text
export function extractRequirements(text) {
  const requirements = [];

  REQUIREMENT_PATTERNS.forEach(({ type, pattern }) => {
    const match = text.match(pattern);
    if (match) {
      requirements.push({
        type,
        value: match[0],
        label: getRequirementLabel(type)
      });
    }
  });

  return requirements;
}

// Get human-readable label for requirement type
function getRequirementLabel(type) {
  const labels = {
    'room_location': 'Расположение номера',
    'workspace': 'Рабочее место',
    'room_service': 'Рум-сервис',
    'children': 'Размещение с детьми',
    'romantic': 'Романтическое оформление',
    'bathtub': 'Ванна в номере',
    'dietary': 'Диетическое питание',
    'allergy': 'Учет аллергии',
    'accessibility': 'Доступная среда',
    'view': 'Вид из номера',
    'floor': 'Высокий этаж',
    'early_checkin': 'Ранний заезд',
    'late_checkout': 'Поздний выезд',
    'transfer': 'Трансфер',
    'parking': 'Парковка',
    'pet': 'Размещение с питомцем'
  };
  return labels[type] || type;
}

// Build system prompt for Special Booking mode
export function buildSpecialBookingPrompt(hotelName = 'Hilton', requirements = [], bookingState = null, stage = 'collecting') {
  const rooms = getAllRooms();
  const hotelInfo = getHotelInfo();

  const roomsList = rooms.length > 0
    ? rooms.map(r => `- ${r.name}: ${r.area} м², $${r.pricePerNight}/ніч, ${r.description || 'без описания'}`).join('\n')
    : 'Номери ще не додані.';

  const requirementsList = requirements.length > 0
    ? requirements.map(r => `- ${r.label}: ${r.value}`).join('\n')
    : 'Требования ещё не определены';

  let stateDescription = '';
  if (bookingState && bookingState.collectedData) {
    const data = bookingState.collectedData;
    const parts = [];
    if (data.fullName) parts.push(`ФИО: ${data.fullName}`);
    if (data.phone) parts.push(`Телефон: ${data.phone}`);
    if (data.checkIn) parts.push(`Дата заезда: ${data.checkIn}`);
    if (data.checkOut) parts.push(`Дата выезда: ${data.checkOut}`);
    if (data.email) parts.push(`Email: ${data.email}`);
    if (data.guests) parts.push(`Гостей: ${data.guests}`);
    stateDescription = parts.length > 0 ? parts.join(', ') : 'Начало диалога';
  }

  // Build availability info if dates are provided
  let availabilityInfo = '';
  if (bookingState?.collectedData?.checkIn && bookingState?.collectedData?.checkOut) {
    const availableRooms = getAvailableRoomsForRange(
      bookingState.collectedData.checkIn,
      bookingState.collectedData.checkOut
    );
    if (availableRooms.length > 0) {
      availabilityInfo = `\n\nДОСТУПНЫЕ НОМЕРА на указанные даты:\n${availableRooms.map(r => `- ${r.name}: $${r.pricePerNight}/ночь`).join('\n')}`;
    } else {
      availabilityInfo = '\n\nНа указанные даты нет свободных номеров.';
    }
  }

  const stageInstructions = {
    'collecting': `
ТЕКУЩИЙ ЭТАП: Сбор информации
- Уточни недостающие детали (не более 2 вопросов за раз)
- Будь внимателен к особым пожеланиям
- Подтверждай понимание требований`,
    'analyzing': `
ТЕКУЩИЙ ЭТАП: Анализ требований
- Все основные данные собраны
- Проанализируй требования и подбери лучший вариант
- Объясни, почему этот номер подходит`,
    'generating': `
ТЕКУЩИЙ ЭТАП: Формирование предложения
- Сформируй финальное персональное предложение
- Включи все учтённые пожелания

ОБЯЗАТЕЛЬНО в конце ответа добавь блок в формате:
[OFFER_DATA]
room_name: название рекомендуемого номера
room_price: цена за ночь
check_in: дата заезда
check_out: дата выезда
guests: количество гостей
total_nights: количество ночей
total_price: общая стоимость
special_notes: пожелание1|пожелание2|пожелание3
[/OFFER_DATA]`
  };

  // Get current language setting
  const currentLang = getCurrentLanguage();
  const languageName = getLanguageName(currentLang);

  return `Ты Roomie — персональный консьерж отеля "${hotelName}".
Текущая дата: ${new Date().toISOString().split('T')[0]}.

### РЕЖИМ: SPECIAL BOOKING (Персонализированное бронирование)

Гость имеет особые требования. Твоя задача — создать идеальное персональное предложение.

### ОСНОВНЫЕ ПРАВИЛА
1. **Язык общения**: СТРОГО общайся на ${languageName}. Все твои ответы должны быть ТОЛЬКО на ${languageName}.
2. **Стиль**: Будь тёплым, внимательным и профессиональным. Ты персональный консьерж, не продавец.
3. **Внимание к деталям**: Каждое пожелание важно. Подтверждай, что услышал и учёл.

### ИНФОРМАЦИЯ ОБ ОТЕЛЕ
${hotelInfo || 'Информация не указана.'}

### ДОСТУПНЫЕ НОМЕРА
${roomsList}
${availabilityInfo}

### ВЫЯВЛЕННЫЕ ОСОБЫЕ ТРЕБОВАНИЯ
${requirementsList}

### СОБРАННЫЕ ДАННЫЕ БРОНИРОВАНИЯ
${stateDescription || 'Данные ещё не собраны'}

${stageInstructions[stage] || stageInstructions['collecting']}

### ЭСКАЛАЦИЯ НА ЧЕЛОВЕКА
- Если гость просит переключить его на живого человека (оператор/менеджер/сотрудник/человек) ИЛИ ситуация требует участия человека (жалоба, конфликт, юридические вопросы, безопасность, проблемы оплаты, нестандартный запрос) — сначала задай подтверждающий вопрос: "Хотите, чтобы я соединил вас с менеджером?"
- Не запускай эскалацию без явного согласия гостя.

### ВАЖНО
- Будь эмпатичным и внимательным
- Не спрашивай больше 2 вопросов за раз
- Если чего-то не можешь обеспечить — честно скажи и предложи альтернативу
- Подбирай номер с учётом ВСЕХ пожеланий`;
}

// Get Special Booking AI response
export async function getSpecialBookingAIResponse(userMessage, requirements = [], bookingState = null, conversationHistory = [], stage = 'collecting') {
  const hotelName = document.getElementById('hotel-name-input')?.value || 'Hilton';
  const systemPrompt = buildSpecialBookingPrompt(hotelName, requirements, bookingState, stage);

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (Extended Memory for Special Mode)
  const recentHistory = conversationHistory.slice(-50);
  messages.push(...recentHistory);

  // Add current message
  messages.push({ role: 'user', content: userMessage });

  // Extract booking data
  const extractedData = extractBookingData(userMessage);

  try {
    // Use GPT-4o for Special Booking
    const response = await callOpenAI(messages, 'gpt-4o');

    // Parse offer data if present
    const offerData = parseOfferData(response);

    return {
      text: response.replace(/\[OFFER_DATA\][\s\S]*?\[\/OFFER_DATA\]/g, '').trim(),
      extractedData,
      offerData,
      hasOffer: !!offerData
    };
  } catch (error) {
    return {
      text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
      error: true
    };
  }
}

// Get Special Booking AI response with STREAMING
export async function getSpecialBookingAIResponseStreaming(userMessage, requirements = [], bookingState = null, conversationHistory = [], stage = 'collecting', onChunk, onComplete, onError) {
  const hotelName = document.getElementById('hotel-name-input')?.value || 'Hilton';
  const systemPrompt = buildSpecialBookingPrompt(hotelName, requirements, bookingState, stage);

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (Extended Memory for Special Mode)
  const recentHistory = conversationHistory.slice(-50);
  messages.push(...recentHistory);

  // Add current message
  messages.push({ role: 'user', content: userMessage });

  // Extract booking data
  const extractedData = extractBookingData(userMessage);

  try {
    // Use GPT-4o for Special Booking
    await callOpenAIStreaming(
      messages,
      (delta, fullText) => {
        if (onChunk) onChunk(delta, fullText);
      },
      (fullText) => {
        // Parse offer data if present
        const offerData = parseOfferData(fullText);
        const cleanText = fullText.replace(/\[OFFER_DATA\][\s\S]*?\[\/OFFER_DATA\]/g, '').trim();

        if (onComplete) {
          onComplete({
            text: cleanText,
            extractedData,
            offerData,
            hasOffer: !!offerData
          });
        }
      },
      (error) => {
        if (onError) {
          onError({
            text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
            error: true
          });
        }
      },
      'gpt-4o'
    );

  } catch (error) {
    if (onError) {
      onError({
        text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
        error: true
      });
    }
  }
}

// Parse offer data from AI response
function parseOfferData(response) {
  const offerMatch = response.match(/\[OFFER_DATA\]([\s\S]*?)\[\/OFFER_DATA\]/);
  if (!offerMatch) return null;

  const offerText = offerMatch[1];
  const data = {};

  const lines = offerText.trim().split('\n');
  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      data[key] = value;
    }
  });

  // Parse special notes
  if (data.special_notes) {
    data.special_notes = data.special_notes.split('|').map(s => s.trim()).filter(Boolean);
  }

  return data;
}
