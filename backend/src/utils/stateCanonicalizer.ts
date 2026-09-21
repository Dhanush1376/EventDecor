/**
 * Canonicalizer for Indian States and Union Territories.
 * Maps state names, codes, and common variations to a canonical uppercase 2-letter code (e.g. 'AP', 'PB', 'KA').
 */

const STATE_MAPPING: Record<string, string> = {
  // Andhra Pradesh
  ap: 'AP',
  'andhra pradesh': 'AP',
  andhra: 'AP',

  // Arunachal Pradesh
  ar: 'AR',
  'arunachal pradesh': 'AR',
  arunachal: 'AR',

  // Assam
  as: 'AS',
  assam: 'AS',

  // Bihar
  br: 'BR',
  bihar: 'BR',

  // Chhattisgarh
  cg: 'CG',
  chhattisgarh: 'CG',
  chattisgarh: 'CG',

  // Goa
  ga: 'GA',
  goa: 'GA',

  // Gujarat
  gj: 'GJ',
  gujarat: 'GJ',

  // Haryana
  hr: 'HR',
  haryana: 'HR',

  // Himachal Pradesh
  hp: 'HP',
  'himachal pradesh': 'HP',
  himachal: 'HP',

  // Jharkhand
  jh: 'JH',
  jharkhand: 'JH',

  // Karnataka
  ka: 'KA',
  karnataka: 'KA',

  // Kerala
  kl: 'KL',
  kerala: 'KL',

  // Madhya Pradesh
  mp: 'MP',
  'madhya pradesh': 'MP',

  // Maharashtra
  mh: 'MH',
  maharashtra: 'MH',

  // Manipur
  mn: 'MN',
  manipur: 'MN',

  // Meghalaya
  ml: 'ML',
  meghalaya: 'ML',

  // Mizoram
  mz: 'MZ',
  mizoram: 'MZ',

  // Nagaland
  nl: 'NL',
  nagaland: 'NL',

  // Odisha / Orissa
  od: 'OD',
  or: 'OD',
  odisha: 'OD',
  orissa: 'OD',

  // Punjab
  pb: 'PB',
  punjab: 'PB',

  // Rajasthan
  rj: 'RJ',
  rajasthan: 'RJ',

  // Sikkim
  sk: 'SK',
  sikkim: 'SK',

  // Tamil Nadu
  tn: 'TN',
  'tamil nadu': 'TN',
  tamilnadu: 'TN',

  // Telangana
  ts: 'TS',
  tg: 'TS',
  telangana: 'TS',

  // Tripura
  tr: 'TR',
  tripura: 'TR',

  // Uttar Pradesh
  up: 'UP',
  'uttar pradesh': 'UP',

  // Uttarakhand / Uttaranchal
  uk: 'UK',
  ua: 'UK',
  uttarakhand: 'UK',
  uttaranchal: 'UK',

  // West Bengal
  wb: 'WB',
  'west bengal': 'WB',

  // Union Territories
  an: 'AN',
  'andaman and nicobar islands': 'AN',
  'andaman and nicobar': 'AN',
  andaman: 'AN',

  ch: 'CH',
  chandigarh: 'CH',

  dn: 'DN',
  'dadra and nagar haveli and daman and diu': 'DN',
  'daman and diu': 'DN',
  'dadra and nagar haveli': 'DN',

  dl: 'DL',
  delhi: 'DL',
  'nct of delhi': 'DL',
  'national capital territory of delhi': 'DL',
  'new delhi': 'DL',

  jk: 'JK',
  'jammu and kashmir': 'JK',
  'jammu & kashmir': 'JK',

  la: 'LA',
  ladakh: 'LA',

  ld: 'LD',
  lakshadweep: 'LD',

  py: 'PY',
  puducherry: 'PY',
  pondicherry: 'PY',
};

/**
 * Normalizes an Indian state string to its canonical 2-letter uppercase code.
 * Returns null if input is missing, empty, or unresolvable.
 */
export function canonicalizeState(stateNameOrCode?: string | null): string | null {
  if (!stateNameOrCode || typeof stateNameOrCode !== 'string') {
    return null;
  }

  const clean = stateNameOrCode
    .trim()
    .toLowerCase()
    .replace(/[.,\-_/]/g, ' ')
    .replace(/\s+/g, ' ');

  if (!clean) return null;

  return STATE_MAPPING[clean] || null;
}
