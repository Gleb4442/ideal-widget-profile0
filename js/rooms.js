/*
 * Rooms Management Module
 * Hilton Chat Widget
 */

const STORAGE_KEY = 'hotel_rooms';
const MAX_IMAGE_SIZE = 800; // Max dimension for image compression

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Compress image before storing
export function compressImage(file, maxSize = MAX_IMAGE_SIZE) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Load rooms from localStorage
export function loadRooms() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading rooms:', e);
    return [];
  }
}

// Save rooms to localStorage
export function saveRooms(rooms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    return true;
  } catch (e) {
    console.error('Error saving rooms:', e);
    if (e.name === 'QuotaExceededError') {
      alert('Storage limit exceeded. Try using smaller images.');
    }
    return false;
  }
}

// Get all rooms
export function getAllRooms() {
  return loadRooms();
}

// Get room by ID
export function getRoom(id) {
  const rooms = loadRooms();
  return rooms.find(room => room.id === id) || null;
}

// Add new room
export function addRoom(roomData) {
  const rooms = loadRooms();
  const newRoom = {
    id: generateId(),
    name: roomData.name || '',
    description: roomData.description || '',
    area: roomData.area || 0,
    pricePerNight: roomData.pricePerNight || 0,
    mainPhoto: roomData.mainPhoto || '',
    gallery: roomData.gallery || [],
    askQuestionEnabled: roomData.askQuestionEnabled !== false,
    createdAt: Date.now()
  };

  rooms.push(newRoom);

  if (saveRooms(rooms)) {
    return newRoom;
  }
  return null;
}

// Update existing room
export function updateRoom(id, roomData) {
  const rooms = loadRooms();
  const index = rooms.findIndex(room => room.id === id);

  if (index === -1) return null;

  rooms[index] = {
    ...rooms[index],
    name: roomData.name ?? rooms[index].name,
    description: roomData.description ?? rooms[index].description,
    area: roomData.area ?? rooms[index].area,
    pricePerNight: roomData.pricePerNight ?? rooms[index].pricePerNight,
    mainPhoto: roomData.mainPhoto ?? rooms[index].mainPhoto,
    gallery: roomData.gallery ?? rooms[index].gallery,
    askQuestionEnabled: roomData.askQuestionEnabled ?? rooms[index].askQuestionEnabled,
    updatedAt: Date.now()
  };

  if (saveRooms(rooms)) {
    return rooms[index];
  }
  return null;
}

// Delete room
export function deleteRoom(id) {
  const rooms = loadRooms();
  const filtered = rooms.filter(room => room.id !== id);

  if (filtered.length === rooms.length) return false;

  return saveRooms(filtered);
}

// Get rooms count
export function getRoomsCount() {
  return loadRooms().length;
}

// Check if any rooms exist
export function hasRooms() {
  return loadRooms().length > 0;
}

// Format price for display
export function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

// Format area for display
export function formatArea(area) {
  return `${area} м²`;
}
