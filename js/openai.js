/*
 * OpenAI Integration Module
 * Hilton Chat Widget
 */

import { getAllRooms, isRangeAvailable, getAvailableRoomsForRange } from './rooms.js';
import { languagesList } from './config.js';

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
  /list/i
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

// Build system prompt for general chat with booking funnel
function buildGeneralSystemPrompt(hotelName = 'Hilton', bookingState = null) {
  const rooms = getAllRooms();
  const hotelInfo = getHotelInfo();

  const roomsList = rooms.length > 0
    ? rooms.map(r => {
        const bookedCount = (r.bookedDates || []).length;
        return `- ${r.name}: ${r.area}м², $${r.pricePerNight}/ніч`;
      }).join('\n')
    : 'Номери ще не додані.';

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

### ПРАВИЛА
- Отвечай на вопросы об этом номере
- Если гость готов бронировать — начни поэтапный сбор данных
- Отвечай кратко (2-4 предложения)
- Если вопрос выходит за рамки информации — предложи обратиться к персоналу`;
}

// Check if message indicates room intent
export function hasRoomIntent(message) {
  return ROOM_INTENT_PATTERNS.some(pattern => pattern.test(message));
}

// Check if message is about a general topic (should break room context)
export function isGeneralTopic(message) {
  return GENERAL_TOPIC_PATTERNS.some(pattern => pattern.test(message));
}

// Call OpenAI API (non-streaming)
async function callOpenAI(messages) {
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
        model: MODEL,
        messages: messages,
        max_tokens: 500,
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
async function callOpenAIStreaming(messages, onChunk, onComplete, onError) {
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
        model: MODEL,
        messages: messages,
        max_tokens: 500,
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

// Get general AI response with booking funnel support
export async function getGeneralAIResponse(userMessage, hotelName = 'Hilton', bookingState = null, conversationHistory = []) {
  const systemPrompt = buildGeneralSystemPrompt(hotelName, bookingState);

  // Build messages with conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add last 10 messages from history for context
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Check for room intent
  const showRooms = hasRoomIntent(userMessage);

  // Extract booking data from user message
  const extractedData = extractBookingData(userMessage);

  try {
    const response = await callOpenAI(messages);
    return {
      text: response,
      showRoomsCarousel: showRooms && getAllRooms().length > 0,
      extractedData: extractedData
    };
  } catch (error) {
    return {
      text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
      showRoomsCarousel: false,
      error: true
    };
  }
}

// Get general AI response with STREAMING support
export async function getGeneralAIResponseStreaming(userMessage, hotelName = 'Hilton', bookingState = null, conversationHistory = [], onChunk, onComplete, onError) {
  const systemPrompt = buildGeneralSystemPrompt(hotelName, bookingState);

  // Build messages with conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add last 10 messages from history for context
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Check for room intent
  const showRooms = hasRoomIntent(userMessage);

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
            extractedData: extractedData
          });
        }
      },
      (error) => {
        if (onError) {
          onError({
            text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
            showRoomsCarousel: false,
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
          dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
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
          dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
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
    ? rooms.map(r => `- ${r.name}: ${r.area}м², $${r.pricePerNight}/ніч, ${r.description || 'без описания'}`).join('\n')
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

  // Add conversation history
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current message
  messages.push({ role: 'user', content: userMessage });

  // Extract booking data
  const extractedData = extractBookingData(userMessage);

  try {
    const response = await callOpenAI(messages);

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

  // Add conversation history
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current message
  messages.push({ role: 'user', content: userMessage });

  // Extract booking data
  const extractedData = extractBookingData(userMessage);

  try {
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
