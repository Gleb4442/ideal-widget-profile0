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
    // Marketing fields
    badge: roomData.badge || '',
    leftCount: roomData.leftCount || 0,
    discount: roomData.discount || 0,
    originalPrice: roomData.originalPrice || 0,
    reviews: roomData.reviews || [], // New reviews field
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
    bookedDates: roomData.bookedDates ?? rooms[index].bookedDates ?? [],
    // Marketing fields
    badge: roomData.badge ?? rooms[index].badge ?? '',
    leftCount: roomData.leftCount ?? rooms[index].leftCount ?? 0,
    discount: roomData.discount ?? rooms[index].discount ?? 0,
    originalPrice: roomData.originalPrice ?? rooms[index].originalPrice ?? 0,
    reviews: roomData.reviews ?? rooms[index].reviews ?? [], // Preserve or update reviews
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

// Badge types and labels
export const BADGE_TYPES = {
  popular: { label: 'Most Popular', class: 'badge-popular' },
  new: { label: 'New', class: 'badge-new' },
  limited: { label: 'Limited', class: 'badge-limited' },
  recommended: { label: 'Recommended', class: 'badge-recommended' },
  bestseller: { label: 'Bestseller', class: 'badge-bestseller' }
};

// Get badge info
export function getBadgeInfo(badgeType) {
  return BADGE_TYPES[badgeType] || null;
}

// ============================================
// CALENDAR / AVAILABILITY FUNCTIONS
// ============================================

// Format date to YYYY-MM-DD
export function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Parse date string to Date object
export function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

// Check if a specific date is available for a room
export function isDateAvailable(roomId, dateStr) {
  const room = getRoom(roomId);
  if (!room) return false;
  const bookedDates = room.bookedDates || [];
  return !bookedDates.includes(dateStr);
}

// Check if date range is available for a room
export function isRangeAvailable(roomId, startDate, endDate) {
  const room = getRoom(roomId);
  if (!room) return false;

  const bookedDates = room.bookedDates || [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    if (bookedDates.includes(dateStr)) {
      return false;
    }
  }
  return true;
}

// Get available rooms for a date range
export function getAvailableRoomsForRange(startDate, endDate) {
  const allRooms = getAllRooms();
  return allRooms.filter(room => isRangeAvailable(room.id, startDate, endDate));
}

// Toggle date booking status
export function toggleDateBooked(roomId, dateStr) {
  const rooms = loadRooms();
  const index = rooms.findIndex(room => room.id === roomId);
  if (index === -1) return false;

  if (!rooms[index].bookedDates) {
    rooms[index].bookedDates = [];
  }

  const dateIndex = rooms[index].bookedDates.indexOf(dateStr);
  if (dateIndex === -1) {
    rooms[index].bookedDates.push(dateStr);
  } else {
    rooms[index].bookedDates.splice(dateIndex, 1);
  }

  return saveRooms(rooms);
}

// Set date as booked or available
export function setDateBooked(roomId, dateStr, booked) {
  const rooms = loadRooms();
  const index = rooms.findIndex(room => room.id === roomId);
  if (index === -1) return false;

  if (!rooms[index].bookedDates) {
    rooms[index].bookedDates = [];
  }

  const dateIndex = rooms[index].bookedDates.indexOf(dateStr);

  if (booked && dateIndex === -1) {
    rooms[index].bookedDates.push(dateStr);
  } else if (!booked && dateIndex !== -1) {
    rooms[index].bookedDates.splice(dateIndex, 1);
  }

  return saveRooms(rooms);
}

// Generate random availability for demo (2 months ahead)
export function generateRandomAvailability(roomId) {
  const rooms = loadRooms();
  const index = rooms.findIndex(room => room.id === roomId);
  if (index === -1) return false;

  const bookedDates = [];
  const today = new Date();
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

  // Generate random booking blocks (30-40% occupancy)
  let currentDate = new Date(today);

  while (currentDate < twoMonthsLater) {
    // Random chance to start a booking block (20% chance)
    if (Math.random() < 0.2) {
      // Random block length 2-5 days
      const blockLength = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < blockLength && currentDate < twoMonthsLater; i++) {
        bookedDates.push(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Skip 1-3 days between blocks
      const gap = Math.floor(Math.random() * 3) + 1;
      currentDate.setDate(currentDate.getDate() + gap);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  rooms[index].bookedDates = bookedDates;
  return saveRooms(rooms);
}

// Get booked dates for a room
export function getBookedDates(roomId) {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.bookedDates || [];
}

// Update booked dates for a room (used when saving from calendar)
export function updateBookedDates(roomId, bookedDates) {
  const rooms = loadRooms();
  const index = rooms.findIndex(room => room.id === roomId);
  if (index === -1) return false;

  rooms[index].bookedDates = bookedDates;
  return saveRooms(rooms);
}
