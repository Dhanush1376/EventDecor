// ── Transliteration Map ──
// Maps Telugu/Hindi/regional words (in English script or native script)
// to their English equivalents used in the product catalog.
export const TRANSLITERATION_MAP: Record<string, string[]> = {
  // ─── Wedding / Marriage ───
  pelli: ['wedding', 'marriage', 'kalyanam'],
  pendli: ['wedding', 'marriage', 'kalyanam'],
  kalyanam: ['wedding', 'marriage'],
  shadi: ['wedding', 'marriage'],
  shaadi: ['wedding', 'marriage'],
  vivaham: ['wedding', 'marriage'],
  vivah: ['wedding'],
  pellikuturu: ['bride', 'bridal', 'haldi'],
  pellikoduku: ['groom', 'haldi'],
  pelliaspatalu: ['wedding', 'marriage'],
  pellipustakam: ['wedding invitation', 'invitation'],
  talambralu: ['wedding ceremony', 'rice shower', 'wedding'],
  jeelakarra: ['turmeric', 'wedding ceremony'],
  'jeelakarra bellam': ['wedding ceremony', 'turmeric', 'jaggery'],
  mangalsutra: ['wedding', 'bridal', 'necklace'],

  // ─── Engagement ───
  nischayam: ['engagement', 'ring ceremony'],
  nischitartham: ['engagement', 'ring ceremony'],

  // ─── Baby Shower / Seemantham ───
  seemantham: ['baby shower', 'maternity', 'seemantham'],
  srimantham: ['baby shower', 'seemantham'],
  'godh bharai': ['baby shower', 'seemantham'],
  valaikappu: ['baby shower', 'bangle ceremony'],

  // ─── Housewarming ───
  gruhapravesam: ['housewarming', 'gruhapravesh', 'new house'],
  gruhapravesh: ['housewarming', 'new house'],
  'griha pravesh': ['housewarming', 'new house'],
  vastushanti: ['housewarming', 'pooja'],

  // ─── Naming Ceremony ───
  'naming ceremony': ['cradle ceremony', 'naming'],
  naamkaran: ['naming ceremony', 'cradle ceremony'],
  namakaranam: ['naming ceremony', 'cradle ceremony'],
  'cradle ceremony': ['naming ceremony'],

  // ─── First Rice / Annaprasana ───
  annaprasana: ['first rice ceremony', 'rice feeding', 'naming ceremony'],
  annapraasana: ['first rice ceremony', 'rice feeding'],

  // ─── Education Ceremony ───
  aksharabhyasam: ['education ceremony', 'vidyarambham', 'first writing'],
  vidyarambham: ['education ceremony', 'aksharabhyasam'],

  // ─── Half Saree Function ───
  'half saree': ['half saree function', 'langa voni', 'coming of age'],
  'half saree function': ['langa voni', 'coming of age', 'puberty ceremony'],
  'langa voni': ['half saree', 'half saree function'],
  'puberty ceremony': ['half saree function', 'coming of age'],

  // ─── Religious / Pooja / Vratham ───
  puja: ['pooja', 'worship'],
  pooja: ['puja', 'worship', 'prayer'],
  vratham: ['religious ceremony', 'pooja', 'fasting'],
  vratam: ['religious ceremony', 'pooja', 'fasting'],
  homam: ['fire ceremony', 'pooja', 'havan'],
  havan: ['fire ceremony', 'pooja', 'homam'],
  'satyanarayana vratam': ['religious ceremony', 'pooja', 'satyanarayanam'],
  satyanarayanam: ['religious ceremony', 'pooja', 'satyanarayana vratam'],
  'satyanarayana pooja': ['religious ceremony', 'satyanarayanam'],
  'varalakshmi vratham': ['pooja', 'festival', 'varalakshmi'],
  varalakshmi: ['pooja', 'festival'],
  'ammavari pooja': ['goddess worship', 'pooja'],
  navagraha: ['pooja', 'religious ceremony'],
  sravanamasam: ['pooja', 'traditional', 'festival'],

  // ─── Haldi / Mehendi / Sangeet ───
  pasupu: ['haldi', 'yellow', 'turmeric'],
  kumkuma: ['kumkum', 'turmeric', 'vermillion'],
  'mangala snanam': ['haldi', 'bridal bath', 'turmeric ceremony'],
  gorintaku: ['mehendi', 'henna', 'mehndi'],
  mehendi: ['mehndi', 'henna', 'gorintaku'],
  mehndi: ['mehendi', 'henna'],
  sangeet: ['music night', 'dance night', 'pre-wedding'],
  sangeeth: ['sangeet', 'music night', 'pre-wedding'],

  // ─── Reception ───
  reception: ['wedding reception', 'grand reception'],
  virandhu: ['reception', 'feast'],

  // ─── Festival ───
  deepavali: ['diwali', 'festival of lights'],
  'ganesh chaturthi': ['ganesh', 'festival', 'vinayaka chavithi'],
  'vinayaka chavithi': ['ganesh chaturthi', 'ganesh', 'festival'],
  dasara: ['dussehra', 'festival'],
  dussehra: ['dasara', 'festival'],
  sankranti: ['pongal', 'harvest festival'],
  pongal: ['sankranti', 'harvest festival'],
  ugadi: ['new year', 'telugu new year', 'festival'],

  // ─── Product-Specific Telugu ───
  kobbari: ['coconut', 'coconut decor'],
  'kobbari bondam': ['coconut', 'coconut decor', 'tender coconut'],
  'kobbari kaya': ['coconut', 'coconut decor'],
  nariyal: ['coconut'],
  kalasham: ['pooja vessel', 'kalash', 'traditional'],
  kalasam: ['pooja vessel', 'kalash', 'traditional'],
  toran: ['door decoration', 'garland', 'toran'],
  thoranam: ['door decoration', 'toran', 'garland', 'mango leaves'],
  thambulam: ['return gift', 'wedding', 'tray', 'tambulam'],
  tambulam: ['return gift', 'thambulam', 'tray'],
  poola: ['flower', 'floral'],
  poolu: ['flower', 'floral'],
  'poola danda': ['garland', 'flower garland'],
  mala: ['garland', 'necklace'],
  haar: ['garland', 'necklace'],
  alankarana: ['decoration', 'decor'],
  demudu: ['pooja', 'god', 'idol'],
  muggu: ['rangoli', 'kolam'],
  kolam: ['rangoli', 'muggu'],

  // ─── General Hinglish ───
  dulhan: ['bride', 'bridal'],
  dulha: ['groom'],
  shandar: ['luxury', 'premium'],
  sasta: ['cheap', 'budget', 'simple'],
  accha: ['good', 'premium'],
  phool: ['flower', 'floral'],
  genda: ['marigold'],
  diya: ['lamps', 'lighting', 'diyas'],
  shubh: ['pooja', 'traditional', 'auspicious'],

  // ─── Birthday / Misc ───
  barthday: ['birthday', 'bday'],
  bday: ['birthday', 'party'],

  // ─── Telugu Script (Exact Unicode) ───
  పెళ్లి: ['wedding', 'marriage', 'pelli'],
  పెండ్లి: ['wedding', 'marriage', 'pelli'],
  కళ్యాణం: ['wedding', 'marriage', 'kalyanam'],
  మండపం: ['mandap', 'stage', 'mandapam'],
  నిశ్చితార్థం: ['engagement', 'nischayam'],
  హల్దీ: ['haldi', 'pasupu'],
  మెహందీ: ['mehendi'],
  పూజ: ['pooja', 'puja'],
  దీపావళి: ['diwali', 'deepavali'],
  ముగ్గు: ['rangoli', 'muggu'],
  అలంకరణ: ['decoration', 'decor', 'alankarana'],
  పువ్వులు: ['flower', 'floral', 'poolu'],
  బంగారు: ['gold', 'golden'],
  రంగులు: ['colors'],
  కొబ్బరి: ['coconut', 'kobbari'],
  సీమంతం: ['baby shower', 'seemantham'],
  గృహప్రవేశం: ['housewarming', 'gruhapravesam'],
  పసుపు: ['turmeric', 'haldi', 'pasupu'],
  కుంకుమ: ['kumkum', 'kumkuma', 'vermillion'],
  తాంబూలం: ['return gift', 'thambulam'],
  తోరణం: ['door decoration', 'toran', 'thoranam'],
  కలశం: ['pooja vessel', 'kalasham'],
};
