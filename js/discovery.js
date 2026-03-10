import { getNetworkProperties, getDiscoveryHotels, getDiscoveryMode, getDiscoveryAutoStart } from './orchestra.js';
import { getGeoState, isGeoEnabled } from './geo.js';

export const discoveryState = {
    active: false,
    stage: 'initial', // initial, profile, recommend, compare, deepdive, booking
    profile: {
        location: null,
        budget: null,
        season: null,
        party: null,
        preferences: [] // array of strings
    },
    shortlist: []
};

// Intent Detection patterns
const DISCOVERY_INTENTS = [
    /хочу отдохнуть/i, /хочу відпочити/i, /want to rest/i,
    /ищу отель/i, /шукаю готель/i, /looking for a hotel/i,
    /где остановиться/i, /де зупинитися/i, /where to stay/i,
    /рекомендуй/i, /посоветуй/i, /порадь/i, /recommend/i,
    /не знаю (какой|який) (выбрать|вибрати|отель|готель)/i,
    /помоги(те)? выбрать/i, /допоможіть обрати/i
];

// Return geo-filtered list of hotels for a given city (or all if no city)
export function getGeoFilteredProperties(city = null) {
    const networkProps = getNetworkProperties().filter(p => p.includeInSearch !== false).map(p => ({ ...p, _source: 'network' }));
    const discHotels = getDiscoveryHotels().filter(h => h.includeInSearch !== false).map(h => ({ ...h, _source: 'discovery' }));
    const all = [...networkProps, ...discHotels];
    if (!city) return all;
    const cityLower = city.toLowerCase();
    return all.filter(h => {
        if (!h.geoCity) return false;
        const hc = h.geoCity.toLowerCase();
        return hc === cityLower || hc.includes(cityLower) || cityLower.includes(hc);
    });
}

export function isDiscoveryQuery(message) {
    if (!getDiscoveryMode() || !getDiscoveryAutoStart()) return false;
    return DISCOVERY_INTENTS.some(pattern => pattern.test(message));
}

export function activateDiscoveryMode() {
    discoveryState.active = true;
    discoveryState.stage = 'profile';
}

export function resetDiscoveryMode() {
    discoveryState.active = false;
    discoveryState.stage = 'initial';
    discoveryState.profile = { location: null, budget: null, season: null, party: null, preferences: [] };
    discoveryState.shortlist = [];
}

export function updateProfile(newProfileData) {
    if (!newProfileData) return;
    discoveryState.profile = { ...discoveryState.profile, ...newProfileData };

    // Ensure preferences is an array
    if (typeof discoveryState.profile.preferences === 'string') {
        discoveryState.profile.preferences = discoveryState.profile.preferences.split(',').map(s => s.trim());
    } else if (!Array.isArray(discoveryState.profile.preferences)) {
        discoveryState.profile.preferences = [];
    }
}

export function scoreProperties() {
    const networkProps = getNetworkProperties()
        .filter(p => p.includeInSearch !== false)
        .map(p => ({ ...p, _source: 'network' }));
    const discHotels = getDiscoveryHotels()
        .filter(h => h.includeInSearch !== false)
        .map(h => ({ ...h, _source: 'discovery' }));
    const properties = [...networkProps, ...discHotels];
    const profile = discoveryState.profile;

    const scoredProps = properties.map(prop => {
        let score = 0;
        const desc = (prop.info || '').toLowerCase();
        const tags = (prop.discoveryTags || '').toLowerCase();
        const combinedText = desc + ' ' + tags;

        // Base priority (1-5) * 2 = max 10 points
        score += (prop.priority || 1) * 2;

        // GEO City match (50 points — highest priority)
        const geoState = getGeoState();
        const allHotels = [...networkProps, ...discHotels];
        const geoModeActive = isGeoEnabled(allHotels);

        if (geoState.city) {
            if (prop.geoCity) {
                const hotelCity = prop.geoCity.toLowerCase();
                const sessionCity = geoState.city.toLowerCase();
                if (hotelCity === sessionCity || hotelCity.includes(sessionCity) || sessionCity.includes(hotelCity)) {
                    score += 50; // City match — top priority
                } else {
                    score -= 80; // Wrong city — heavy penalty
                }
            } else if (geoModeActive) {
                score -= 40; // Geo mode on but hotel has no city tag
            }
        } else if (profile.location) {
            // Fallback: text-based location match (25 points, no geo set yet)
            if (combinedText.includes(profile.location.toLowerCase())) {
                score += 25;
            }
        }

        // Budget match (20 points)
        if (profile.budget && prop.minPrice) {
            const budgetLower = profile.budget.toString().toLowerCase();

            // If user typed a number
            const budgetNum = parseInt(budgetLower.replace(/\D/g, ''));
            if (!isNaN(budgetNum) && budgetNum > 0) {
                if (prop.minPrice <= budgetNum) {
                    score += 20;
                } else if (prop.minPrice <= budgetNum * 1.3) {
                    score += 10;
                }
            } else {
                // String budget like 'low', 'high', 'cheap', 'luxury'
                if ((budgetLower.includes('low') || budgetLower.includes('дешев') || budgetLower.includes('дешёв') || budgetLower.includes('cheap')) && prop.minPrice < 100) {
                    score += 20;
                } else if ((budgetLower.includes('high') || budgetLower.includes('дорог') || budgetLower.includes('lux')) && prop.starRating >= 4) {
                    score += 20;
                }
            }
        }

        // Preferences / Tags matching (up to 30 points)
        if (profile.preferences && profile.preferences.length > 0) {
            profile.preferences.forEach(pref => {
                if (combinedText.includes(pref.toLowerCase())) score += 15;
            });
        }

        // Seasonality / Weather context (15 points)
        if (profile.season) {
            if (combinedText.includes(profile.season.toLowerCase())) {
                score += 15;
            }
        }

        // Star rating bonus (max 10 points)
        if (prop.starRating) {
            score += parseInt(prop.starRating) * 2;
        }

        return { ...prop, discoveryScore: Math.min(score, 100) };
    });

    // Sort by score descending
    scoredProps.sort((a, b) => b.discoveryScore - a.discoveryScore);

    // Save to state
    discoveryState.shortlist = scoredProps.slice(0, 3).map(p => p.id);

    return scoredProps;
}
