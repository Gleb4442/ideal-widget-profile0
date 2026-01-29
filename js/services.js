/*
 * Services Management Module
 * Hilton Chat Widget
 */

const STORAGE_KEY = 'hotel_services';
const MAX_IMAGE_SIZE = 800;

// Generate unique ID
function generateId() {
  return 'srv_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// Load services from localStorage
export function loadServices() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading services:', e);
    return [];
  }
}

// Save services to localStorage
export function saveServices(services) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
    return true;
  } catch (e) {
    console.error('Error saving services:', e);
    if (e.name === 'QuotaExceededError') {
      alert('Storage limit exceeded. Try using smaller images.');
    }
    return false;
  }
}

// Get all services
export function getAllServices() {
  return loadServices();
}

// Get service by ID
export function getService(id) {
  const services = loadServices();
  return services.find(service => service.id === id) || null;
}

// Add new service
export function addService(serviceData) {
  const services = loadServices();
  const newService = {
    id: generateId(),
    name: serviceData.name || '',
    description: serviceData.description || '',
    price: serviceData.price || 0,
    priceType: serviceData.priceType || 'fixed', // 'fixed' | 'per_hour' | 'per_day' | 'on_request'
    mainPhoto: serviceData.mainPhoto || '',
    gallery: serviceData.gallery || [],
    category: serviceData.category || 'general',
    askQuestionEnabled: serviceData.askQuestionEnabled !== false,
    addToBookingEnabled: serviceData.addToBookingEnabled !== false,
    // Marketing fields
    badge: serviceData.badge || '',
    leftCount: serviceData.leftCount || 0,
    discount: serviceData.discount || 0,
    originalPrice: serviceData.originalPrice || 0,
    reviews: serviceData.reviews || [], // New reviews field
    createdAt: Date.now()
  };

  services.push(newService);

  if (saveServices(services)) {
    return newService;
  }
  return null;
}

// Update existing service
export function updateService(id, serviceData) {
  const services = loadServices();
  const index = services.findIndex(service => service.id === id);

  if (index === -1) return null;

  services[index] = {
    ...services[index],
    name: serviceData.name ?? services[index].name,
    description: serviceData.description ?? services[index].description,
    price: serviceData.price ?? services[index].price,
    priceType: serviceData.priceType ?? services[index].priceType,
    mainPhoto: serviceData.mainPhoto ?? services[index].mainPhoto,
    gallery: serviceData.gallery ?? services[index].gallery,
    category: serviceData.category ?? services[index].category,
    askQuestionEnabled: serviceData.askQuestionEnabled ?? services[index].askQuestionEnabled,
    addToBookingEnabled: serviceData.addToBookingEnabled ?? services[index].addToBookingEnabled,
    // Marketing fields
    badge: serviceData.badge ?? services[index].badge ?? '',
    leftCount: serviceData.leftCount ?? services[index].leftCount ?? 0,
    discount: serviceData.discount ?? services[index].discount ?? 0,
    originalPrice: serviceData.originalPrice ?? services[index].originalPrice ?? 0,
    reviews: serviceData.reviews ?? services[index].reviews ?? [], // Preserve or update reviews
    updatedAt: Date.now()
  };

  if (saveServices(services)) {
    return services[index];
  }
  return null;
}

// Delete service
export function deleteService(id) {
  const services = loadServices();
  const filtered = services.filter(service => service.id !== id);

  if (filtered.length === services.length) return false;

  return saveServices(filtered);
}

// Get services count
export function getServicesCount() {
  return loadServices().length;
}

// Check if any services exist
export function hasServices() {
  return loadServices().length > 0;
}

// Format price for display
export function formatPrice(price, priceType = 'fixed') {
  if (priceType === 'on_request') {
    return 'По запросу';
  }

  const formattedPrice = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);

  switch (priceType) {
    case 'per_hour':
      return `${formattedPrice}/час`;
    case 'per_day':
      return `${formattedPrice}/день`;
    default:
      return formattedPrice;
  }
}

// Service categories
export const SERVICE_CATEGORIES = [
  { id: 'spa', name: 'SPA & Wellness', icon: 'spa' },
  { id: 'restaurant', name: 'Ресторан', icon: 'restaurant' },
  { id: 'transport', name: 'Трансфер', icon: 'car' },
  { id: 'entertainment', name: 'Развлечения', icon: 'entertainment' },
  { id: 'business', name: 'Бизнес', icon: 'business' },
  { id: 'kids', name: 'Для детей', icon: 'kids' },
  { id: 'general', name: 'Другое', icon: 'general' }
];

// Get category name
export function getCategoryName(categoryId) {
  const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
  return category ? category.name : 'Другое';
}

// Get full category info
export function getCategoryInfo(categoryId) {
  return SERVICE_CATEGORIES.find(c => c.id === categoryId) || { id: 'general', name: 'Другое', icon: 'general' };
}

// Format service price with priceType
export function formatServicePrice(service) {
  return formatPrice(service.price, service.priceType);
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
