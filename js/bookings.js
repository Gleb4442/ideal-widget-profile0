/*
 * Bookings Management Module
 * Handles multiple guest bookings with CRUD operations
 */

const BOOKINGS_STORAGE_KEY = 'hotel_bookings';

// Generate unique booking ID
function generateBookingId() {
  return 'BKG-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Format date for display (DD.MM.YYYY)
function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

// Calculate nights between dates
function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Load all bookings from localStorage
export function loadBookings() {
  try {
    const data = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading bookings:', e);
    return [];
  }
}

// Save bookings to localStorage
export function saveBookings(bookings) {
  try {
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    return true;
  } catch (e) {
    console.error('Error saving bookings:', e);
    return false;
  }
}

// Get all bookings
export function getAllBookings() {
  return loadBookings();
}

// Get booking by ID
export function getBookingById(bookingId) {
  const bookings = loadBookings();
  return bookings.find(b => b.id === bookingId) || null;
}

// Find bookings by guest name (partial match)
export function findBookingsByName(guestName) {
  const bookings = loadBookings();
  const searchTerm = guestName.toLowerCase().trim();
  return bookings.filter(b =>
    b.guestName.toLowerCase().includes(searchTerm)
  );
}

// Add new booking
export function addBooking(bookingData) {
  const bookings = loadBookings();

  const newBooking = {
    id: generateBookingId(),
    guestName: bookingData.guestName || '',
    phone: bookingData.phone || '',
    email: bookingData.email || '',
    checkIn: bookingData.checkIn || '',
    checkOut: bookingData.checkOut || '',
    roomName: bookingData.roomName || '',
    guests: bookingData.guests || 1,
    specialRequests: bookingData.specialRequests || '',
    status: bookingData.status || 'confirmed', // confirmed, cancelled, completed
    totalPrice: bookingData.totalPrice || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Calculate nights
  newBooking.nights = calculateNights(newBooking.checkIn, newBooking.checkOut);

  bookings.push(newBooking);

  if (saveBookings(bookings)) {
    return newBooking;
  }
  return null;
}

// Update booking
export function updateBooking(bookingId, updates) {
  const bookings = loadBookings();
  const index = bookings.findIndex(b => b.id === bookingId);

  if (index === -1) return null;

  bookings[index] = {
    ...bookings[index],
    ...updates,
    updatedAt: Date.now()
  };

  // Recalculate nights if dates changed
  if (updates.checkIn || updates.checkOut) {
    bookings[index].nights = calculateNights(
      bookings[index].checkIn,
      bookings[index].checkOut
    );
  }

  if (saveBookings(bookings)) {
    return bookings[index];
  }
  return null;
}

// Cancel booking (mark as cancelled)
export function cancelBooking(bookingId) {
  return updateBooking(bookingId, { status: 'cancelled' });
}

// Delete booking permanently
export function deleteBooking(bookingId) {
  const bookings = loadBookings();
  const filtered = bookings.filter(b => b.id !== bookingId);

  if (filtered.length === bookings.length) return false;

  return saveBookings(filtered);
}

// Get active bookings (not cancelled)
export function getActiveBookings() {
  const bookings = loadBookings();
  return bookings.filter(b => b.status !== 'cancelled');
}

// Get bookings by status
export function getBookingsByStatus(status) {
  const bookings = loadBookings();
  return bookings.filter(b => b.status === status);
}

// Get upcoming bookings (check-in date in the future)
export function getUpcomingBookings() {
  const bookings = loadBookings();
  const today = new Date().toISOString().split('T')[0];
  return bookings.filter(b =>
    b.status === 'confirmed' && b.checkIn >= today
  ).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

// Get current bookings (currently staying)
export function getCurrentBookings() {
  const bookings = loadBookings();
  const today = new Date().toISOString().split('T')[0];
  return bookings.filter(b =>
    b.status === 'confirmed' &&
    b.checkIn <= today &&
    b.checkOut > today
  );
}

// Search bookings by multiple criteria
export function searchBookings(criteria) {
  let bookings = loadBookings();

  if (criteria.guestName) {
    const searchTerm = criteria.guestName.toLowerCase();
    bookings = bookings.filter(b =>
      b.guestName.toLowerCase().includes(searchTerm)
    );
  }

  if (criteria.phone) {
    bookings = bookings.filter(b => b.phone.includes(criteria.phone));
  }

  if (criteria.email) {
    const searchTerm = criteria.email.toLowerCase();
    bookings = bookings.filter(b =>
      b.email.toLowerCase().includes(searchTerm)
    );
  }

  if (criteria.status) {
    bookings = bookings.filter(b => b.status === criteria.status);
  }

  if (criteria.roomName) {
    const searchTerm = criteria.roomName.toLowerCase();
    bookings = bookings.filter(b =>
      b.roomName.toLowerCase().includes(searchTerm)
    );
  }

  return bookings;
}

// Format booking for display
export function formatBooking(booking) {
  return {
    ...booking,
    checkInFormatted: formatDateDisplay(booking.checkIn),
    checkOutFormatted: formatDateDisplay(booking.checkOut),
    nightsText: booking.nights === 1 ? '1 ночь' : `${booking.nights} ночей`,
    statusText: getStatusText(booking.status),
    totalPriceFormatted: formatPrice(booking.totalPrice)
  };
}

// Get status text in Russian
function getStatusText(status) {
  const statusMap = {
    'confirmed': 'Подтверждено',
    'cancelled': 'Отменено',
    'completed': 'Завершено'
  };
  return statusMap[status] || status;
}

// Format price
function formatPrice(price) {
  if (!price) return '0 $';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

// ============================================
// TEST DATA GENERATION
// ============================================

// Generate test bookings with random data
export function generateTestBookings() {
  const testGuests = [
    { name: 'Іванов Петро Сергійович', phone: '+380501234567', email: 'ivanov@example.com' },
    { name: 'Петренко Марина Олександрівна', phone: '+380502345678', email: 'petrenko@example.com' },
    { name: 'Сидоров Олексій Миколайович', phone: '+380503456789', email: 'sidorov@example.com' },
    { name: 'Коваленко Анна Петрівна', phone: '+380504567890', email: 'kovalenko@example.com' },
    { name: 'Мельник Сергій Іванович', phone: '+380505678901', email: 'melnyk@example.com' },
    { name: 'Шевченко Ольга Вікторівна', phone: '+380506789012', email: 'shevchenko@example.com' },
    { name: 'Бондаренко Дмитро Андрійович', phone: '+380507890123', email: 'bondarenko@example.com' },
    { name: 'Ткаченко Наталія Сергіївна', phone: '+380508901234', email: 'tkachenko@example.com' },
    { name: 'Кравченко Володимир Олегович', phone: '+380509012345', email: 'kravchenko@example.com' },
    { name: 'Морозова Тетяна Вікторівна', phone: '+380501011121', email: 'morozova@example.com' },
    { name: 'Павленко Ігор Павлович', phone: '+380502021222', email: 'pavlenko@example.com' },
    { name: 'Гриценко Юлія Миколаївна', phone: '+380503031323', email: 'grytsenko@example.com' },
    { name: 'Романенко Андрій Васильович', phone: '+380504041424', email: 'romanenko@example.com' },
    { name: 'Литвиненко Світлана Олександрівна', phone: '+380505051525', email: 'lytvynenko@example.com' },
    { name: 'Семенов Максим Дмитрович', phone: '+380506061626', email: 'semenov@example.com' },
    { name: 'Захарова Олена Сергіївна', phone: '+380507071727', email: 'zakharova@example.com' },
    { name: 'Соколов Артем Вікторович', phone: '+380508081828', email: 'sokolov@example.com' },
    { name: 'Новікова Ірина Петрівна', phone: '+380509091929', email: 'novikova@example.com' }
  ];

  const rooms = [
    { name: 'Стандартний номер', price: 1500 },
    { name: 'Покращений номер', price: 2000 },
    { name: 'Делюкс', price: 2500 },
    { name: 'Сімейний номер', price: 3000 },
    { name: 'Люкс', price: 4000 }
  ];

  const specialRequests = [
    'Ранній заїзд',
    'Пізній виїзд',
    'Номер на високому поверсі',
    'Тихий номер',
    'З видом на море',
    'Дитяче ліжечко',
    'Додаткові рушники',
    'Гіпоалергенні подушки',
    '',
    ''
  ];

  const bookings = [];
  const today = new Date();

  // Generate 18 bookings
  for (let i = 0; i < 18; i++) {
    const guest = testGuests[i % testGuests.length];
    const room = rooms[Math.floor(Math.random() * rooms.length)];

    // Random check-in date (from -10 days to +30 days)
    const checkInOffset = Math.floor(Math.random() * 40) - 10;
    const checkIn = new Date(today);
    checkIn.setDate(checkIn.getDate() + checkInOffset);

    // Random stay duration (2-7 nights)
    const nights = Math.floor(Math.random() * 6) + 2;
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + nights);

    // Determine status based on dates
    let status = 'confirmed';
    if (checkOut < today) {
      status = Math.random() > 0.3 ? 'completed' : 'cancelled';
    } else if (Math.random() > 0.9) {
      status = 'cancelled';
    }

    const booking = {
      guestName: guest.name,
      phone: guest.phone,
      email: guest.email,
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      roomName: room.name,
      guests: Math.floor(Math.random() * 3) + 1,
      specialRequests: specialRequests[Math.floor(Math.random() * specialRequests.length)],
      status: status,
      totalPrice: room.price * nights
    };

    const created = addBooking(booking);
    if (created) {
      bookings.push(created);
    }
  }

  return bookings;
}

// Clear all bookings
export function clearAllBookings() {
  return saveBookings([]);
}

// Get booking statistics
export function getBookingStats() {
  const bookings = loadBookings();
  const active = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const completed = bookings.filter(b => b.status === 'completed');
  const upcoming = getUpcomingBookings();
  const current = getCurrentBookings();

  return {
    total: bookings.length,
    active: active.length,
    cancelled: cancelled.length,
    completed: completed.length,
    upcoming: upcoming.length,
    current: current.length
  };
}
