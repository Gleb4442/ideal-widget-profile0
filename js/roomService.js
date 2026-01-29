/*
 * Room Service Module
 * Hotel Chat Widget
 */

const STORAGE_KEY = 'room_service_orders';

// Room service categories
export const SERVICE_CATEGORIES = {
  food: {
    id: 'food',
    name: 'Room Service',
    nameUa: 'Їжа в номер',
    icon: 'utensils'
  },
  cleaning: {
    id: 'cleaning',
    name: 'Room Cleaning',
    nameUa: 'Прибирання',
    icon: 'sparkles'
  },
  towels: {
    id: 'towels',
    name: 'Linens & Towels',
    nameUa: 'Рушники',
    icon: 'towel'
  },
  minibar: {
    id: 'minibar',
    name: 'Minibar',
    nameUa: 'Мінібар',
    icon: 'wine'
  }
};

// Sample restaurant menu
export const RESTAURANT_MENU = {
  breakfast: {
    name: 'Сніданок',
    items: [
      { id: 'b1', name: 'Континентальний сніданок', price: 18, description: 'Круасан, сік, кава' },
      { id: 'b2', name: 'Американський сніданок', price: 24, description: 'Яйця, бекон, тости, кава' },
      { id: 'b3', name: 'Здоровий старт', price: 20, description: 'Йогурт, гранола, свіжі фрукти' },
      { id: 'b4', name: 'Омлет з овочами', price: 16, description: 'Омлет з томатами, перцем, цибулею' }
    ]
  },
  lunch: {
    name: 'Обід',
    items: [
      { id: 'l1', name: 'Салат Цезар', price: 16, description: 'Романо, пармезан, грінки' },
      { id: 'l2', name: 'Клаб сендвіч', price: 18, description: 'Тристоровий з картоплею фрі' },
      { id: 'l3', name: 'Паста Примавера', price: 22, description: 'Свіжі овочі, оливкова олія' },
      { id: 'l4', name: 'Бургер з яловичини', price: 20, description: 'З сиром чеддер та беконом' }
    ]
  },
  dinner: {
    name: 'Вечеря',
    items: [
      { id: 'd1', name: 'Лосось на грилі', price: 32, description: 'Зі спаржею та рисом' },
      { id: 'd2', name: 'Стейк Рібай', price: 38, description: '250г з овочами' },
      { id: 'd3', name: 'Різотто з грибами', price: 26, description: 'Білі гриби та трюфель' },
      { id: 'd4', name: 'Курка по-київськи', price: 28, description: 'Класичний рецепт з пюре' }
    ]
  },
  drinks: {
    name: 'Напої',
    items: [
      { id: 'dr1', name: 'Вода в пляшці', price: 4, description: 'Газована або негазована' },
      { id: 'dr2', name: 'Безалкогольні напої', price: 5, description: 'Кола, Спрайт, Фанта' },
      { id: 'dr3', name: 'Свіжий сік', price: 8, description: 'Апельсин, яблуко, грейпфрут' },
      { id: 'dr4', name: 'Вино (бокал)', price: 12, description: 'Червоне або біле' },
      { id: 'dr5', name: 'Пиво', price: 7, description: 'Місцеве крафтове' }
    ]
  }
};

// Cleaning options
export const CLEANING_OPTIONS = [
  { id: 'full', name: 'Повне прибирання', description: 'Зміна білизни, прибирання, поповнення' },
  { id: 'light', name: 'Легке прибирання', description: 'Заправка ліжка, винос сміття' },
  { id: 'turndown', name: 'Вечірній сервіс', description: 'Підготовка номеру до сну' }
];

// Towels/linens options
export const TOWEL_OPTIONS = [
  { id: 'bath', name: 'Банні рушники', description: 'Комплект великих рушників' },
  { id: 'hand', name: 'Рушники для рук', description: 'Маленькі рушники' },
  { id: 'bathrobes', name: 'Халати', description: 'Чисті халати' },
  { id: 'pillows', name: 'Додаткові подушки', description: 'М\'які або жорсткі' },
  { id: 'blanket', name: 'Додаткова ковдра', description: 'Тепла ковдра' }
];

// Minibar options
export const MINIBAR_OPTIONS = [
  { id: 'restock', name: 'Поповнити мінібар', description: 'Повне поповнення асортименту' },
  { id: 'remove', name: 'Прибрати алкоголь', description: 'Видалити алкогольні напої' },
  { id: 'special', name: 'Особливе замовлення', description: 'Конкретні напої чи снеки' }
];

// Intent patterns for room service
const ROOM_SERVICE_PATTERNS = [
  // Food delivery (Russian, Ukrainian, English)
  /room\s*service|рум\s*сервіс|рум\s*сервис/i,
  /доставк.*в\s*номер|еду.*в\s*номер|їжу.*в\s*номер/i,
  /заказ.*еды|замовлен.*їжі|замовити.*їжу/i,
  /хочу\s*(поесть|поїсти)|голодн|hungry/i,
  /завтрак.*номер|сніданок.*номер|обід.*номер|обед.*номер/i,
  /ужин.*номер|вечер.*номер/i,
  /принес.*еду|принес.*їжу/i,
  /меню.*ресторан|ресторан.*меню/i,

  // Cleaning (Russian, Ukrainian, English)
  /убор.*номер|прибр.*номер|прибирання/i,
  /clean.*room|cleaning|уборк/i,
  /приберіть|приберите|почистить/i,

  // Towels/linens
  /полотенц|рушник|towel/i,
  /сменить.*белье|змінити.*білизну/i,
  /подушк|pillow/i,
  /халат|bathrobe|ковдр|blanket/i,
  /постіль.*білизн|постельное.*белье/i,

  // Minibar
  /минибар|мінібар|minibar|мини.*бар|міні.*бар/i,
  /пополнить.*бар|поповнити.*бар|restock/i
];

// Detect room service intent
export function detectRoomServiceIntent(message) {
  const lowerMessage = message.toLowerCase();

  for (const pattern of ROOM_SERVICE_PATTERNS) {
    if (pattern.test(lowerMessage)) {
      return {
        hasIntent: true,
        category: detectCategory(lowerMessage)
      };
    }
  }

  return { hasIntent: false, category: null };
}

function detectCategory(message) {
  // Food keywords
  if (/еду|їжу|food|завтрак|сніданок|обід|обед|ужин|вечер|hungry|голод|поесть|поїсти|меню|ресторан|room\s*service|рум\s*серв/i.test(message)) {
    return 'food';
  }
  // Cleaning keywords
  if (/убор|прибр|clean|почист/i.test(message)) {
    return 'cleaning';
  }
  // Towels/linens keywords
  if (/полотен|рушник|towel|белье|білизн|подушк|pillow|халат|bathrobe|ковдр|blanket|постіль|постельн/i.test(message)) {
    return 'towels';
  }
  // Minibar keywords
  if (/минибар|мінібар|minibar|мини.*бар|міні.*бар/i.test(message)) {
    return 'minibar';
  }
  return 'food'; // Default
}

// Current order state
let currentOrder = {
  id: null,
  roomNumber: '',
  category: null,
  items: [],
  specialInstructions: '',
  status: 'draft'
};

// Order management
export function createOrder(roomNumber, category) {
  currentOrder = {
    id: generateOrderId(),
    roomNumber,
    category,
    items: [],
    specialInstructions: '',
    status: 'draft',
    createdAt: Date.now()
  };
  return currentOrder;
}

export function addItemToOrder(item) {
  // Avoid duplicates
  if (!currentOrder.items.find(i => i.id === item.id)) {
    currentOrder.items.push(item);
  }
  return currentOrder;
}

export function removeItemFromOrder(itemId) {
  currentOrder.items = currentOrder.items.filter(i => i.id !== itemId);
  return currentOrder;
}

export function setRoomNumber(roomNumber) {
  currentOrder.roomNumber = roomNumber;
  return currentOrder;
}

export function setSpecialInstructions(instructions) {
  currentOrder.specialInstructions = instructions;
  return currentOrder;
}

export function submitOrder() {
  currentOrder.status = 'submitted';
  currentOrder.submittedAt = Date.now();
  saveOrder(currentOrder);

  const submittedOrder = { ...currentOrder };
  resetOrder();
  return submittedOrder;
}

export function getCurrentOrder() {
  return { ...currentOrder };
}

export function resetOrder() {
  currentOrder = {
    id: null,
    roomNumber: '',
    category: null,
    items: [],
    specialInstructions: '',
    status: 'draft'
  };
}

export function getOrderTotal() {
  return currentOrder.items.reduce((sum, item) => sum + (item.price || 0), 0);
}

function generateOrderId() {
  return 'RS-' + Date.now().toString(36).toUpperCase();
}

function saveOrder(order) {
  try {
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    orders.push(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving room service order:', e);
  }
}

export function getOrderHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

// Get category icon SVG
export function getCategoryIcon(categoryId) {
  const icons = {
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    cleaning: '<path d="M12 2L12 6"/><path d="M12 18L12 22"/><path d="M4.93 4.93L7.76 7.76"/><path d="M16.24 16.24L19.07 19.07"/><path d="M2 12L6 12"/><path d="M18 12L22 12"/><path d="M4.93 19.07L7.76 16.24"/><path d="M16.24 7.76L19.07 4.93"/><circle cx="12" cy="12" r="4"/>',
    towels: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/><path d="M12 12v6"/>',
    minibar: '<path d="M8 2h8"/><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.788a4 4 0 0 0-.672-2.22l-.656-.984A4 4 0 0 1 15 4.79V2"/><path d="M7 15h10"/>'
  };
  return icons[categoryId] || icons.food;
}
