/*
 * OpenAI Integration Module
 * Hilton Chat Widget
 */

import { getAllRooms, isRangeAvailable, getAvailableRoomsForRange } from './rooms.js';

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

  // Build booking state description
  let stateDescription = '';
  if (bookingState && bookingState.collectedData) {
    const data = bookingState.collectedData;
    const parts = [];
    if (data.checkIn) parts.push(`Дата заїзду: ${data.checkIn}`);
    if (data.checkOut) parts.push(`Дата виїзду: ${data.checkOut}`);
    if (data.guests) parts.push(`Гостей: ${data.guests}`);
    if (data.selectedRoom) parts.push(`Обраний номер: ${data.selectedRoom}`);
    stateDescription = parts.length > 0 ? parts.join(', ') : 'Дані ще не зібрані';
  }

  // Build availability info if dates are provided
  let availabilityInfo = '';
  if (bookingState?.collectedData?.checkIn && bookingState?.collectedData?.checkOut) {
    const availableRooms = getAvailableRoomsForRange(
      bookingState.collectedData.checkIn,
      bookingState.collectedData.checkOut
    );
    if (availableRooms.length > 0) {
      availabilityInfo = `\n\nДОСТУПНІ НОМЕРИ на вказані дати:\n${availableRooms.map(r => `- ${r.name}: $${r.pricePerNight}/ніч`).join('\n')}`;
    } else {
      availabilityInfo = '\n\nНа вказані дати немає вільних номерів.';
    }
  }

  return `Ти ввічливий асистент готелю ${hotelName}. Твоя головна мета - допомогти гостю забронювати номер.

ІНФОРМАЦІЯ ПРО ГОТЕЛЬ:
${hotelInfo || 'Інформація не вказана.'}

ДОСТУПНІ НОМЕРИ:
${roomsList}
${availabilityInfo}

ВОРОНКА БРОНЮВАННЯ (дотримуйся послідовності):
1. Якщо гість не вказав дати заїзду/виїзду - уточни їх ненав'язливо
2. Якщо є дати, але не вказана кількість гостей - уточни
3. Коли є дати та кількість гостей - перевір доступність та запропонуй підходящі номери
4. Після вибору номера - релевантно запропонуй додаткові послуги (SPA, ресторан і т.д.)

ПОТОЧНИЙ СТАН БРОНЮВАННЯ:
${stateDescription || 'Початок діалогу'}

ВАЖЛИВІ ПРАВИЛА:
- Якщо гість задає конкретне питання (про WiFi, сніданок, трансфер) - СПОЧАТКУ відповідай на нього, потім плавно повертайся до воронки
- Будь дружелюбним та не нав'язливим
- Відповідай коротко (2-4 речення)
- Відповідай українською мовою
- Якщо гість питає про номери або хоче подивитись варіанти - скажи що зараз покажеш доступні номери`;
}

// Build system prompt for room-specific chat
function buildRoomSystemPrompt(room, hotelName = 'Hilton', bookingState = null) {
  const hotelInfo = getHotelInfo();

  return `Ти асистент готелю ${hotelName}. Зараз гість цікавиться конкретним номером.

ІНФОРМАЦІЯ ПРО НОМЕР:
- Назва: ${room.name}
- Опис: ${room.description || 'Опис не вказано'}
- Площа: ${room.area} м²
- Ціна: $${room.pricePerNight} за ніч

ІНФОРМАЦІЯ ПРО ГОТЕЛЬ:
${hotelInfo || 'Інформація не вказана.'}

ПРАВИЛА:
- Відповідай на питання про цей номер
- Якщо гість готовий бронювати - запитай дати заїзду/виїзду
- Після підтвердження номера можеш запропонувати додаткові послуги
- Відповідай коротко, українською мовою
- Якщо питання виходить за межі інформації - ввічливо запропонуй звернутись до персоналу`;
}

// Check if message indicates room intent
export function hasRoomIntent(message) {
  return ROOM_INTENT_PATTERNS.some(pattern => pattern.test(message));
}

// Check if message is about a general topic (should break room context)
export function isGeneralTopic(message) {
  return GENERAL_TOPIC_PATTERNS.some(pattern => pattern.test(message));
}

// Call OpenAI API
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

// Extract booking data from user message (dates, guests count)
export function extractBookingData(message) {
  const data = {
    checkIn: null,
    checkOut: null,
    guests: null
  };

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
