// Orchestra Mode Logic
const ORCHESTRA_MODE_KEY = 'orchestra_mode';
const NETWORK_PROPERTIES_KEY = 'network_properties';

// Default initial state
export function getOrchestraMode() {
    try {
        const mode = localStorage.getItem(ORCHESTRA_MODE_KEY);
        return mode ? JSON.parse(mode) : false;
    } catch (e) {
        return false;
    }
}

export function setOrchestraMode(enabled) {
    try {
        localStorage.setItem(ORCHESTRA_MODE_KEY, JSON.stringify(enabled));
    } catch (e) {
        console.error('Error saving orchestra mode', e);
    }
}

// Discovery Mode Settings
const DISCOVERY_MODE_KEY = 'discovery_mode';
const DISCOVERY_AUTOSTART_KEY = 'discovery_autostart';

export function getDiscoveryMode() {
    try {
        const mode = localStorage.getItem(DISCOVERY_MODE_KEY);
        return mode ? JSON.parse(mode) : false;
    } catch (e) {
        return false;
    }
}

export function setDiscoveryMode(enabled) {
    try {
        localStorage.setItem(DISCOVERY_MODE_KEY, JSON.stringify(enabled));
    } catch (e) {
        console.error('Error saving discovery mode', e);
    }
}

export function getDiscoveryAutoStart() {
    try {
        const enabled = localStorage.getItem(DISCOVERY_AUTOSTART_KEY);
        // Default true if not set
        return enabled === null ? true : JSON.parse(enabled);
    } catch (e) {
        return true;
    }
}

export function setDiscoveryAutoStart(enabled) {
    try {
        localStorage.setItem(DISCOVERY_AUTOSTART_KEY, JSON.stringify(enabled));
    } catch (e) {
        console.error('Error saving discovery autostart', e);
    }
}

export function getNetworkProperties() {
    try {
        const props = localStorage.getItem(NETWORK_PROPERTIES_KEY);
        return props ? JSON.parse(props) : [];
    } catch (e) {
        return [];
    }
}

// =============================================
// Network (Chain) Settings — name + logo shown in header
// before a specific property is selected
// =============================================
const NETWORK_SETTINGS_KEY = 'network_chain_settings';

export function getNetworkSettings() {
    try {
        const s = localStorage.getItem(NETWORK_SETTINGS_KEY);
        return s ? JSON.parse(s) : { name: '', logoUrl: '' };
    } catch (e) {
        return { name: '', logoUrl: '' };
    }
}

export function saveNetworkSettings(settings) {
    try {
        localStorage.setItem(NETWORK_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving network settings', e);
    }
}

export function saveNetworkProperties(properties) {
    try {
        localStorage.setItem(NETWORK_PROPERTIES_KEY, JSON.stringify(properties));
    } catch (e) {
        console.error('Error saving network properties', e);
    }
}

export function addProperty(propertyData) {
    const properties = getNetworkProperties();
    const newProperty = {
        id: 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...propertyData,
        createdAt: new Date().toISOString()
    };
    properties.push(newProperty);
    saveNetworkProperties(properties);
    return newProperty;
}

export function updateProperty(id, propertyData) {
    const properties = getNetworkProperties();
    const index = properties.findIndex(p => p.id === id);
    if (index !== -1) {
        properties[index] = { ...properties[index], ...propertyData, updatedAt: new Date().toISOString() };
        saveNetworkProperties(properties);
        return true;
    }
    return false;
}

export function deleteProperty(id) {
    let properties = getNetworkProperties();
    const initialLength = properties.length;
    properties = properties.filter(p => p.id !== id);
    if (properties.length !== initialLength) {
        saveNetworkProperties(properties);
        return true;
    }
    return false;
}

export function getProperty(id) {
    const properties = getNetworkProperties();
    const found = properties.find(p => p.id === id);
    if (found) return found;
    const discoveryHotels = getDiscoveryHotels();
    return discoveryHotels.find(h => h.id === id) || null;
}

// =============================================
// Discovery Hotels (independent, not in a network)
// =============================================
const DISCOVERY_HOTELS_KEY = 'discovery_hotels';

export function getDiscoveryHotels() {
    try {
        const h = localStorage.getItem(DISCOVERY_HOTELS_KEY);
        return h ? JSON.parse(h) : [];
    } catch (e) {
        return [];
    }
}

export function saveDiscoveryHotels(hotels) {
    try {
        localStorage.setItem(DISCOVERY_HOTELS_KEY, JSON.stringify(hotels));
    } catch (e) {
        console.error('Error saving discovery hotels', e);
    }
}

export function addDiscoveryHotel(hotelData) {
    const hotels = getDiscoveryHotels();
    const newHotel = {
        id: 'disc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...hotelData,
        createdAt: new Date().toISOString()
    };
    hotels.push(newHotel);
    saveDiscoveryHotels(hotels);
    return newHotel;
}

export function updateDiscoveryHotel(id, hotelData) {
    const hotels = getDiscoveryHotels();
    const index = hotels.findIndex(h => h.id === id);
    if (index !== -1) {
        hotels[index] = { ...hotels[index], ...hotelData, updatedAt: new Date().toISOString() };
        saveDiscoveryHotels(hotels);
        return true;
    }
    return false;
}

export function deleteDiscoveryHotel(id) {
    let hotels = getDiscoveryHotels();
    const initialLength = hotels.length;
    hotels = hotels.filter(h => h.id !== id);
    if (hotels.length !== initialLength) {
        saveDiscoveryHotels(hotels);
        return true;
    }
    return false;
}

export function getDiscoveryHotel(id) {
    return getDiscoveryHotels().find(h => h.id === id) || null;
}

// =============================================
// Checkin Hotel Selection
// =============================================
const CHECKIN_HOTEL_ID_KEY = 'checkin_hotel_id';

export function getCheckedInHotelId() {
    try {
        return localStorage.getItem(CHECKIN_HOTEL_ID_KEY) || null;
    } catch (e) {
        return null;
    }
}

export function setCheckedInHotelId(id) {
    try {
        if (id) {
            localStorage.setItem(CHECKIN_HOTEL_ID_KEY, id);
        } else {
            localStorage.removeItem(CHECKIN_HOTEL_ID_KEY);
        }
    } catch (e) {
        console.error('Error saving checkin hotel id', e);
    }
}

export function getCheckedInHotel() {
    const id = getCheckedInHotelId();
    if (!id) return null;
    return getProperty(id) || getDiscoveryHotel(id) || null;
}
