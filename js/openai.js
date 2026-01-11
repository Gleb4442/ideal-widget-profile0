/*
 * OpenAI Integration Module
 * Hilton Chat Widget
 */

import { getAllRooms } from './rooms.js';

// API Configuration
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

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

// Build system prompt for general chat
function buildGeneralSystemPrompt(hotelName = 'Hilton') {
  const rooms = getAllRooms();
  const roomsList = rooms.length > 0
    ? rooms.map(r => `- ${r.name}: ${r.area}м², $${r.pricePerNight}/ніч`).join('\n')
    : 'Номери ще не додані.';

  return `Ти ввічливий асистент готелю ${hotelName}. Відповідай коротко та інформативно українською мовою.

Доступні номери:
${roomsList}

Якщо гість питає про номери або хоче подивитись варіанти, скажи що зараз покажеш доступні номери (система автоматично покаже карусель).

Будь дружелюбним та допомагай з бронюванням.`;
}

// Build system prompt for room-specific chat
function buildRoomSystemPrompt(room, hotelName = 'Hilton') {
  return `Ти асистент готелю ${hotelName}. Зараз гість цікавиться конкретним номером. Відповідай на питання тільки про цей номер.

Інформація про номер:
- Назва: ${room.name}
- Опис: ${room.description || 'Опис не вказано'}
- Площа: ${room.area} м²
- Ціна: $${room.pricePerNight} за ніч

Відповідай коротко, інформативно, українською мовою. Якщо питання виходить за межі інформації про номер, ввічливо запропонуй звернутись до персоналу готелю.`;
}

// Check if message indicates room intent
export function hasRoomIntent(message) {
  return ROOM_INTENT_PATTERNS.some(pattern => pattern.test(message));
}

// Call OpenAI API
async function callOpenAI(messages) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Вибачте, не вдалося отримати відповідь.';
  } catch (error) {
    console.error('OpenAI request error:', error);
    throw error;
  }
}

// Get general AI response
export async function getGeneralAIResponse(userMessage, hotelName = 'Hilton') {
  const systemPrompt = buildGeneralSystemPrompt(hotelName);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  // Check for room intent
  const showRooms = hasRoomIntent(userMessage);

  try {
    const response = await callOpenAI(messages);
    return {
      text: response,
      showRoomsCarousel: showRooms && getAllRooms().length > 0
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
export async function getRoomAIResponse(userMessage, room, hotelName = 'Hilton') {
  const systemPrompt = buildRoomSystemPrompt(room, hotelName);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await callOpenAI(messages);
    return {
      text: response,
      error: false
    };
  } catch (error) {
    return {
      text: 'Вибачте, сталася помилка. Спробуйте ще раз пізніше.',
      error: true
    };
  }
}

// Export for testing/debugging
export function getApiStatus() {
  return {
    configured: !!OPENAI_API_KEY,
    model: MODEL
  };
}
