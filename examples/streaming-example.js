/**
 * Пример использования Streaming API в чат-виджете
 *
 * Этот файл демонстрирует, как использовать streaming функции
 * для создания плавного UX с постепенным появлением ответов AI.
 */

import * as openai from '../js/openai.js';

// ============================================
// ПРИМЕР 1: Базовое использование Streaming
// ============================================

async function basicStreamingExample(userMessage) {
  console.log('🚀 Запуск streaming запроса...');

  // Создаем элемент для отображения streaming текста
  const messageElement = {
    text: '',
    update: function(newText) {
      this.text = newText;
      console.log('📝 Обновление:', newText);
    }
  };

  await openai.getGeneralAIResponseStreaming(
    userMessage,
    'Hilton Hotel',
    null,  // bookingState
    [],    // conversationHistory

    // ✅ Callback для каждого фрагмента (chunk)
    (delta, fullText) => {
      messageElement.update(fullText);
      // В реальном приложении здесь обновляется DOM
    },

    // ✅ Callback при завершении
    (response) => {
      console.log('✅ Завершено!');
      console.log('Полный текст:', response.text);
      console.log('Показать карусель номеров?', response.showRoomsCarousel);
    },

    // ✅ Callback при ошибке
    (error) => {
      console.error('❌ Ошибка:', error);
    }
  );
}

// ============================================
// ПРИМЕР 2: Streaming с визуальными эффектами
// ============================================

async function streamingWithAnimation(userMessage) {
  console.log('✨ Запуск streaming с анимацией...');

  let chunkCount = 0;
  let startTime = Date.now();

  await openai.getGeneralAIResponseStreaming(
    userMessage,
    'Hilton Hotel',
    null,
    [],

    // Отслеживаем каждый chunk
    (delta, fullText) => {
      chunkCount++;

      // Логируем статистику
      const elapsed = Date.now() - startTime;
      console.log(`📦 Chunk #${chunkCount} (+${delta.length} chars) за ${elapsed}ms`);

      // В реальном приложении:
      // - Обновляем DOM
      // - Добавляем анимацию печатания
      // - Автоскролл вниз
    },

    (response) => {
      const totalTime = Date.now() - startTime;
      console.log(`✅ Завершено за ${totalTime}ms`);
      console.log(`📊 Статистика:`);
      console.log(`   - Всего chunks: ${chunkCount}`);
      console.log(`   - Длина текста: ${response.text.length} символов`);
      console.log(`   - Средняя скорость: ${(response.text.length / totalTime * 1000).toFixed(0)} символов/сек`);
    },

    (error) => {
      console.error('❌ Ошибка:', error);
    }
  );
}

// ============================================
// ПРИМЕР 3: Буферизованный Streaming
// ============================================

async function bufferedStreamingExample(userMessage) {
  console.log('🔄 Запуск буферизованного streaming...');

  let buffer = '';
  let lastUpdate = Date.now();
  const updateInterval = 100; // Обновляем UI каждые 100ms

  await openai.getGeneralAIResponseStreaming(
    userMessage,
    'Hilton Hotel',
    null,
    [],

    // Буферизация для плавности
    (delta, fullText) => {
      buffer += delta;

      // Обновляем UI только каждые 100ms
      const now = Date.now();
      if (now - lastUpdate >= updateInterval || fullText.length >= 500) {
        console.log('📝 Обновление UI:', fullText.substring(0, 50) + '...');
        buffer = '';
        lastUpdate = now;
      }
    },

    (response) => {
      // Финальное обновление
      console.log('✅ Финальный текст:', response.text);
    },

    (error) => {
      console.error('❌ Ошибка:', error);
    }
  );
}

// ============================================
// ПРИМЕР 4: Streaming для конкретного номера
// ============================================

async function roomStreamingExample(userMessage, room) {
  console.log('🏨 Запуск streaming для номера:', room.name);

  await openai.getRoomAIResponseStreaming(
    userMessage,
    room,
    'Hilton Hotel',
    null,  // bookingState
    [],    // conversationHistory

    (delta, fullText) => {
      // Обновляем сообщение о номере
      console.log('📝', fullText.substring(fullText.length - 20));
    },

    (response) => {
      console.log('✅ Ответ о номере готов:', response.text);

      // Извлекаем данные бронирования
      if (response.extractedData) {
        console.log('📋 Извлеченные данные:', response.extractedData);
      }
    },

    (error) => {
      console.error('❌ Ошибка:', error);
    }
  );
}

// ============================================
// ПРИМЕР 5: Параллельные streaming запросы
// ============================================

async function parallelStreamingExample() {
  console.log('🔀 Запуск параллельных streaming запросов...');

  const messages = [
    'Какие у вас номера?',
    'Какая цена?',
    'Есть ли завтрак?'
  ];

  // Запускаем все три запроса одновременно
  const promises = messages.map((msg, index) => {
    return new Promise((resolve) => {
      openai.getGeneralAIResponseStreaming(
        msg,
        'Hilton Hotel',
        null,
        [],

        (delta, fullText) => {
          console.log(`[${index + 1}] ${fullText.substring(0, 30)}...`);
        },

        (response) => {
          console.log(`✅ Запрос ${index + 1} завершен`);
          resolve(response);
        },

        (error) => {
          console.error(`❌ Запрос ${index + 1} ошибка:`, error);
          resolve(null);
        }
      );
    });
  });

  const results = await Promise.all(promises);
  console.log('🎉 Все запросы завершены!');
}

// ============================================
// ПРИМЕР 6: Обработка ошибок
// ============================================

async function errorHandlingExample(userMessage) {
  console.log('🛡️ Демонстрация обработки ошибок...');

  let retryCount = 0;
  const maxRetries = 3;

  async function attemptStreaming() {
    try {
      await openai.getGeneralAIResponseStreaming(
        userMessage,
        'Hilton Hotel',
        null,
        [],

        (delta, fullText) => {
          console.log('📝', fullText.substring(0, 50) + '...');
        },

        (response) => {
          console.log('✅ Успешно!');
        },

        async (error) => {
          console.error(`❌ Ошибка (попытка ${retryCount + 1}):`, error);

          // Retry логика
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Повторная попытка ${retryCount}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            await attemptStreaming();
          } else {
            console.error('💥 Превышено количество попыток');
          }
        }
      );
    } catch (error) {
      console.error('💥 Критическая ошибка:', error);
    }
  }

  await attemptStreaming();
}

// ============================================
// ЗАПУСК ПРИМЕРОВ
// ============================================

export async function runExamples() {
  console.log('🎬 Запуск примеров Streaming API...\n');

  // Пример 1: Базовый streaming
  await basicStreamingExample('Привет! Расскажи о вашем отеле');

  console.log('\n---\n');

  // Пример 2: С анимацией
  await streamingWithAnimation('Какие у вас номера?');

  console.log('\n---\n');

  // Пример 3: Буферизованный
  await bufferedStreamingExample('Расскажи о ваших услугах');

  console.log('\n🎉 Все примеры завершены!');
}

// ============================================
// ЭКСПОРТ ФУНКЦИЙ
// ============================================

export {
  basicStreamingExample,
  streamingWithAnimation,
  bufferedStreamingExample,
  roomStreamingExample,
  parallelStreamingExample,
  errorHandlingExample
};
