/*
 * Room Service Module
 * Hotel Chat Widget
 */

const STORAGE_KEY = 'room_service_orders';

// Room service categories
export const SERVICE_CATEGORIES = {
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

const ROOM_SERVICE_PATTERNS = [

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
  return 'cleaning'; // Default
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

export function getCategoryIcon(categoryId) {
  const icons = {
    cleaning: '<path d="M3 3h.01"/><path d="M15 9V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M19 9v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9"/><path d="m11 16-2-2"/><path d="m15 16-2-2"/><path d="M7 9h10"/>',
    towels: '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" y1="5" x2="8" y2="7"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="7" y1="19" x2="7" y2="21"/><line x1="17" y1="19" x2="17" y2="21"/>',
    minibar: '<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>'
  };
  return icons[categoryId] || icons.cleaning;
}
