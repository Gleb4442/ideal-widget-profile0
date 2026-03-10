/*
 * GEO System Module
 * Hotel Agent — city-based filtering, location detection, travel stage
 */

const GEO_SESSION_KEY = 'geo_session';

// Known cities database — keys are lowercase (Cyrillic + Latin)
const KNOWN_CITIES = {
  // Ukraine
  'київ':             { city: 'Київ',             cityEn: 'Kyiv',           country: 'Україна',       countryEn: 'Ukraine' },
  'kyiv':             { city: 'Київ',             cityEn: 'Kyiv',           country: 'Україна',       countryEn: 'Ukraine' },
  'kiev':             { city: 'Київ',             cityEn: 'Kyiv',           country: 'Україна',       countryEn: 'Ukraine' },
  'львів':            { city: 'Львів',            cityEn: 'Lviv',           country: 'Україна',       countryEn: 'Ukraine' },
  'lviv':             { city: 'Львів',            cityEn: 'Lviv',           country: 'Україна',       countryEn: 'Ukraine' },
  'одеса':            { city: 'Одеса',            cityEn: 'Odesa',          country: 'Україна',       countryEn: 'Ukraine' },
  'одесса':           { city: 'Одеса',            cityEn: 'Odesa',          country: 'Україна',       countryEn: 'Ukraine' },
  'odesa':            { city: 'Одеса',            cityEn: 'Odesa',          country: 'Україна',       countryEn: 'Ukraine' },
  'odessa':           { city: 'Одеса',            cityEn: 'Odesa',          country: 'Україна',       countryEn: 'Ukraine' },
  'харків':           { city: 'Харків',           cityEn: 'Kharkiv',        country: 'Україна',       countryEn: 'Ukraine' },
  'харьков':          { city: 'Харків',           cityEn: 'Kharkiv',        country: 'Україна',       countryEn: 'Ukraine' },
  'kharkiv':          { city: 'Харків',           cityEn: 'Kharkiv',        country: 'Україна',       countryEn: 'Ukraine' },
  'дніпро':           { city: 'Дніпро',           cityEn: 'Dnipro',         country: 'Україна',       countryEn: 'Ukraine' },
  'дніпропетровськ':  { city: 'Дніпро',           cityEn: 'Dnipro',         country: 'Україна',       countryEn: 'Ukraine' },
  'dnipro':           { city: 'Дніпро',           cityEn: 'Dnipro',         country: 'Україна',       countryEn: 'Ukraine' },
  'запоріжжя':        { city: 'Запоріжжя',        cityEn: 'Zaporizhzhia',   country: 'Україна',       countryEn: 'Ukraine' },
  'запорожье':        { city: 'Запоріжжя',        cityEn: 'Zaporizhzhia',   country: 'Україна',       countryEn: 'Ukraine' },
  'zaporizhzhia':     { city: 'Запоріжжя',        cityEn: 'Zaporizhzhia',   country: 'Україна',       countryEn: 'Ukraine' },
  'буковель':         { city: 'Буковель',         cityEn: 'Bukovel',        country: 'Україна',       countryEn: 'Ukraine' },
  'bukovel':          { city: 'Буковель',         cityEn: 'Bukovel',        country: 'Україна',       countryEn: 'Ukraine' },
  'вінниця':          { city: 'Вінниця',          cityEn: 'Vinnytsia',      country: 'Україна',       countryEn: 'Ukraine' },
  'vinnytsia':        { city: 'Вінниця',          cityEn: 'Vinnytsia',      country: 'Україна',       countryEn: 'Ukraine' },
  'чернівці':         { city: 'Чернівці',         cityEn: 'Chernivtsi',     country: 'Україна',       countryEn: 'Ukraine' },
  'chernivtsi':       { city: 'Чернівці',         cityEn: 'Chernivtsi',     country: 'Україна',       countryEn: 'Ukraine' },
  'полтава':          { city: 'Полтава',          cityEn: 'Poltava',        country: 'Україна',       countryEn: 'Ukraine' },
  'poltava':          { city: 'Полтава',          cityEn: 'Poltava',        country: 'Україна',       countryEn: 'Ukraine' },
  'ужгород':          { city: 'Ужгород',          cityEn: 'Uzhhorod',       country: 'Україна',       countryEn: 'Ukraine' },
  'uzhhorod':         { city: 'Ужгород',          cityEn: 'Uzhhorod',       country: 'Україна',       countryEn: 'Ukraine' },
  'івано-франківськ': { city: 'Івано-Франківськ', cityEn: 'Ivano-Frankivsk',country: 'Україна',       countryEn: 'Ukraine' },
  'тернопіль':        { city: 'Тернопіль',        cityEn: 'Ternopil',       country: 'Україна',       countryEn: 'Ukraine' },
  'херсон':           { city: 'Херсон',           cityEn: 'Kherson',        country: 'Україна',       countryEn: 'Ukraine' },
  'миколаїв':         { city: 'Миколаїв',         cityEn: 'Mykolaiv',       country: 'Україна',       countryEn: 'Ukraine' },
  // Russia
  'москва':           { city: 'Москва',           cityEn: 'Moscow',         country: 'Россия',        countryEn: 'Russia' },
  'moscow':           { city: 'Москва',           cityEn: 'Moscow',         country: 'Россия',        countryEn: 'Russia' },
  'санкт-петербург':  { city: 'Санкт-Петербург',  cityEn: 'Saint Petersburg',country: 'Россия',       countryEn: 'Russia' },
  'питер':            { city: 'Санкт-Петербург',  cityEn: 'Saint Petersburg',country: 'Россия',       countryEn: 'Russia' },
  'петербург':        { city: 'Санкт-Петербург',  cityEn: 'Saint Petersburg',country: 'Россия',       countryEn: 'Russia' },
  'saint petersburg': { city: 'Санкт-Петербург',  cityEn: 'Saint Petersburg',country: 'Россия',       countryEn: 'Russia' },
  'сочи':             { city: 'Сочи',             cityEn: 'Sochi',          country: 'Россия',        countryEn: 'Russia' },
  'sochi':            { city: 'Сочи',             cityEn: 'Sochi',          country: 'Россия',        countryEn: 'Russia' },
  'казань':           { city: 'Казань',           cityEn: 'Kazan',          country: 'Россия',        countryEn: 'Russia' },
  'kazan':            { city: 'Казань',           cityEn: 'Kazan',          country: 'Россия',        countryEn: 'Russia' },
  // Belarus
  'минск':            { city: 'Минск',            cityEn: 'Minsk',          country: 'Беларусь',      countryEn: 'Belarus' },
  'minsk':            { city: 'Минск',            cityEn: 'Minsk',          country: 'Беларусь',      countryEn: 'Belarus' },
  // Georgia
  'тбилиси':          { city: 'Тбилиси',          cityEn: 'Tbilisi',        country: 'Грузия',        countryEn: 'Georgia' },
  'tbilisi':          { city: 'Тбилиси',          cityEn: 'Tbilisi',        country: 'Грузия',        countryEn: 'Georgia' },
  'батуми':           { city: 'Батуми',           cityEn: 'Batumi',         country: 'Грузия',        countryEn: 'Georgia' },
  'batumi':           { city: 'Батуми',           cityEn: 'Batumi',         country: 'Грузия',        countryEn: 'Georgia' },
  // Kazakhstan
  'алматы':           { city: 'Алматы',           cityEn: 'Almaty',         country: 'Казахстан',     countryEn: 'Kazakhstan' },
  'алма-ата':         { city: 'Алматы',           cityEn: 'Almaty',         country: 'Казахстан',     countryEn: 'Kazakhstan' },
  'almaty':           { city: 'Алматы',           cityEn: 'Almaty',         country: 'Казахстан',     countryEn: 'Kazakhstan' },
  'астана':           { city: 'Астана',           cityEn: 'Astana',         country: 'Казахстан',     countryEn: 'Kazakhstan' },
  'astana':           { city: 'Астана',           cityEn: 'Astana',         country: 'Казахстан',     countryEn: 'Kazakhstan' },
  // Western Europe
  'paris':            { city: 'Paris',            cityEn: 'Paris',          country: 'France',        countryEn: 'France' },
  'париж':            { city: 'Paris',            cityEn: 'Paris',          country: 'France',        countryEn: 'France' },
  'nice':             { city: 'Nice',             cityEn: 'Nice',           country: 'France',        countryEn: 'France' },
  'ницца':            { city: 'Nice',             cityEn: 'Nice',           country: 'France',        countryEn: 'France' },
  'london':           { city: 'London',           cityEn: 'London',         country: 'UK',            countryEn: 'UK' },
  'лондон':           { city: 'London',           cityEn: 'London',         country: 'UK',            countryEn: 'UK' },
  'berlin':           { city: 'Berlin',           cityEn: 'Berlin',         country: 'Germany',       countryEn: 'Germany' },
  'берлин':           { city: 'Berlin',           cityEn: 'Berlin',         country: 'Germany',       countryEn: 'Germany' },
  'munich':           { city: 'Munich',           cityEn: 'Munich',         country: 'Germany',       countryEn: 'Germany' },
  'мюнхен':           { city: 'Munich',           cityEn: 'Munich',         country: 'Germany',       countryEn: 'Germany' },
  'vienna':           { city: 'Vienna',           cityEn: 'Vienna',         country: 'Austria',       countryEn: 'Austria' },
  'вена':             { city: 'Vienna',           cityEn: 'Vienna',         country: 'Austria',       countryEn: 'Austria' },
  'rome':             { city: 'Rome',             cityEn: 'Rome',           country: 'Italy',         countryEn: 'Italy' },
  'рим':              { city: 'Rome',             cityEn: 'Rome',           country: 'Italy',         countryEn: 'Italy' },
  'milan':            { city: 'Milan',            cityEn: 'Milan',          country: 'Italy',         countryEn: 'Italy' },
  'милан':            { city: 'Milan',            cityEn: 'Milan',          country: 'Italy',         countryEn: 'Italy' },
  'venice':           { city: 'Venice',           cityEn: 'Venice',         country: 'Italy',         countryEn: 'Italy' },
  'венеция':          { city: 'Venice',           cityEn: 'Venice',         country: 'Italy',         countryEn: 'Italy' },
  'barcelona':        { city: 'Barcelona',        cityEn: 'Barcelona',      country: 'Spain',         countryEn: 'Spain' },
  'барселона':        { city: 'Barcelona',        cityEn: 'Barcelona',      country: 'Spain',         countryEn: 'Spain' },
  'madrid':           { city: 'Madrid',           cityEn: 'Madrid',         country: 'Spain',         countryEn: 'Spain' },
  'мадрид':           { city: 'Madrid',           cityEn: 'Madrid',         country: 'Spain',         countryEn: 'Spain' },
  'amsterdam':        { city: 'Amsterdam',        cityEn: 'Amsterdam',      country: 'Netherlands',   countryEn: 'Netherlands' },
  'амстердам':        { city: 'Amsterdam',        cityEn: 'Amsterdam',      country: 'Netherlands',   countryEn: 'Netherlands' },
  'prague':           { city: 'Prague',           cityEn: 'Prague',         country: 'Czech Republic',countryEn: 'Czech Republic' },
  'прага':            { city: 'Prague',           cityEn: 'Prague',         country: 'Czech Republic',countryEn: 'Czech Republic' },
  'warsaw':           { city: 'Warsaw',           cityEn: 'Warsaw',         country: 'Poland',        countryEn: 'Poland' },
  'варшава':          { city: 'Warsaw',           cityEn: 'Warsaw',         country: 'Poland',        countryEn: 'Poland' },
  'budapest':         { city: 'Budapest',         cityEn: 'Budapest',       country: 'Hungary',       countryEn: 'Hungary' },
  'будапешт':         { city: 'Budapest',         cityEn: 'Budapest',       country: 'Hungary',       countryEn: 'Hungary' },
  'istanbul':         { city: 'Istanbul',         cityEn: 'Istanbul',       country: 'Turkey',        countryEn: 'Turkey' },
  'стамбул':          { city: 'Istanbul',         cityEn: 'Istanbul',       country: 'Turkey',        countryEn: 'Turkey' },
  'antalya':          { city: 'Antalya',          cityEn: 'Antalya',        country: 'Turkey',        countryEn: 'Turkey' },
  'анталья':          { city: 'Antalya',          cityEn: 'Antalya',        country: 'Turkey',        countryEn: 'Turkey' },
  'анталия':          { city: 'Antalya',          cityEn: 'Antalya',        country: 'Turkey',        countryEn: 'Turkey' },
  'zurich':           { city: 'Zurich',           cityEn: 'Zurich',         country: 'Switzerland',   countryEn: 'Switzerland' },
  'цюрих':            { city: 'Zurich',           cityEn: 'Zurich',         country: 'Switzerland',   countryEn: 'Switzerland' },
  'lisbon':           { city: 'Lisbon',           cityEn: 'Lisbon',         country: 'Portugal',      countryEn: 'Portugal' },
  'лиссабон':         { city: 'Lisbon',           cityEn: 'Lisbon',         country: 'Portugal',      countryEn: 'Portugal' },
  'athens':           { city: 'Athens',           cityEn: 'Athens',         country: 'Greece',        countryEn: 'Greece' },
  'афины':            { city: 'Athens',           cityEn: 'Athens',         country: 'Greece',        countryEn: 'Greece' },
  'brussels':         { city: 'Brussels',         cityEn: 'Brussels',       country: 'Belgium',       countryEn: 'Belgium' },
  'брюссель':         { city: 'Brussels',         cityEn: 'Brussels',       country: 'Belgium',       countryEn: 'Belgium' },
  'stockholm':        { city: 'Stockholm',        cityEn: 'Stockholm',      country: 'Sweden',        countryEn: 'Sweden' },
  'стокгольм':        { city: 'Stockholm',        cityEn: 'Stockholm',      country: 'Sweden',        countryEn: 'Sweden' },
  'oslo':             { city: 'Oslo',             cityEn: 'Oslo',           country: 'Norway',        countryEn: 'Norway' },
  'осло':             { city: 'Oslo',             cityEn: 'Oslo',           country: 'Norway',        countryEn: 'Norway' },
  'copenhagen':       { city: 'Copenhagen',       cityEn: 'Copenhagen',     country: 'Denmark',       countryEn: 'Denmark' },
  'копенгаген':       { city: 'Copenhagen',       cityEn: 'Copenhagen',     country: 'Denmark',       countryEn: 'Denmark' },
  // Middle East
  'dubai':            { city: 'Dubai',            cityEn: 'Dubai',          country: 'UAE',           countryEn: 'UAE' },
  'дубай':            { city: 'Dubai',            cityEn: 'Dubai',          country: 'UAE',           countryEn: 'UAE' },
  'дубаи':            { city: 'Dubai',            cityEn: 'Dubai',          country: 'UAE',           countryEn: 'UAE' },
  'abu dhabi':        { city: 'Abu Dhabi',        cityEn: 'Abu Dhabi',      country: 'UAE',           countryEn: 'UAE' },
  'абу-даби':         { city: 'Abu Dhabi',        cityEn: 'Abu Dhabi',      country: 'UAE',           countryEn: 'UAE' },
  // Asia
  'tokyo':            { city: 'Tokyo',            cityEn: 'Tokyo',          country: 'Japan',         countryEn: 'Japan' },
  'токио':            { city: 'Tokyo',            cityEn: 'Tokyo',          country: 'Japan',         countryEn: 'Japan' },
  'singapore':        { city: 'Singapore',        cityEn: 'Singapore',      country: 'Singapore',     countryEn: 'Singapore' },
  'сингапур':         { city: 'Singapore',        cityEn: 'Singapore',      country: 'Singapore',     countryEn: 'Singapore' },
  'bangkok':          { city: 'Bangkok',          cityEn: 'Bangkok',        country: 'Thailand',      countryEn: 'Thailand' },
  'бангкок':          { city: 'Bangkok',          cityEn: 'Bangkok',        country: 'Thailand',      countryEn: 'Thailand' },
  'phuket':           { city: 'Phuket',           cityEn: 'Phuket',         country: 'Thailand',      countryEn: 'Thailand' },
  'пхукет':           { city: 'Phuket',           cityEn: 'Phuket',         country: 'Thailand',      countryEn: 'Thailand' },
  'bali':             { city: 'Bali',             cityEn: 'Bali',           country: 'Indonesia',     countryEn: 'Indonesia' },
  'бали':             { city: 'Bali',             cityEn: 'Bali',           country: 'Indonesia',     countryEn: 'Indonesia' },
  'beijing':          { city: 'Beijing',          cityEn: 'Beijing',        country: 'China',         countryEn: 'China' },
  'пекин':            { city: 'Beijing',          cityEn: 'Beijing',        country: 'China',         countryEn: 'China' },
  'shanghai':         { city: 'Shanghai',         cityEn: 'Shanghai',       country: 'China',         countryEn: 'China' },
  'шанхай':           { city: 'Shanghai',         cityEn: 'Shanghai',       country: 'China',         countryEn: 'China' },
  'hong kong':        { city: 'Hong Kong',        cityEn: 'Hong Kong',      country: 'China',         countryEn: 'China' },
  'гонконг':          { city: 'Hong Kong',        cityEn: 'Hong Kong',      country: 'China',         countryEn: 'China' },
  'seoul':            { city: 'Seoul',            cityEn: 'Seoul',          country: 'South Korea',   countryEn: 'South Korea' },
  'сеул':             { city: 'Seoul',            cityEn: 'Seoul',          country: 'South Korea',   countryEn: 'South Korea' },
  'mumbai':           { city: 'Mumbai',           cityEn: 'Mumbai',         country: 'India',         countryEn: 'India' },
  'мумбай':           { city: 'Mumbai',           cityEn: 'Mumbai',         country: 'India',         countryEn: 'India' },
  'delhi':            { city: 'Delhi',            cityEn: 'Delhi',          country: 'India',         countryEn: 'India' },
  'дели':             { city: 'Delhi',            cityEn: 'Delhi',          country: 'India',         countryEn: 'India' },
  'maldives':         { city: 'Maldives',         cityEn: 'Maldives',       country: 'Maldives',      countryEn: 'Maldives' },
  'мальдивы':         { city: 'Maldives',         cityEn: 'Maldives',       country: 'Maldives',      countryEn: 'Maldives' },
  'мальдіви':         { city: 'Maldives',         cityEn: 'Maldives',       country: 'Maldives',      countryEn: 'Maldives' },
  // Americas
  'new york':         { city: 'New York',         cityEn: 'New York',       country: 'USA',           countryEn: 'USA' },
  'нью-йорк':         { city: 'New York',         cityEn: 'New York',       country: 'USA',           countryEn: 'USA' },
  'нью йорк':         { city: 'New York',         cityEn: 'New York',       country: 'USA',           countryEn: 'USA' },
  'miami':            { city: 'Miami',            cityEn: 'Miami',          country: 'USA',           countryEn: 'USA' },
  'майами':           { city: 'Miami',            cityEn: 'Miami',          country: 'USA',           countryEn: 'USA' },
  'los angeles':      { city: 'Los Angeles',      cityEn: 'Los Angeles',    country: 'USA',           countryEn: 'USA' },
  'лос-анджелес':     { city: 'Los Angeles',      cityEn: 'Los Angeles',    country: 'USA',           countryEn: 'USA' },
  'san francisco':    { city: 'San Francisco',    cityEn: 'San Francisco',  country: 'USA',           countryEn: 'USA' },
  'сан-франциско':    { city: 'San Francisco',    cityEn: 'San Francisco',  country: 'USA',           countryEn: 'USA' },
  'cancun':           { city: 'Cancun',           cityEn: 'Cancun',         country: 'Mexico',        countryEn: 'Mexico' },
  'канкун':           { city: 'Cancun',           cityEn: 'Cancun',         country: 'Mexico',        countryEn: 'Mexico' },
  // Africa / Egypt
  'cairo':            { city: 'Cairo',            cityEn: 'Cairo',          country: 'Egypt',         countryEn: 'Egypt' },
  'каир':             { city: 'Cairo',            cityEn: 'Cairo',          country: 'Egypt',         countryEn: 'Egypt' },
  'hurghada':         { city: 'Hurghada',         cityEn: 'Hurghada',       country: 'Egypt',         countryEn: 'Egypt' },
  'хургада':          { city: 'Hurghada',         cityEn: 'Hurghada',       country: 'Egypt',         countryEn: 'Egypt' },
  'sharm el sheikh':  { city: 'Sharm el-Sheikh',  cityEn: 'Sharm el-Sheikh',country: 'Egypt',         countryEn: 'Egypt' },
  'шарм-эль-шейх':    { city: 'Sharm el-Sheikh',  cityEn: 'Sharm el-Sheikh',country: 'Egypt',         countryEn: 'Egypt' },
  'шарм-ель-шейх':    { city: 'Sharm el-Sheikh',  cityEn: 'Sharm el-Sheikh',country: 'Egypt',         countryEn: 'Egypt' },
};

// Detect guest is during their current stay
const DURING_STAY_PATTERNS = [
  /я\s*(вже|уже)\s*(в|у)\s*(готелі|отеле|hotel)/i,
  /я\s*заселив(?:ся)?|я\s*заселил(?:ся)?/i,
  /мій\s*номер|мой\s*номер|my\s*room\s*number/i,
  /я\s*тут\s*(вже|уже)/i,
  /я\s*вже\s*заїхав|я\s*уже\s*заехал|i[''m\s]*checked\s*in/i,
];

// Detect post-stay scenario
const POST_STAY_PATTERNS = [
  /вже\s*виїхав|уже\s*выехал|already\s*checked\s*out/i,
  /наступна\s*поїздка|следующая\s*поездка|next\s*trip/i,
  /знову\s*поїду|снова\s*поеду|going\s*back/i,
  /після\s*(?:відпочинку|поїздки|виїзду)|после\s*(?:отдыха|поездки|выезда)/i,
];

// In-memory cache
let _geoState = null;

// ─── State Management ────────────────────────────────────────────────────────

export function getGeoState() {
  if (_geoState) return _geoState;
  try {
    const saved = localStorage.getItem(GEO_SESSION_KEY);
    _geoState = saved
      ? JSON.parse(saved)
      : { city: null, country: null, travelStage: 'pre-checkin' };
  } catch (e) {
    _geoState = { city: null, country: null, travelStage: 'pre-checkin' };
  }
  return _geoState;
}

export function setGeoState(update) {
  _geoState = { ...getGeoState(), ...update };
  try {
    localStorage.setItem(GEO_SESSION_KEY, JSON.stringify(_geoState));
  } catch (e) { /* ignore */ }
  return _geoState;
}

export function resetGeoState() {
  _geoState = { city: null, country: null, travelStage: 'pre-checkin' };
  try { localStorage.removeItem(GEO_SESSION_KEY); } catch (e) { /* ignore */ }
}

// ─── Location Extraction ─────────────────────────────────────────────────────

export function extractLocationFromMessage(message) {
  const lower = message.toLowerCase().trim();

  // Sort by key length descending so multi-word cities are matched first
  const sorted = Object.entries(KNOWN_CITIES).sort((a, b) => b[0].length - a[0].length);

  for (const [key, data] of sorted) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s\\-]+');
    const regex = new RegExp(`(?:^|[\\s,;:.!?()])${escaped}(?=$|[\\s,;:.!?()])`, 'i');
    if (regex.test(' ' + lower + ' ')) {
      return data;
    }
  }

  // Fallback: "в місті X" / "в городе X" / "поїздка в X" / etc.
  const prepRegex = /(?:в\s*місті|в\s*городе|в\s*місто|в\s*город|до\s*міста|поїздка\s*в|поездка\s*в|їду\s*до|їду\s*в|еду\s*в|лечу\s*в|летю\s*в|планую\s*в|планирую\s*в|відпочивати\s*в|отдыхать\s*в)\s+([А-ЯЁЇІЄ][а-яёїіє\-]{2,}(?:\s+[А-ЯЁЇІЄ][а-яёїіє\-]+)?)/;
  const match = message.match(prepRegex);
  if (match && match[1]) {
    const cityName = match[1].trim();
    const cityLower = cityName.toLowerCase();
    if (KNOWN_CITIES[cityLower]) return KNOWN_CITIES[cityLower];
    if (cityName.length >= 3) {
      return { city: cityName, cityEn: cityName, country: null, countryEn: null };
    }
  }

  return null;
}

// ─── Travel Stage Detection ───────────────────────────────────────────────────

export function detectTravelStage(message) {
  if (DURING_STAY_PATTERNS.some(p => p.test(message))) return 'during-stay';
  if (POST_STAY_PATTERNS.some(p => p.test(message))) return 'post-stay';
  return null;
}

// ─── Hotel Filtering ─────────────────────────────────────────────────────────

export function filterHotelsByCity(hotels, city) {
  if (!city) return hotels;
  const cityLower = city.toLowerCase();
  return hotels.filter(h => {
    if (!h.geoCity) return false;
    const hotelCity = h.geoCity.toLowerCase();
    return hotelCity === cityLower
      || hotelCity.includes(cityLower)
      || cityLower.includes(hotelCity);
  });
}

// Check if geo mode is active (at least one hotel has a geoCity tag)
export function isGeoEnabled(hotels) {
  return Array.isArray(hotels) && hotels.some(h => h.geoCity && h.geoCity.trim());
}

// Count hotels available in a city
export function countHotelsInCity(hotels, city) {
  return filterHotelsByCity(hotels, city).length;
}

// Get all unique cities from hotel list
export function getAvailableCities(hotels) {
  const cities = new Set();
  hotels.forEach(h => {
    if (h.geoCity && h.geoCity.trim()) cities.add(h.geoCity.trim());
  });
  return [...cities];
}
