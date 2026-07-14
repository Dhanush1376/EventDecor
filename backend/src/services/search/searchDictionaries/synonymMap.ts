// ── Synonym Expansion Map ──
// Maps English catalog terms to all synonyms including Telugu transliterations.
export const SYNONYM_MAP: Record<string, string[]> = {
  // Core product types
  mandap: ['mandapam', 'stage', 'wedding altar', 'wedding stage', 'ceremony stage'],
  mandapam: ['mandap', 'stage', 'wedding altar'],
  coconut: [
    'kobbari',
    'kobbari bondam',
    'kobbari kaya',
    'nariyal',
    'tender coconut',
    'coconut decor',
  ],
  turmeric: ['pasupu', 'kumkuma', 'haldi', 'kumkum'],
  garland: ['mala', 'poola danda', 'haar', 'flower garland', 'toran', 'thoranam'],
  tray: ['thali', 'thambulam', 'tambulam', 'plate', 'platter', 'presentation'],
  'return gift': ['thambulam', 'tambulam', 'prasadam', 'hamper', 'gift box'],
  'welcome board': ['swagath board', 'entrance board', 'name board'],

  // Event types
  wedding: ['marriage', 'shaadi', 'vivah', 'kalyanam', 'pelli', 'pendli', 'vivaham'],
  floral: ['flower', 'flowers', 'bouquet', 'garland', 'mala', 'poolu', 'poola'],
  pooja: ['puja', 'prayer', 'worship', 'homam', 'havan', 'vratham', 'vratam'],
  rangoli: ['kolam', 'muggu', 'alpana', 'floor art'],
  birthday: ['bday', 'celebration', 'party', 'first birthday'],
  engagement: ['ring ceremony', 'nischayam', 'nischitartham', 'betrothal'],
  housewarming: ['gruhapravesam', 'gruhapravesh', 'griha pravesh', 'new house', 'vastushanti'],
  'baby shower': ['seemantham', 'srimantham', 'godh bharai', 'valaikappu'],
  anniversary: ['wedding anniversary', 'celebration'],
  haldi: ['turmeric ceremony', 'pithi', 'pasupu', 'mangala snanam'],
  mehendi: ['mehndi', 'henna', 'gorintaku'],
  sangeet: ['music night', 'dance night', 'sangeeth', 'pre-wedding'],
  reception: ['grand reception', 'wedding reception', 'virandhu'],
  'naming ceremony': ['cradle ceremony', 'naamkaran', 'namakaranam'],
  'half saree function': ['langa voni', 'half saree', 'puberty ceremony', 'coming of age'],

  // Decor & design
  lighting: ['lights', 'lamps', 'candles', 'diyas', 'led', 'illumination', 'diya'],
  traditional: ['heritage', 'classical', 'ethnic', 'desi'],
  modern: ['contemporary', 'minimalist', 'minimal', 'trendy'],
  luxury: ['premium', 'exclusive', 'high-end', 'deluxe', 'grand'],
  decor: ['decoration', 'decorations', 'setup', 'arrangement'],
  decoration: ['decor', 'setup', 'arrangement', 'styling', 'alankarana'],
  stage: ['backdrop', 'mandap', 'platform', 'mandapam'],
  balloon: ['balloons', 'helium', 'arch'],

  // Color mappings
  gold: ['golden', 'gilded', 'bangaru'],
  silver: ['metallic', 'chrome'],
  pink: ['rose', 'blush', 'magenta'],
  red: ['crimson', 'maroon', 'scarlet'],
  white: ['ivory', 'cream', 'pearl'],
  yellow: ['pasupu', 'turmeric', 'amber'],

  // Festival
  diwali: ['deepavali', 'festival of lights'],
  ganesh: ['vinayaka', 'ganpati', 'ganapathi'],
};
