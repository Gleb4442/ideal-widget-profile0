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
    return properties.find(p => p.id === id) || null;
}
