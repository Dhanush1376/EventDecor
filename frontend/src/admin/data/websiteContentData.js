// ─── Siri Arts & Crafts — Website Content Data Store ───
// Every field here maps directly to a visible frontend element.
// The admin can edit these values and see exactly where they appear on the live site.

import { PLACEHOLDER_IMAGES } from '../../constants/placeholderImages';

const IMAGES = {
  luxuryRoyalWedding: PLACEHOLDER_IMAGES.heroBackground,
  templeStyleMandap: PLACEHOLDER_IMAGES.collectionWedding,
  galleryBackdrop: PLACEHOLDER_IMAGES.mandalaHero,
  galleryHampers: PLACEHOLDER_IMAGES.mandalaArt2,
  modernReceptionLounge: PLACEHOLDER_IMAGES.mandalaArt3,
  haldiVibrantSetup: PLACEHOLDER_IMAGES.mandalaArt4,
  galleryMetalPots: PLACEHOLDER_IMAGES.collectionWedding,
  galleryPlatePacking: PLACEHOLDER_IMAGES.mandalaHero,
};

export const initialWebsiteContent = {
  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Home Page Controller
  // ═══════════════════════════════════════════════════════
  homePageController: {
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // PROMOTIONAL BANNERS
  // ═══════════════════════════════════════════════════════
  banners: [
    {
      id: 1,
      text: 'Free Shipping on Orders Above ₹2,000',
      icon: 'local_shipping',
      isActive: true,
      position: 'top',
    },
    {
      id: 2,
      text: 'Festive Season Special — 15% Off All Side-Stage & Tray Curation Rentals',
      icon: 'celebration',
      isActive: false,
      position: 'top',
    },
  ],

  // ═══════════════════════════════════════════════════════
  // ABOUT PAGE
  // ═══════════════════════════════════════════════════════
  aboutPage: {
    heroTitle: 'The Siri Arts & Crafts Story',
    heroSubtitle: 'Preserving Heritage, Crafting Dreams',
    heroImage: IMAGES.luxuryRoyalWedding,
    storyImage: IMAGES.templeStyleMandap,
    founderName: 'Siri Devi',
    founderRole: 'Founder & Master Artisan',
    founderStory:
      'Born into a family of traditional artisans in Ongole, Siri Devi founded Siri Arts & Crafts with a singular vision — to preserve the dying art of ceremonial decoration while bringing it to modern celebrations.',
    missionStatement:
      'To honor the sacred art of Indian ceremonial decoration by creating handcrafted masterpieces that blend timeless heritage with contemporary elegance.',
    values: [
      {
        title: 'Heritage First',
        description: 'Every design is rooted in centuries of tradition',
      },
      {
        title: 'Artisan Excellence',
        description: 'Handcrafted by master craftspeople, never mass-produced',
      },
      {
        title: 'Sustainable Craft',
        description: 'Using natural materials and eco-conscious processes',
      },
    ],
    stats: [],
    specializations: [],
    features: [],
    founders: [],
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // SHOP PAGE
  // ═══════════════════════════════════════════════════════
  shopPage: {
    hero: {
      title: 'Heritage Collection',
      subtitle: 'Curated Artisanship',
      description:
        'Discover masterfully crafted decor pieces that honor ancient traditions with contemporary luxury sensibilities.',
      backgroundImage: PLACEHOLDER_IMAGES.heroBackground,
    },
    promo: {
      title: '',
      highlightText: 'Up to 40% Off',
      description:
        'Bring home heritage-inspired elegance with our exclusive handcrafted seasonal curation. Limited stock available for high-fidelity pieces.',
      backgroundImage: PLACEHOLDER_IMAGES.heroBackground,
      badgeText: 'Limited Time Offer',
      statusText: 'Ends Soon',
      ctaText: 'Claim Offer',
      ctaLink: '/coupons',
      isActive: true,
    },
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // EVENTS PAGE
  // ═══════════════════════════════════════════════════════
  eventsPage: {
    hero: {
      title: 'Luxury Event Scapes',
      subtitle: 'Cinematic Environments',
      description:
        'Immersive architectural curations designed to transform your milestone celebrations into living masterpieces.',
      backgroundImage: PLACEHOLDER_IMAGES.heroBackground,
    },
    promo: {
      title: '',
      highlightText: 'Up to 25% Off',
      description: 'Book your event early and secure premium availability with special discounts.',
      backgroundImage: PLACEHOLDER_IMAGES.heroBackground,
      badgeText: 'Early Booking Promo',
      statusText: 'Ends Soon',
      ctaText: 'Claim Offer',
      ctaLink: '/coupons',
      isActive: true,
    },
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // CUSTOM ORDERS PAGE
  // ═══════════════════════════════════════════════════════
  customOrdersPage: {
    hero: {
      title: 'Custom Event Decor Studio',
      subtitle: 'Bespoke Curations',
      description: 'Design your custom decor, get price estimates, and track your orders.',
    },
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // NAVIGATION & FOOTER
  // ═══════════════════════════════════════════════════════
  navigation: {
    logo: { text: 'SIRI ARTS & CRAFTS', tagline: '', image: '/MainLogo.png' },
    mainLinks: [
      { label: 'Our Story', href: '/about', isVisible: true },
      { label: 'Shop', href: '/collections', isVisible: true },
      { label: 'Events', href: '/events', isVisible: true },
      { label: 'Gallery', href: '/gallery', isVisible: true },
      { label: 'Custom Orders', href: '/custom-orders', isVisible: true },
    ],
  },

  footer: {
    description: 'Ancient craftsmanship meets modern elegance.',
    exploreLinks: [
      { label: 'Collections', href: '/collections' },
      { label: 'Events', href: '/events' },
      { label: 'Gallery', href: '/gallery' },
    ],
    studioLinks: [
      { label: 'Our Story', href: '/about' },
      { label: 'Bespoke', href: '/custom-orders' },
      { label: 'Contact', href: '/contact' },
    ],
    phone: '+91 98660 06648',
    email: 'Sirisha.atmakuri@gmail.com',
    socialLinks: {
      instagram: '',
      pinterest: '',
      facebook: '',
    },
    copyright: '© {year} Siri Arts & Crafts.',
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // CONTACT INFORMATION
  // ═══════════════════════════════════════════════════════
  contact: {
    phone: '9866006648',
    email: 'Sirisha.atmakuri@gmail.com',
    whatsapp: '9866006648',
    address: '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh',
    mapEmbed: '',
    businessHours: 'Mon - Sat: 10 AM - 7 PM',
    contactMethods: [
      {
        icon: 'call',
        title: 'Voice Curation',
        value: '+91 98660 06648',
        link: 'tel:+919866006648',
      },
      {
        icon: 'smartphone',
        title: 'Secondary Line',
        value: '+91 98660 06648',
        link: 'tel:+919866006648',
      },
      {
        icon: 'mail',
        title: 'Digital Studio',
        value: 'Sirisha.atmakuri@gmail.com',
        link: 'mailto:Sirisha.atmakuri@gmail.com',
      },
      {
        icon: 'alternate_email',
        title: 'Direct Access',
        value: 'sirisha.atmakuri@gmail.com',
        link: 'mailto:sirisha.atmakuri@gmail.com',
      },
      {
        icon: 'location_on',
        title: 'Physical Studio',
        value: 'ONGOLE-523001, Andhra Pradesh',
        link: 'https://maps.google.com',
      },
    ],
    studioHours: [
      { days: 'Monday — Friday', hours: '10:00 AM — 07:00 PM' },
      { days: 'Saturday', hours: '11:00 AM — 04:00 PM' },
    ],
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // POLICIES (Moved to dynamic Database Model - Policy.ts)
  // ═══════════════════════════════════════════════════════
  policies: {},

  // ═══════════════════════════════════════════════════════════
  // DIGITAL STUDIO — Configurator & Custom Orders
  // ═══════════════════════════════════════════════════════════
  digitalStudio: {
    tabs: [
      { id: 'intake', label: 'Consultation Form' },
      { id: 'builder', label: 'Package Builder & Quote' },
      { id: 'showcase', label: 'Real Events Showcase' },
    ],
    eventTypes: [
      { id: 'Wedding', label: 'Wedding', icon: 'favorite', desc: 'Timeless sacred unities' },
      {
        id: 'Engagement',
        label: 'Engagement',
        icon: 'ring_volume',
        desc: 'Intimate artisanal arches',
      },
      {
        id: 'Reception',
        label: 'Reception',
        icon: 'celebration',
        desc: 'Glamorous evening ballrooms',
      },
      { id: 'Haldi', label: 'Haldi', icon: 'wb_sunny', desc: 'Vibrant yellow heritage blooms' },
      { id: 'Mehendi', label: 'Mehendi', icon: 'auto_awesome', desc: 'Bohemian pastels & swings' },
      { id: 'Pooja', label: 'Pooja', icon: 'self_improvement', desc: 'Sacred tranquil devotion' },
      { id: 'Birthday', label: 'Birthday', icon: 'cake', desc: 'Gilded milestone soirees' },
      {
        id: 'Corporate',
        label: 'Corporate Event',
        icon: 'business',
        desc: 'Sleek geometric prestige',
      },
    ],
    visualThemes: [
      {
        id: 'Royal',
        label: 'Royal Palace',
        desc: 'Heirloom gold setups with custom silk drapery and heavy pillar mandapams.',
        img: IMAGES.luxuryRoyalWedding,
      },
      {
        id: 'Heritage',
        label: 'Heritage Botanicals',
        desc: 'Vibrant custom botanical archways combined with brass deepams and natural green foliage.',
        img: IMAGES.templeStyleMandap,
      },
      {
        id: 'Minimalist',
        label: 'Minimalist White',
        desc: 'Clean, pristine pastel table layouts, sacred stone relief bases, and understated lighting.',
        img: IMAGES.galleryBackdrop,
      },
      {
        id: 'Kundan',
        label: 'Kundan Pavilion',
        desc: 'Stunning evening backdrops featuring customized geometric frames, ambient hangings, and premium velvet.',
        img: IMAGES.galleryHampers,
      },
    ],
    colorPalettes: [
      { id: 'Ivory & Gold', name: 'Ivory & Gold', hexes: ['#faf9f6', '#d4af37', '#bda060'] },
      {
        id: 'Crimson & Artisanal',
        name: 'Crimson & Artisanal',
        hexes: ['#8b0000', '#ff4500', '#ffd700'],
      },
      { id: 'Pristine White', name: 'Pristine White', hexes: ['#ffffff', '#f0f0f0', '#cccccc'] },
      { id: 'Tender Pastels', name: 'Tender Pastels', hexes: ['#ffe4e1', '#e8d8c8', '#add8e6'] },
      { id: 'Emerald Royal', name: 'Emerald Royal', hexes: ['#043927', '#2e8b57', '#d4af37'] },
    ],
    venueSizes: [
      {
        id: 'Intimate',
        label: 'Intimate Setup',
        capacity: 'Compact Footprint',
        desc: 'Perfect for home functions, small garden ceremonies, or sacred temple halls.',
        previewImg: IMAGES.templeStyleMandap,
      },
      {
        id: 'Banquet',
        label: 'Standard Banquet',
        capacity: 'Medium Footprint',
        desc: 'Optimized multi-level framing suited for indoor premium hotel reception ballrooms.',
        previewImg: IMAGES.modernReceptionLounge,
      },
      {
        id: 'Grand',
        label: 'Grand Lawn / Palace',
        capacity: 'Expanded Footprint',
        desc: 'Absolute majestic layout with broad entrance deepam runs and overarching architectural arrays.',
        previewImg: IMAGES.luxuryRoyalWedding,
      },
    ],
    packageModules: [
      {
        id: 'mandap',
        label: 'Mandap Setup',
        basePrice: 150000,
        desc: 'Sacred core structure with customized silk backdrops',
        isPopular: true,
      },
      {
        id: 'ceiling',
        label: 'Artisanal Ceiling',
        basePrice: 85000,
        desc: 'Suspended botanical overhead matrix & filament glows',
        isPopular: true,
      },
      {
        id: 'entrance',
        label: 'Entrance Decor',
        basePrice: 60000,
        desc: 'Welcome archways, botanical runners & ambient deepams',
        isPopular: false,
      },
      {
        id: 'stage',
        label: 'Stage Setup',
        basePrice: 120000,
        desc: 'Main backdrop relief platforms, panel frames & artisanal elements',
        isPopular: true,
      },
      {
        id: 'dining',
        label: 'Dining Decor',
        basePrice: 50000,
        desc: 'Bespoke tablescapes, custom runners & candelabras',
        isPopular: false,
      },
      {
        id: 'seating',
        label: 'Couple Seating',
        basePrice: 40000,
        desc: 'Handcrafted brass diwans, vintage sofas & side urlis',
        isPopular: false,
      },
      {
        id: 'lighting',
        label: 'Lighting Setup',
        basePrice: 75000,
        desc: 'Cinematic focal halos, uplighting & warm ambient stringers',
        isPopular: true,
      },
    ],
    completedEvents: [],
    videos: [],
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // SEO SETTINGS
  // ═══════════════════════════════════════════════════════
  seo: {
    globalTitle: 'Siri Arts & Crafts — Luxury Handcrafted Event Decorations',
    globalDescription:
      'Premium handcrafted wedding, engagement, and ceremonial decorations rooted in South Indian heritage. Custom designs by master artisans in Ongole.',
    globalKeywords:
      'wedding decorations, Indian wedding, handcrafted decor, bridal entry, harathi plates, engagement trays, Ongole',
    ogImage: IMAGES.luxuryRoyalWedding,
    pages: {
      home: {
        title: 'Siri Arts & Crafts — The Digital Studio',
        description:
          'Premium handcrafted event decorations for weddings, engagements, and sacred ceremonies.',
      },
      shop: {
        title: 'Shop Collections — Siri Arts & Crafts',
        description: 'Explore our curated collection of luxury handcrafted ceremonial decorations.',
      },
      gallery: {
        title: 'Inspiration Gallery — Siri Arts & Crafts',
        description: 'Browse our portfolio of stunning event installations and artisan creations.',
      },
      events: {
        title: 'Event Decorations — Siri Arts & Crafts',
        description:
          'Complete event decoration services for weddings, engagements, and traditional ceremonies.',
      },
      about: {
        title: 'Our Story — Siri Arts & Crafts',
        description:
          'Learn about our heritage, our artisans, and our mission to preserve traditional craftsmanship.',
      },
      contact: {
        title: 'Contact Us — Siri Arts & Crafts',
        description: 'Get in touch for custom orders, consultations, and inquiries.',
      },
    },
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // THEME SETTINGS
  // ═══════════════════════════════════════════════════════
  theme: {
    showMandalaArt: true,
    showAnimations: true,
    showFloatingElements: true,
    enableSplashScreen: true,
    enableSmoothScroll: true,
    darkMode: false,
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // FAQs
  // ═══════════════════════════════════════════════════════
  faqs: {
    homepage: [
      {
        question: 'What types of events do you decorate?',
        answer:
          'We specialize in a wide range of events including weddings, engagements, housewarmings (Griha Pravesh), birthdays, corporate events, and traditional poojas.',
      },
      {
        question: 'Do you offer customized handmade gifts?',
        answer:
          'Yes, we craft bespoke wedding trays, customized return gifts, and premium pooja essentials tailored to your theme and preferences.',
      },
      {
        question: 'Where are you located and what areas do you serve?',
        answer:
          'We are based in Ongole, Andhra Pradesh, and serve clients across Ongole, Vijayawada, Guntur, and various other districts in Andhra Pradesh and Telangana for large-scale events.',
      },
    ],
    products: [
      {
        question: 'Are your products handcrafted?',
        answer:
          'Absolutely. All our premium wedding trays, pooja items, and decor props are meticulously handcrafted by skilled artisans to ensure the highest quality.',
      },
      {
        question: 'Can I place a bulk order for return gifts?',
        answer:
          'Yes, we specialize in bulk orders for return gifts and wedding favors. Please contact our team directly for bulk pricing and customization options.',
      },
      {
        question: 'Do you ship your products internationally?',
        answer:
          'Yes, we ship our handcrafted products globally. Shipping costs and delivery times vary based on the destination.',
      },
    ],
    status: 'published',
  },
};
