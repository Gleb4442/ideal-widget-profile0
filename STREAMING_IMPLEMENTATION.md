# Streaming API Implementation Guide

## Обзор

Ваш чат-виджет теперь поддерживает **streaming responses** от OpenAI API. Это означает, что ответы ИИ отображаются постепенно по мере их генерации, что создает более плавный и отзывчивый пользовательский опыт.

## Что было изменено

### 1. **js/openai.js** - Добавлена поддержка streaming

#### Новые функции:

- **`callOpenAIStreaming(messages, onChunk, onComplete, onError)`** - основная функция для streaming запросов
  - `messages` - массив сообщений для OpenAI
  - `onChunk(delta, fullText)` - вызывается при получении каждого фрагмента текста
  - `onComplete(fullText)` - вызывается при завершении генерации
  - `onError(error)` - вызывается при ошибке

- **`getGeneralAIResponseStreaming(...)`** - streaming версия для общих ответов
- **`getRoomAIResponseStreaming(...)`** - streaming версия для ответов о номерах
- **`getSpecialBookingAIResponseStreaming(...)`** - streaming версия для специальных бронирований

#### Как это работает:

```javascript
// Пример использования streaming функции
await openai.getGeneralAIResponseStreaming(
  userMessage,
  hotelName,
  bookingState,
  conversationHistory,

  // Обработчик каждого фрагмента (chunk)
  (delta, fullText) => {
    // delta - новый фрагмент текста
    // fullText - весь текст до этого момента
    streamingMsg.update(fullText);
  },

  // Обработчик завершения
  (response) => {
    streamingMsg.finalize(response.text);
    // Дополнительная обработка...
  },

  // Обработчик ошибок
  (error) => {
    streamingMsg.finalize('Произошла ошибка...');
  }
);
```

### 2. **js/chat.js** - Обновлена логика UI

#### Новые функции:

- **`createStreamingMessage()`** - создает элемент сообщения для постепенного заполнения
  - Возвращает объект с методами:
    - `update(text)` - обновляет текст сообщения
    - `finalize(text)` - финализирует сообщение (финальный текст)

#### Изменения в `getAIResponse()`:

- Все вызовы AI теперь используют streaming версии функций
- Индикатор печатания скрыт, вместо него создается streaming сообщение
- Текст появляется постепенно по мере генерации

### 3. **api/chat.js** - Обновлен серверный прокси

#### Что изменилось:

- Добавлена поддержка параметра `stream: true`
- При streaming включается режим Server-Sent Events (SSE)
- Данные передаются от OpenAI к клиенту в реальном времени

```javascript
// Серверная функция теперь поддерживает streaming
if (stream) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // Передача потока...
}
```

## Как работает Streaming

### Последовательность событий:

1. **Пользователь отправляет сообщение**
2. **Создается streaming элемент** (пустое сообщение AI)
3. **Отправляется запрос** к OpenAI с `stream: true`
4. **OpenAI генерирует ответ** по частям (Server-Sent Events)
5. **Каждый фрагмент (delta) обрабатывается**:
   - Добавляется к полному тексту
   - UI обновляется в реальном времени
6. **По завершении** сообщение финализируется

### Визуальная схема:

```
User sends message
     ↓
Create empty AI message element
     ↓
Call OpenAI API (stream: true)
     ↓
┌────────────────────────────┐
│ OpenAI generates response  │
│ word by word...            │
└────────────────────────────┘
     ↓
Each chunk arrives → Update UI immediately
     ↓
Stream complete → Finalize message
```

## Преимущества Streaming

✅ **Лучший UX**: Пользователь видит ответ немедленно, а не ждет полной генерации

✅ **Ощущение скорости**: Даже длинные ответы кажутся быстрыми

✅ **Визуальная обратная связь**: Пользователь знает, что система работает

✅ **Современный интерфейс**: Как в ChatGPT и других современных AI чатах

## Тестирование

### Локальное тестирование:

1. Убедитесь, что `OPENAI_API_KEY` настроен в `js/config-local.js`:

```javascript
export const LOCAL_CONFIG = {
  OPENAI_API_KEY: 'sk-...'
};
```

2. Откройте приложение на `localhost`
3. Отправьте сообщение и наблюдайте за постепенным появлением ответа

### Production тестирование:

1. Убедитесь, что переменная окружения `OPENAI_API_KEY` установлена на Vercel:
   ```bash
   vercel env add OPENAI_API_KEY
   ```

2. Деплойте приложение:
   ```bash
   vercel --prod
   ```

3. Тестируйте streaming на production URL

## Технические детали

### Формат Server-Sent Events (SSE):

```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

### Обработка в браузере:

```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  // Парсинг и обработка chunk...
}
```

## Возможные проблемы и решения

### Проблема: Streaming не работает локально

**Решение**: Убедитесь, что:
- `OPENAI_API_KEY` настроен в `config-local.js`
- Вы открываете приложение на `localhost` или `127.0.0.1`
- В консоли браузера нет ошибок

### Проблема: Streaming не работает на production

**Решение**: Проверьте:
- Переменная окружения `OPENAI_API_KEY` установлена на Vercel
- Проксирование через `/api/chat` работает корректно
- В логах Vercel нет ошибок

### Проблема: Текст появляется рывками

**Решение**: Это нормально. OpenAI отправляет chunks с разной скоростью. Вы можете добавить буферизацию:

```javascript
let buffer = '';
onChunk: (delta, fullText) => {
  buffer += delta;

  // Обновляем UI каждые 50ms или каждые 10 символов
  if (buffer.length >= 10) {
    streamingMsg.update(fullText);
    buffer = '';
  }
}
```

## Дополнительные возможности

### Отключение streaming (если нужно):

Если вы хотите временно отключить streaming и вернуться к обычным ответам, просто используйте старые функции без суффикса `Streaming`:

```javascript
// Вместо:
await openai.getGeneralAIResponseStreaming(...);

// Используйте:
const response = await openai.getGeneralAIResponse(...);
addMessage(response.text, 'ai');
```

### Настройка параметров streaming:

В `js/openai.js` вы можете изменить параметры запроса:

```javascript
body: JSON.stringify({
  model: MODEL,              // gpt-4o-mini по умолчанию
  messages: messages,
  max_tokens: 500,          // Увеличьте для более длинных ответов
  temperature: 0.7,         // Креативность (0-2)
  stream: true              // Включить streaming
})
```

## Производительность

### Метрики:

- **Время до первого символа**: ~200-500ms (зависит от модели)
- **Скорость генерации**: ~20-50 токенов/сек
- **Пропускная способность**: зависит от сети

### Оптимизация:

1. Используйте быстрые модели (`gpt-4o-mini`) для streaming
2. Уменьшите `max_tokens` для более коротких ответов
3. Кешируйте system prompts на стороне OpenAI (feature в разработке)

## Заключение

Streaming implementation успешно внедрен в ваш чат-виджет! Теперь ваши пользователи получат современный опыт общения с AI, сравнимый с ChatGPT и другими передовыми платформами.

Если у вас возникнут вопросы или проблемы, обратитесь к документации OpenAI:
https://platform.openai.com/docs/guides/function-calling#streaming
