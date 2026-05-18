// ─── Siri Arts & Crafts — Website Content Data Store ───
// Every field here maps directly to a visible frontend element.
// The admin can edit these values and see exactly where they appear on the live site.

const IMAGES = {
  luxuryRoyalWedding: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2074&auto=format&fit=crop",
  templeStyleMandap: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=1974&auto=format&fit=crop",
  galleryBackdrop: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1974&auto=format&fit=crop",
  galleryHampers: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2070&auto=format&fit=crop",
  modernReceptionLounge: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop",
  haldiVibrantSetup: "https://images.unsplash.com/photo-1561571994-3c61c554181a?q=80&w=1974&auto=format&fit=crop",
  galleryMetalPots: "https://images.unsplash.com/photo-1590073844006-33379778ae09?q=80&w=1974&auto=format&fit=crop",
  galleryPlatePacking: "https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=1974&auto=format&fit=crop"
};

export const initialWebsiteContent = {
  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Hero Section
  // ═══════════════════════════════════════════════════════
  hero: {
    title: "Handcrafted Traditional Event Setups & Trays",
    subtitle:
      "Luxury side-stage decorative presentations, custom ring trays, and artisan carved coconuts for traditional Telugu engagement ceremonies",
    ctaPrimary: { text: "Browse Events & Setups", link: "/events" },
    ctaSecondary: { text: "Design Custom Showcase", link: "/custom-orders" },
    backgroundImage: IMAGES.luxuryRoyalWedding,
    badgeText: "Artisan Excellence Since 2015",
    isVisible: true,
    status: "published", // published | draft | modified
  },

  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Featured Collections Strip
  // ═══════════════════════════════════════════════════════
  featuredCollections: {
    sectionTitle: "Curated Event Categories",
    sectionSubtitle: "Explore our most sought-after side-stage presentations and handcrafted tray collections",
    items: [
      {
        id: 1,
        name: "Engagement Gift Setups",
        link: "/events",
        image: IMAGES.luxuryRoyalWedding,
        isVisible: true,
      },
      {
        id: 2,
        name: "Pellikuthuru Heritage",
        link: "/events",
        image: IMAGES.templeStyleMandap,
        isVisible: true,
      },
      {
        id: 3,
        name: "Custom Ring & Jewelry Trays",
        link: "/events",
        image: IMAGES.galleryBackdrop,
        isVisible: true,
      },
      {
        id: 4,
        name: "Lotus Tambulam Displays",
        link: "/events",
        image: IMAGES.galleryHampers,
        isVisible: true,
      },
    ],
    isVisible: true,
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Bestseller / Featured Products
  // ═══════════════════════════════════════════════════════
  featuredProducts: {
    sectionTitle: "Bestselling Masterpieces",
    sectionSubtitle: "The most loved creations from our studio",
    productIds: [], // Resolved dynamically via database on fetch
    maxDisplay: 4,
    isVisible: true,
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Testimonials
  // ═══════════════════════════════════════════════════════
  testimonials: {
    sectionTitle: "Voices of Heritage",
    items: [
      {
        id: 1,
        name: "Lakshmi Devi",
        role: "Bride, Hyderabad",
        text: "The wedding decorations were beyond anything I imagined. True artisanal mastery.",
        rating: 5,
        avatar: null,
        isVisible: true,
      },
      {
        id: 2,
        name: "Priya Reddy",
        role: "Event Planner",
        text: "Every piece radiates heritage. Our clients are always in awe of the craftsmanship.",
        rating: 5,
        avatar: null,
        isVisible: true,
      },
      {
        id: 3,
        name: "Ananya Sharma",
        role: "Interior Designer",
        text: "The attention to detail in their brass work is unmatched. Museum-quality pieces.",
        rating: 5,
        avatar: null,
        isVisible: true,
      },
    ],
    isVisible: true,
    status: "published",
  },


  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Story / About Teaser
  // ═══════════════════════════════════════════════════════
  storyTeaser: {
    title: "The Art of Celebration",
    subtitle: "Where ancient craftsmanship meets modern elegance",
    description:
      "Every creation at Siri Arts & Crafts is a labor of love — hand-carved, hand-painted, and hand-assembled by master artisans who have inherited their skills across generations.",
    ctaText: "Our Story",
    ctaLink: "/about",
    image: IMAGES.templeStyleMandap,
    isVisible: true,
    status: "published",
    stats: [
      { id: 1, value: "50+", label: "Master Artisans", icon: "groups" },
      { id: 2, value: "120h", label: "Avg. Craft Per Piece", icon: "schedule" }
    ]
  },

  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Gallery Preview
  // ═══════════════════════════════════════════════════════
  galleryPreview: {
    sectionTitle: "Inspiration Gallery",
    sectionSubtitle: "A visual journey through our finest installations",
    galleryIds: [], // Resolved dynamically via database on fetch
    maxDisplay: 6,
    isVisible: true,
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Section Ordering
  // ═══════════════════════════════════════════════════════
  homepageSections: [
    { id: "hero", label: "Hero Banner", isVisible: true },
    {
      id: "featuredCollections",
      label: "Featured Collections",
      isVisible: true,
    },
    { id: "featuredProducts", label: "Bestselling Products", isVisible: true },
    { id: "storyTeaser", label: "Our Story Teaser", isVisible: true },
    { id: "galleryPreview", label: "Gallery Preview", isVisible: true },
    { id: "testimonials", label: "Testimonials", isVisible: true },
  ],

  // ═══════════════════════════════════════════════════════
  // PROMOTIONAL BANNERS
  // ═══════════════════════════════════════════════════════
  banners: [
    {
      id: 1,
      text: "Free Shipping on Orders Above ₹2,000",
      icon: "local_shipping",
      isActive: true,
      position: "top",
    },
    {
      id: 2,
      text: "🎉 Festive Season Special — 15% Off All Side-Stage & Tray Curation Rentals",
      icon: "celebration",
      isActive: false,
      position: "top",
    },
  ],

  // ═══════════════════════════════════════════════════════
  // ABOUT PAGE
  // ═══════════════════════════════════════════════════════
  aboutPage: {
    heroTitle: "The Siri Arts Story",
    heroSubtitle: "Preserving Heritage, Crafting Dreams",
    heroImage: IMAGES.luxuryRoyalWedding,
    storyImage: IMAGES.templeStyleMandap,
    founderName: "Siri Devi",
    founderRole: "Founder & Master Artisan",
    founderStory:
      "Born into a family of traditional artisans in Hyderabad, Siri Devi founded Siri Arts & Crafts with a singular vision — to preserve the dying art of ceremonial decoration while bringing it to modern celebrations.",
    missionStatement:
      "To honor the sacred art of Indian ceremonial decoration by creating handcrafted masterpieces that blend timeless heritage with contemporary elegance.",
    values: [
      {
        title: "Heritage First",
        description: "Every design is rooted in centuries of tradition",
      },
      {
        title: "Artisan Excellence",
        description: "Handcrafted by master craftspeople, never mass-produced",
      },
      {
        title: "Sustainable Craft",
        description: "Using natural materials and eco-conscious processes",
      },
    ],
    stats: [
      { label: "Tagline", value: "& HERITAGE CRAFTS", type: "text" },
      { label: "Showcases Delivered", value: "2,500+" },
      { label: "Master Artisans", value: "15+" },
      { label: "Happy Families", value: "5,000+" },
    ],
    specializations: [
      { title: "Traditional Decor", img: IMAGES.templeStyleMandap },
      { title: "Floral Mastery", img: IMAGES.luxuryRoyalWedding },
      { title: "Engagement Trays", img: IMAGES.galleryBackdrop },
      { title: "Pooja Artistry", img: IMAGES.galleryMetalPots },
      { title: "Harathi Plates", img: IMAGES.galleryPlatePacking },
      { title: "Bespoke Baskets", img: IMAGES.galleryHampers },
    ],
    features: [
      {
        icon: "handyman",
        title: "Handmade Artistry",
        desc: "Every petal, every bead, and every fold is meticulously placed by hand.",
      },
      {
        icon: "diamond",
        title: "Premium Quality",
        desc: "Sourcing only the finest materials globally to ensure unparalleled luxury.",
      },
      {
        icon: "volunteer_activism",
        title: "Cultural Roots",
        desc: "Deeply embedded in authentic Telugu traditions and timeless heritage.",
      },
      {
        icon: "design_services",
        title: "Bespoke Design",
        desc: "Tailored to your specific event theme and personal storytelling.",
      },
    ],
    founders: [
      {
        name: "Sirisha Atmakuri",
        role: "Creative Head",
        subtitle: "Crafted by Hands.",
        quote: "\"Our mission was never just about creating beautiful objects. It was about preserving the deeply emotional essence of Telugu celebrations. When we craft a piece, we are weaving prayers and centuries of tradition into it.\"",
        initials: "SD",
        signatureImg: ""
      },
      {
        name: "Balaji Atmakuri",
        role: "Marketing Head",
        subtitle: "Global Heritage.",
        quote: "\"Bridging the gap between ancient heritage and modern global celebrations. My vision is to ensure that the soulful artistry of Siri Arts & Crafts reaches every corner of the world, honoring our roots while embracing the future.\"",
        initials: "B",
        signatureImg: ""
      }
    ],
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // SHOP PAGE
  // ═══════════════════════════════════════════════════════
  shopPage: {
    hero: {
      title: "Heritage Collection",
      subtitle: "Curated Artisanship",
      description: "Discover masterfully crafted decor pieces that honor ancient traditions with contemporary luxury sensibilities.",
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuC6Cy1TlK9jjSUwKlKlXEL_AKlV3Ff5c2VdyViS7GGN3dgR1UB3SgmAto5fKc__pxujkfieY8wFl8MLAhbv7fZHW-oIWdXX0Xqg7SaMj5Szj9w6aGsuChZguzRLBppvcE_7OyVd9N7Ldchm0izPUhXOQGyYaQUsd43cUxBLr5ift2YUa0I_rr4_34hldd6L-V9MeNbxa-BUn2gvZq7JQypKg2Wl6-8TPta6D_ZooOmuUfcwSJJUjNe8-voUHsu7mBKM_CeD9YFd204",
    },
    promo: {
      title: "Seasonal Decor —",
      highlightText: "Up to 40% Off",
      description: "Bring home heritage-inspired elegance with our exclusive handcrafted seasonal curation. Limited stock available for high-fidelity pieces.",
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w",
      badgeText: "Limited Time Offer",
      statusText: "Ends Soon",
      ctaText: "Claim Offer",
      ctaLink: "Festive Decor",
    },
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // NAVIGATION & FOOTER
  // ═══════════════════════════════════════════════════════
  navigation: {
    logo: { text: "SIRI ARTS & CRAFTS", tagline: "& HERITAGE CRAFTS" },
    mainLinks: [
      { label: "Shop", href: "/collections", isVisible: true },
      { label: "Events", href: "/events", isVisible: true },
      { label: "Gallery", href: "/gallery", isVisible: true },
      { label: "Custom Orders", href: "/custom-orders", isVisible: true },
    ],
  },

  footer: {
    description: "Ancient craftsmanship meets modern elegance.",
    exploreLinks: [
      { label: "Collections", href: "/collections" },
      { label: "Events", href: "/events" },
      { label: "Gallery", href: "/gallery" },
    ],
    studioLinks: [
      { label: "Our Story", href: "/about" },
      { label: "Bespoke", href: "/custom-orders" },
      { label: "Contact", href: "/contact" },
    ],
    phone: "+91 98660 06648",
    email: "Sirisha.atmakuri@gmail.com",
    socialLinks: {
      instagram: "https://instagram.com",
      pinterest: "https://pinterest.com",
    },
    copyright: "© {year} Siri Arts & Crafts.",
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // CONTACT INFORMATION
  // ═══════════════════════════════════════════════════════
  contact: {
    phone: "9866006648",
    email: "Sirisha.atmakuri@gmail.com",
    whatsapp: "9866006648",
    address: "#28-1-92, Beside Kailash PavBhaji Center, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh",
    mapEmbed: "",
    businessHours: "Mon - Sat: 10 AM - 7 PM",
    contactMethods: [
      {
        icon: "call",
        title: "Voice Curation",
        value: "+91 98660 06648",
        link: "tel:+919866006648",
      },
      {
        icon: "smartphone",
        title: "Secondary Line",
        value: "+91 98660 06648",
        link: "tel:+919866006648",
      },
      {
        icon: "mail",
        title: "Digital Studio",
        value: "Sirisha.atmakuri@gmail.com",
        link: "mailto:Sirisha.atmakuri@gmail.com",
      },
      {
        icon: "alternate_email",
        title: "Direct Access",
        value: "sirisha.atmakuri@gmail.com",
        link: "mailto:sirisha.atmakuri@gmail.com",
      },
      {
        icon: "location_on",
        title: "Physical Studio",
        value: "ONGOLE-523001, Andhra Pradesh",
        link: "https://maps.google.com",
      },
    ],
    studioHours: [
      { days: "Monday — Friday", hours: "10:00 AM — 07:00 PM" },
      { days: "Saturday", hours: "11:00 AM — 04:00 PM" },
    ],
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // POLICIES
  // ═══════════════════════════════════════════════════════
  policies: {
    shipping: {
      title: "Shipping Policy",
      lastUpdated: "May 15, 2026",
      sections: [
        {
          title: "1. Processing & Dispatch",
          content: "<p>We pride ourselves on swift handling of all authentic handcrafted decor acquisitions:</p><ul class=\"list-disc pl-5 space-y-2 mt-3\"><li><strong>Ready-to-Ship Items:</strong> Dispatched within 24 to 48 hours of order confirmation.</li><li><strong>Custom Commissions:</strong> Production timelines vary between 10 to 25 business days.</li></ul>"
        },
        {
          title: "2. Delivery Timelines",
          content: "<p>Estimated transit times post-dispatch depend on your target destination:</p><ul class=\"list-disc pl-5 space-y-2 mt-3\"><li><strong>Metropolitan Cities (India):</strong> 2 to 4 working days.</li><li><strong>Tier 2 & 3 Cities (India):</strong> 5 to 7 working days.</li><li><strong>International:</strong> 10 to 14 working days via premium courier partners.</li></ul>"
        },
        {
          title: "3. Shipping Fees",
          content: "<p>We provide <strong>Complimentary Free Shipping</strong> on all domestic orders across India. International shipping charges are calculated dynamically at checkout based on destination and volumetric weight.</p>"
        },
        {
          title: "4. Secure Packaging",
          content: "<p>All items are securely encased in our multi-layer bubble wrap and custom-molded heritage outers to prevent transit damage. Bespoke pieces include velvet linings and specialized protection layers.</p>"
        },
        {
          title: "5. Tracking Details",
          content: "<p>Once your order leaves our workshop, tracking updates will be emailed to your registered address and updated live inside your user profile dashboard.</p>"
        }
      ]
    },
    returns: {
      title: "Returns & Refunds",
      lastUpdated: "May 15, 2026",
      sections: [
        {
          title: "1. Return Window",
          content: "<p>We offer a hassle-free <strong>7-day return policy</strong> for all standard handcrafted decor items from the date of delivery. Items must be in their original, unused condition with all authentic tags intact.</p>"
        },
        {
          title: "2. Eligibility Criteria",
          content: "<p>To qualify for a refund or exchange, please ensure:</p><ul class=\"list-disc pl-5 space-y-2 mt-3\"><li>The product is in its original heritage packaging.</li><li>The item is not a custom, bespoke, or personalized order (these are final sale).</li><li>The product is not marked as \"Final Sale\" or \"Non-Returnable\" on the product page.</li></ul>"
        },
        {
          title: "3. Damage During Transit",
          content: "<p>In the rare event that your acquisition arrives damaged, please record a photograph of the damage and contact us within 24 hours at <strong>support@siriartsandcrafts.com</strong>. We will arrange a priority replacement at no extra cost.</p>"
        },
        {
          title: "4. Refund Process",
          content: "<p>Once we receive and inspect your returned item, we will process your refund to the original payment method within 7 to 10 working days. You will receive a confirmation email once the transaction is finalized.</p>"
        },
        {
          title: "5. Return Pickup",
          content: "<p>We provide complimentary pickup for returns across India. For international returns, shipping costs are to be borne by the customer.</p>"
        }
      ]
    },
    status: "published"
  },

  // ═══════════════════════════════════════════════════════════
  // DIGITAL STUDIO — Configurator & Custom Orders
  // ═══════════════════════════════════════════════════════════
  digitalStudio: {
    tabs: [
      { id: "intake", label: "Consultation Form" },
      { id: "builder", label: "Package Builder & Quote" },
      { id: "showcase", label: "Real Events Showcase" },
    ],
    eventTypes: [
      { id: "Wedding", label: "Wedding", icon: "favorite", desc: "Timeless sacred unities" },
      { id: "Engagement", label: "Engagement", icon: "ring_volume", desc: "Intimate artisanal arches" },
      { id: "Reception", label: "Reception", icon: "celebration", desc: "Glamorous evening ballrooms" },
      { id: "Haldi", label: "Haldi", icon: "wb_sunny", desc: "Vibrant yellow heritage blooms" },
      { id: "Mehendi", label: "Mehendi", icon: "auto_awesome", desc: "Bohemian pastels & swings" },
      { id: "Pooja", label: "Pooja", icon: "self_improvement", desc: "Sacred tranquil devotion" },
      { id: "Birthday", label: "Birthday", icon: "cake", desc: "Gilded milestone soirees" },
      { id: "Corporate", label: "Corporate Event", icon: "business", desc: "Sleek geometric prestige" },
    ],
    visualThemes: [
      { id: "Royal", label: "Royal Palace", desc: "Heirloom gold setups with custom silk drapery and heavy pillar mandapams.", img: IMAGES.luxuryRoyalWedding },
      { id: "Heritage", label: "Heritage Botanicals", desc: "Vibrant custom botanical archways combined with brass deepams and natural green foliage.", img: IMAGES.templeStyleMandap },
      { id: "Minimalist", label: "Minimalist White", desc: "Clean, pristine pastel table layouts, sacred stone relief bases, and understated lighting.", img: IMAGES.galleryBackdrop },
      { id: "Kundan", label: "Kundan Pavilion", desc: "Stunning evening backdrops featuring customized geometric frames, ambient hangings, and premium velvet.", img: IMAGES.galleryHampers },
    ],
    colorPalettes: [
      { id: "Ivory & Gold", name: "Ivory & Gold", hexes: ["#faf9f6", "#d4af37", "#bda060"] },
      { id: "Crimson & Artisanal", name: "Crimson & Artisanal", hexes: ["#8b0000", "#ff4500", "#ffd700"] },
      { id: "Pristine White", name: "Pristine White", hexes: ["#ffffff", "#f0f0f0", "#cccccc"] },
      { id: "Tender Pastels", name: "Tender Pastels", hexes: ["#ffe4e1", "#e8d8c8", "#add8e6"] },
      { id: "Emerald Royal", name: "Emerald Royal", hexes: ["#043927", "#2e8b57", "#d4af37"] },
    ],
    venueSizes: [
      { id: "Intimate", label: "Intimate Setup", capacity: "Under 100 Guests", desc: "Perfect for home functions, small garden ceremonies, or sacred temple halls.", previewImg: IMAGES.templeStyleMandap },
      { id: "Banquet", label: "Standard Banquet", capacity: "200 - 500 Guests", desc: "Optimized multi-level framing suited for indoor premium hotel reception ballrooms.", previewImg: IMAGES.modernReceptionLounge },
      { id: "Grand", label: "Grand Lawn / Palace", capacity: "500+ Guests", desc: "Absolute majestic layout with broad entrance deepam runs and overarching architectural arrays.", previewImg: IMAGES.luxuryRoyalWedding },
    ],
    packageModules: [
      { id: "mandap", label: "Mandap Setup", basePrice: 150000, desc: "Sacred core structure with customized silk backdrops", isPopular: true },
      { id: "ceiling", label: "Artisanal Ceiling", basePrice: 85000, desc: "Suspended botanical overhead matrix & filament glows", isPopular: true },
      { id: "entrance", label: "Entrance Decor", basePrice: 60000, desc: "Welcome archways, botanical runners & ambient deepams", isPopular: false },
      { id: "stage", label: "Stage Setup", basePrice: 120000, desc: "Main backdrop relief platforms, panel frames & artisanal elements", isPopular: true },
      { id: "dining", label: "Dining Decor", basePrice: 50000, desc: "Bespoke tablescapes, custom runners & candelabras", isPopular: false },
      { id: "seating", label: "Couple Seating", basePrice: 40000, desc: "Handcrafted brass diwans, vintage sofas & side urlis", isPopular: false },
      { id: "lighting", label: "Lighting Setup", basePrice: 75000, desc: "Cinematic focal halos, uplighting & warm ambient stringers", isPopular: true },
    ],
    completedEvents: [
      {
        id: 1,
        title: "Malhotra Palace Wedding",
        location: "Udaipur Grounds",
        date: "Jan 2026",
        img: IMAGES.luxuryRoyalWedding,
      },
      {
        id: 2,
        title: "Sangeeta & Dev Haldi Soiree",
        location: "Bangalore Lawns",
        date: "Feb 2026",
        img: IMAGES.templeStyleMandap,
      },
      {
        id: 3,
        title: "Krishnan Reception Setup",
        location: "Chennai Heritage Hall",
        date: "Mar 2026",
        img: IMAGES.galleryBackdrop,
      },
      {
        id: 4,
        title: "Kapoor Intimate Gala",
        location: "Mumbai Terrace Sanctuary",
        date: "April 2026",
        img: IMAGES.galleryHampers,
      },
    ],
    videos: [
      {
        title: "Royal Palace Grounds Mandap Reveal",
        thumb: IMAGES.luxuryRoyalWedding,
        duration: "1:45",
      },
      {
        title: "Artisanal Ceiling Matrix Timelapse",
        thumb: IMAGES.templeStyleMandap,
        duration: "0:58",
      },
      {
        title: "Bespoke Evening Stage Lighting Halo",
        thumb: IMAGES.galleryBackdrop,
        duration: "2:10",
      },
    ],
    status: "published",
  },

  // ═══════════════════════════════════════════════════════
  // SEO SETTINGS
  // ═══════════════════════════════════════════════════════
  seo: {
    globalTitle: "Siri Arts & Crafts — Luxury Handcrafted Event Decorations",
    globalDescription:
      "Premium handcrafted wedding, engagement, and ceremonial decorations rooted in South Indian heritage. Custom designs by master artisans in Hyderabad.",
    globalKeywords:
      "wedding decorations, Indian wedding, handcrafted decor, bridal entry, harathi plates, engagement trays, Hyderabad",
    ogImage: IMAGES.luxuryRoyalWedding,
    pages: {
      home: {
        title: "Siri Arts & Crafts — The Digital Studio",
        description:
          "Premium handcrafted event decorations for weddings, engagements, and sacred ceremonies.",
      },
      shop: {
        title: "Shop Collections — Siri Arts & Crafts",
        description:
          "Explore our curated collection of luxury handcrafted ceremonial decorations.",
      },
      gallery: {
        title: "Inspiration Gallery — Siri Arts & Crafts",
        description:
          "Browse our portfolio of stunning event installations and artisan creations.",
      },
      events: {
        title: "Event Decorations — Siri Arts & Crafts",
        description:
          "Complete event decoration services for weddings, engagements, and traditional ceremonies.",
      },
      about: {
        title: "Our Story — Siri Arts & Crafts",
        description:
          "Learn about our heritage, our artisans, and our mission to preserve traditional craftsmanship.",
      },
      contact: {
        title: "Contact Us — Siri Arts & Crafts",
        description:
          "Get in touch for custom orders, consultations, and inquiries.",
      },
    },
    status: "published",
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
    status: "published",
  },
};
