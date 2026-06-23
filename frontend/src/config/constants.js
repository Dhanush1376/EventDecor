export const EVENT_TYPES = [
  {
    id: 'wedding',
    label: 'Wedding / Vivaham',
    icon: 'church',
    desc: 'Grand traditional structures, modular mandaps & royal backdrops',
  },
  {
    id: 'engagement',
    label: 'Engagement Ceremony',
    icon: 'diamond',
    desc: 'Modern floral panels, elegant backdrops & grand entrances',
  },
  {
    id: 'haldi',
    label: 'Haldi & Mehndi',
    icon: 'palette',
    desc: 'Vibrant yellow marigold blasting, traditional swings & photo booths',
  },
  {
    id: 'reception',
    label: 'Reception Gala',
    icon: 'celebration',
    desc: 'Bespoke stage styling, luxury uplighting & contemporary look',
  },
  {
    id: 'birthday',
    label: 'Birthday / Cradle',
    icon: 'child_care',
    desc: 'Vibrant custom themes, balloon archways & kid-friendly elements',
  },
  {
    id: 'festival',
    label: 'Festival / Puja Decor',
    icon: 'spa',
    desc: 'Traditional South Indian mango leaves, lotus hangings & brass props',
  },
  {
    id: 'other',
    label: 'Other Celebration',
    icon: 'more_horiz',
    desc: 'Specify your custom milestone celebration and setup blueprints',
  },
];

export const BUDGET_RANGES = [
  { value: 'Under ₹50,000', label: 'Under ₹50,000' },
  { value: '₹50,000 - ₹1,50,000', label: '₹50,000 - ₹1,50,000' },
  { value: '₹1,50,000 - ₹3,00,000', label: '₹1,50,000 - ₹3,00,000' },
  { value: '₹3,00,000 - ₹5,00,000', label: '₹3,00,000 - ₹5,00,000' },
  { value: 'Over ₹5,00,000', label: 'Over ₹5,00,000' },
];

export const ADDON_PROPS = [
  { name: 'Artisanal Wooden Swings / Ooyala', price: 7500 },
  { name: 'Gilded Grand Arch Entry Archway', price: 12000 },
  { name: 'Live Nadaswaram Instrumental Stage', price: 15000 },
  { name: 'Grand Brass Diyas Canopy Set (8 Props)', price: 9500 },
  { name: 'Fresh Rose petals pathways carpet (50ft)', price: 5000 },
  { name: 'Traditional Handpainted Kolam/Rangoli', price: 3500 },
];

export const SHOWCASE_CATEGORIES = [
  'All',
  'Telugu Heritage',
  'Engagement Gift',
  'Ring Ceremony',
  'Tambulam Showcase',
  'Coconut Decor',
];

export const EXTERNAL_URLS = {
  WHATSAPP_BASE: 'https://wa.me',
  WHATSAPP_API: 'https://api.whatsapp.com/send',
  RAZORPAY_CHECKOUT: 'https://checkout.razorpay.com/v1/checkout.js',
  LEAFLET_CSS: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  LEAFLET_JS: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  LEAFLET_MARKER_ICON: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  LEAFLET_MARKER_SHADOW: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  LEAFLET_TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  NOMINATIM_API: 'https://nominatim.openstreetmap.org',
  GOOGLE_MAPS_SEARCH: 'https://www.google.com/maps/search',
  FACEBOOK_SHARE: 'https://www.facebook.com/sharer/sharer.php',
  TWITTER_SHARE: 'https://twitter.com/intent/tweet',
  LINKEDIN_SHARE: 'https://www.linkedin.com/sharing/share-offsite',
  SCHEMA_ORG: 'https://schema.org',
  PLACEHOLDER_IMAGE: 'https://via.placeholder.com/150?text=No+Image',
  PLACEHOLD_CO: 'https://placehold.co',
  CLOUDINARY_UPLOAD_BASE: 'https://api.cloudinary.com/v1_1',
  CLOUDINARY_CDN_BASE: 'https://res.cloudinary.com',
};

export const APP_CONFIG = {
  DEFAULT_WHATSAPP_NUMBER: '919866006648',
};
