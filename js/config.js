/*
 * Configuration Data
 * Hilton Chat Widget
 */

// Available Fonts
export const fontsList = [
  "Inter", "Roboto", "Montserrat", "Poppins", "Oswald", "Rubik", "Ubuntu", "Exo 2",
  "Work Sans", "Fira Sans", "Anton", "Nunito", "Manrope", "Mulish", "Titillium Web",
  "PT Sans", "Bebas Neue", "Abril Fatface", "Lobster", "Righteous", "Russo One",
  "Permanent Marker", "Fjalla One", "Asap", "Cairo"
].sort();

// Available Icons
export const iconsList = [
  {
    id: 'chat',
    svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>'
  },
  {
    id: 'message-circle',
    svg: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>'
  },
  {
    id: 'custom-logo',
    svg: '<path fill-rule="evenodd" clip-rule="evenodd" d="M106.13 53.03c22.55,2.08 40.65,19.52 43.75,41.75l-96.58 0c3.18,-22.75 22.05,-40.47 45.33,-41.87l0 -4.17 -2.36 0c-2.32,0 -4.23,-1.91 -4.23,-4.23l0 0c0,-2.33 1.91,-4.23 4.23,-4.23l12.4 0c2.33,0 4.23,1.9 4.23,4.23l0 0c0,2.32 -1.9,4.23 -4.23,4.23l-2.54 0 0 4.29zm15.16 63.75c1.5,-1.94 4.29,-2.3 6.23,-0.8 1.94,1.5 2.3,4.29 0.8,6.23 -3.14,4.07 -7.19,7.4 -11.86,9.7 -4.51,2.21 -9.56,3.46 -14.87,3.46 -5.31,0 -10.36,-1.25 -14.87,-3.46 -4.67,-2.3 -8.72,-5.63 -11.86,-9.7 -1.5,-1.94 -1.14,-4.73 0.8,-6.23 1.94,-1.5 4.73,-1.14 6.23,0.8 2.33,3.01 5.31,5.47 8.74,7.15 3.28,1.62 7,2.52 10.96,2.52 3.96,0 7.68,-0.9 10.96,-2.52 3.43,-1.68 6.41,-4.14 8.74,-7.15zm-10.04 39.85c-1.68,1.41 -4.25,2.17 -4.31,-1.17 -0.02,-0.99 -0.04,-1.26 -0.06,-2.26 -0.81,-2.45 -3.2,-2.84 -5.68,-2.84l0 -0.01c-25.76,-0.2 -46.76,-20.38 -48.29,-45.8l97.36 0c-0.71,11.75 -5.05,23.66 -13.15,30.44l-25.87 21.64z"/>',
    viewBox: '0 0 203.18 203.18',
    fill: 'currentColor',
    stroke: 'none',
    size: '44'
  },
  {
    id: 'robot',
    svg: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>'
  },
  {
    id: 'star',
    svg: '<path d="M12 2L14.5 9.5 22 12 14.5 14.5 12 22 9.5 14.5 2 12 9.5 9.5 12 2z"/>'
  }
];

// Translations
export const translations = {
  ru: {
    buttonText: "Чат с отелем",
    placeholder: "Напишите сообщение...",
    welcome: "Здравствуйте! Добро пожаловать в Hilton. Чем могу помочь с вашим бронированием?",
    defaultAI: "Извините, я пока учусь. Могу ли я помочь вам забронировать номер?",
    keywords: {
      hello: /(привет|здравствуй|hello|hi)/,
      book: /(бронь|забронировать|номер|book|reservation)/,
      price: /(цена|стоимость|сколько стоит|price)/,
      thanks: /(спасибо|благодарю|thanks)/
    },
    answers: {
      hello: "Добрый день! Рад вас видеть в Hilton. Планируете поездку к нам?",
      book: "С удовольствием помогу с бронированием! 📅 \nНа какие даты вы планируете заезд?",
      price: "💰 **Наши тарифы:**\n• King Room: от $180/ночь\n• Executive Suite: от $350/ночь. Подсказать свободные даты?",
      thanks: "Всегда пожалуйста! Хорошего дня! ☀️"
    }
  },
  ua: {
    buttonText: "Чат з готелем",
    placeholder: "Напишіть повідомлення...",
    welcome: "Вітаємо! Ласкаво просимо до Hilton. Чим можу допомогти з вашим бронюванням?",
    defaultAI: "Вибачте, я поки що вчуся. Чи можу я допомогти вам забронювати номер?",
    keywords: {
      hello: /(привіт|вітаю|hello|hi)/,
      book: /(бронь|забронювати|номер|book|reservation)/,
      price: /(ціна|вартість|скільки коштує|price)/,
      thanks: /(дякую|спасибі|thanks)/
    },
    answers: {
      hello: "Добрий день! Радий бачити вас у Hilton. Плануєте поїздку до нас?",
      book: "Із задоволенням допоможу з бронюванням! 📅 \nНа які дати ви плануєте заїзд?",
      price: "💰 **Наші тарифи:**\n• King Room: від $180/ніч\n• Executive Suite: від $350/ніч. Підказати вільні дати?",
      thanks: "Завжди будь ласка! Гарного дня! ☀️"
    }
  },
  en: {
    buttonText: "Chat with Hotel",
    placeholder: "Type a message...",
    welcome: "Hello! Welcome to Hilton. How can I help you with your reservation?",
    defaultAI: "Sorry, I am still learning. Can I help you book a room?",
    keywords: {
      hello: /(hello|hi|greetings|hey)/,
      book: /(book|reserve|room|reservation)/,
      price: /(price|cost|rates|much)/,
      thanks: /(thanks|thank you)/
    },
    answers: {
      hello: "Good afternoon! Glad to see you at Hilton. Planning a trip to us?",
      book: "I'd be happy to help with your booking! 📅 \nWhat dates are you planning to check in?",
      price: "💰 **Our Rates:**\n• King Room: from $180/night\n• Executive Suite: from $350/night. Should I check availability?",
      thanks: "You are always welcome! Have a nice day! ☀️"
    }
  }
};
