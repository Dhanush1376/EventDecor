import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db';
import Product from '../models/Product';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import ContentSection from '../models/ContentSection';
import User from '../models/User';
import Review from '../models/Review';

dotenv.config();

// Premium High-Definition Luxury Event Curation Images
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

const initialWebsiteContent = {
  hero: {
    title: "Heritage Crafted for Modern Celebrations",
    subtitle: "Handcrafted luxury event decorations rooted in South Indian tradition",
    ctaPrimary: { text: "Explore Collections", link: "/collections" },
    ctaSecondary: { text: "Book Consultation", link: "/custom-orders" },
    backgroundImage: IMAGES.luxuryRoyalWedding,
    mobileBackgroundImage: "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png",
    badgeText: "Artisan Excellence Since 2015",
    isVisible: true,
  },
  featuredCollections: {
    sectionTitle: "Curated Collections",
    sectionSubtitle: "Explore our most sought-after ceremonial masterpieces",
    items: [
      { id: 1, name: "Wedding Essentials", link: "/collections?category=Traditional+Wedding+Decor", image: IMAGES.luxuryRoyalWedding, isVisible: true },
      { id: 2, name: "Pooja & Rituals", link: "/collections?category=Pooja+Decoration+Sets", image: IMAGES.templeStyleMandap, isVisible: true },
      { id: 3, name: "Engagement Trays", link: "/collections?category=Engagement+Ring+Trays", image: IMAGES.galleryBackdrop, isVisible: true },
      { id: 4, name: "Gift Hampers", link: "/collections?category=Customized+Gift+Hampers", image: IMAGES.galleryHampers, isVisible: true },
    ],
    isVisible: true,
  },
  aboutPage: {
    heroTitle: "The Siri Arts Story",
    heroSubtitle: "Preserving Heritage, Crafting Dreams",
    founderName: "Siri Devi",
    founderRole: "Founder & Master Artisan",
    founderStory: "Born into a family of traditional artisans in Hyderabad, Siri Devi founded Siri Arts & Crafts with a singular vision — to preserve the dying art of ceremonial decoration while bringing it to modern celebrations.",
    missionStatement: "To honor the sacred art of Indian ceremonial decoration by creating handcrafted masterpieces that blend timeless heritage with contemporary elegance.",
    stats: [
      { label: "Events Decorated", value: "2,500+" },
      { label: "Master Artisans", value: "15+" },
      { label: "Happy Families", value: "5,000+" },
    ],
  },
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
    ],
    visualThemes: [
      { id: "Royal", label: "Royal Palace", desc: "Heirloom gold setups with custom silk drapery.", img: IMAGES.luxuryRoyalWedding },
      { id: "Heritage", label: "Heritage Botanicals", desc: "Vibrant custom botanical archways.", img: IMAGES.templeStyleMandap },
    ],
    colorPalettes: [
      { id: "Ivory & Gold", name: "Ivory & Gold", hexes: ["#faf9f6", "#d4af37", "#bda060"] },
      { id: "Crimson & Artisanal", name: "Crimson & Artisanal", hexes: ["#8b0000", "#ff4500", "#ffd700"] },
    ],
    venueSizes: [
      { id: "Intimate", label: "Intimate Setup", capacity: "Under 100 Guests", desc: "Perfect for home functions.", previewImg: IMAGES.templeStyleMandap },
      { id: "Banquet", label: "Standard Banquet", capacity: "200 - 500 Guests", desc: "Optimized for hotel ballrooms.", previewImg: IMAGES.modernReceptionLounge },
      { id: "Grand", label: "Grand Lawn / Palace", capacity: "500+ Guests", desc: "Majestic layout for broad entrance.", previewImg: IMAGES.luxuryRoyalWedding },
    ],
    packageModules: [
      { id: "mandap", label: "Mandap Setup", basePrice: 150000, desc: "Sacred core structure", isPopular: true },
      { id: "ceiling", label: "Artisanal Ceiling", basePrice: 85000, desc: "Suspended botanical overhead", isPopular: true },
      { id: "stage", label: "Stage Setup", basePrice: 120000, desc: "Main backdrop relief platforms", isPopular: true },
      { id: "lighting", label: "Lighting Setup", basePrice: 75000, desc: "Cinematic focal halos", isPopular: true },
    ],
    completedEvents: [
      { id: 1, title: "Malhotra Palace Wedding", location: "Udaipur Grounds", date: "Jan 2026", img: IMAGES.luxuryRoyalWedding },
      { id: 2, title: "Sangeeta & Dev Haldi Soiree", location: "Bangalore Lawns", date: "Feb 2026", img: IMAGES.templeStyleMandap },
    ],
    videos: [
      { title: "Royal Palace Grounds Mandap Reveal", thumb: IMAGES.luxuryRoyalWedding, duration: "1:45" },
      { title: "Artisanal Ceiling Matrix Timelapse", thumb: IMAGES.templeStyleMandap, duration: "0:58" },
    ],
    status: "published",
  },
  contact: {
    phone: "9866006648",
    email: "Sirisha.atmakuri@gmail.com",
    whatsapp: "9866006648",
    address: "#28-1-92, Beside Kailash PavBhaji Center, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh",
    businessHours: "Mon - Sat: 10 AM - 7 PM",
  },
  seo: {
    globalTitle: "Siri Arts & Crafts — Luxury Handcrafted Event Decorations",
    globalDescription: "Premium handcrafted wedding, engagement, and ceremonial decorations rooted in South Indian heritage.",
    globalKeywords: "wedding decorations, Indian wedding, handcrafted decor",
  },
  theme: {
    showMandalaArt: true,
    showAnimations: true,
    showFloatingElements: true,
    enableSplashScreen: true,
    enableSmoothScroll: true,
    darkMode: false,
  },
  customOrders: {
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
    ]
  },
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
    }
  },
  featuredProducts: {
    sectionTitle: "Bestselling Masterpieces",
    sectionSubtitle: "The most loved creations from our atelier",
    productIds: [], // Will be updated after products are created
    maxDisplay: 4,
    isVisible: true,
  },
  storyTeaser: {
    title: "The Art of Celebration",
    subtitle: "Where ancient craftsmanship meets modern elegance",
    description: "Every creation at Siri Arts & Crafts is a labor of love — hand-carved, hand-painted, and hand-assembled by master artisans who have inherited their skills across generations.\n\nOur studio honors the sacred art of Indian ceremonial decoration by creating handcrafted masterpieces that blend timeless heritage with contemporary elegance.",
    ctaText: "Our Story",
    ctaLink: "/about",
    image: IMAGES.templeStyleMandap,
    isVisible: true,
    stats: [
      { id: 1, value: "50+", label: "Master Artisans", icon: "groups" },
      { id: 2, value: "120h", label: "Avg. Craft Per Piece", icon: "schedule" }
    ]
  },
  galleryPreview: {
    sectionTitle: "Inspiration Gallery",
    sectionSubtitle: "A visual journey through our finest installations",
    galleryIds: [], // Will be updated after gallery is created
    maxDisplay: 6,
    isVisible: true,
  },
  testimonials: {
    sectionTitle: "Voices of Heritage",
    items: [
      { id: 1, name: "Lakshmi Devi", role: "Bride, Hyderabad", text: "The wedding decorations were beyond anything I imagined. True artisanal mastery.", rating: 5, isVisible: true },
      { id: 2, name: "Priya Reddy", role: "Event Planner", text: "Every piece radiates heritage. Our clients are always in awe of the craftsmanship.", rating: 5, isVisible: true },
    ],
    isVisible: true,
  },

  homepageSections: [
    { id: "hero", label: "Hero Banner", isVisible: true },
    { id: "featuredCollections", label: "Featured Collections", isVisible: true },
    { id: "featuredProducts", label: "Bestselling Products", isVisible: true },
    { id: "storyTeaser", label: "Our Story Teaser", isVisible: true },
    { id: "galleryPreview", label: "Gallery Preview", isVisible: true },
    { id: "testimonials", label: "Testimonials", isVisible: true },
  ],
  storeSettings: {
    returnPolicyDays: 7,
    giftWrapFee: 350,
    shippingFee: 0,
    platformFee: 0,
    sellerName: "Siri Arts Artisans",
    deliveryTimelineDays: 5,
    badges: [
      { id: "safe", icon: "verified_user", text: "Safe Payments" },
      { id: "returns", icon: "published_with_changes", text: "Easy Returns" },
      { id: "authentic", icon: "verified", text: "100% Authentic" }
    ]
  }
};

const allProducts: any[] = [];

const masterEventsData = [
  { title: "Wedding Ceremony", subtitle: "Sacred Gold & Crimson Sanctuary", category: "Wedding Ceremony", style: "Royal", image: IMAGES.luxuryRoyalWedding, decorCount: "120+ Decor Elements", venueType: "Indoor Banquet & Heritage Lawns", pricing: "Starting at Rs. 3,50,000", description: "An architectural masterpiece inspired by palace courtyards.", colorPalette: ["#f5f0eb", "#d4af37", "#8b0000"], features: ["24K Gold Plated Pavilion Archways", "Handwoven Pure Zardozi Backdrops"], venueSize: "Suitable for 300 - 1500 Guests", gallery: [IMAGES.luxuryRoyalWedding, IMAGES.templeStyleMandap] },
  { title: "Traditional Wedding Decor", subtitle: "Sacred South Indian Heritage", category: "Wedding Ceremony", style: "South Indian", image: IMAGES.templeStyleMandap, decorCount: "95+ Decor Elements", venueType: "Traditional Pavilion & Open Lawns", pricing: "Starting at Rs. 2,80,000", description: "Replicating the timeless stone aesthetics of ancient southern temples.", colorPalette: ["#e5d5c5", "#b8860b", "#228b22"], features: ["Teakwood Replica Sculpted Pillars", "Traditional Heritage Pavilion Setups"], venueSize: "Suitable for 200 - 1200 Guests", gallery: [IMAGES.templeStyleMandap, IMAGES.galleryBackdrop] },
  { title: "Engagement Ceremony", subtitle: "Ivory Glow & Silk Accents", category: "Engagement Ceremony", style: "Elegant", image: IMAGES.galleryBackdrop, decorCount: "70+ Decor Elements", venueType: "Luxury Hotel Terraces & Boutiques", pricing: "Starting at Rs. 1,50,000", description: "A harmonious fusion of modern minimalist glass framing with traditional heavy silk ring tray setups.", colorPalette: ["#ffffff", "#eec900", "#dcdcdc"], features: ["Floating Crystal Illumination Halos", "Custom Engraved Antique Shagun Plinths"], venueSize: "Suitable for 50 - 300 Guests", gallery: [IMAGES.galleryBackdrop, IMAGES.galleryHampers] },
  { title: "Reception Decoration", subtitle: "Modern Luxury & Floating Gold Accents", category: "Reception Decoration", style: "Modern", image: IMAGES.modernReceptionLounge, decorCount: "110+ Decor Elements", venueType: "Grand Ballroom & Glasshouse Pavilions", pricing: "Starting at Rs. 4,000,000", description: "An ultra-chic evening setup starring metallic brass arches.", colorPalette: ["#1a1a1a", "#d4af37", "#fdfbf7"], features: ["Illuminated Brass Monogram Stage Screens", "Suspended Filament Glow Canopies"], venueSize: "Suitable for 400 - 2000 Guests", gallery: [IMAGES.modernReceptionLounge, IMAGES.luxuryRoyalWedding] },
  { title: "Traditional Pooja Setup", subtitle: "Vibrant Yellows & Traditional Urli Setups", category: "Traditional Pooja Setup", style: "Traditional", image: IMAGES.haldiVibrantSetup, decorCount: "60+ Decor Elements", venueType: "Courtyards & Heritage Open Terraces", pricing: "Starting at Rs. 95,000", description: "Drenched in auspicious yellows and warm saffron hues.", colorPalette: ["#ffcc00", "#ff6600", "#ffffff"], features: ["Solid Hammered Brass Shagun Urli Seat", "Silk Tassel Chandelier Frames"], venueSize: "Suitable for 30 - 150 Guests", gallery: [IMAGES.haldiVibrantSetup, IMAGES.galleryMetalPots] },
];

const galleryInspirations = [
  { title: "Traditional Wedding Decor", teluguTitle: "సాంప్రదాయ తెలుగు పెళ్లి అలంకరణలు", category: "Traditional Wedding Decor", event: "Wedding Ceremony", style: "Royal Heritage", image: IMAGES.luxuryRoyalWedding, height: "aspect-[3/4]", colorPalette: ["#f5f0eb", "#d4af37", "#8b0000"], tags: ["Gold", "Velvet", "Mandap", "Grand"], description: "A majestic handcrafted mandap arch featuring intricate zardozi embroidery and gold leaf details." },
  { title: "Floral Decoration Sets", teluguTitle: "పూల అలంకరణలు", category: "Floral Decoration Sets", event: "Traditional Pooja Setup", style: "Vibrant Traditional", image: IMAGES.templeStyleMandap, height: "aspect-[4/5]", colorPalette: ["#ffcc00", "#ff6600", "#ffffff"], tags: ["Yellow", "Orange", "Botanical", "Haldi"], description: "Vibrant handcrafted heritage arrangements." },
  { title: "Plate Decoration & Packing", teluguTitle: "ప్లేట్ ప్యాకింగ్ & అలంకరణ", category: "Plate Decoration & Packing", event: "Engagement Ceremony", style: "Minimal Modern", image: IMAGES.galleryPlatePacking, height: "aspect-square", colorPalette: ["#ffffff", "#eec900", "#dcdcdc"], tags: ["Relief", "White", "Modern", "Table"], description: "Elegant minimal tablescapes featuring floating relief patterns." },
];

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ SEEDING SHIELD: Seeding operations are strictly disabled in production mode to prevent accidental data loss.');
    process.exit(1);
  }

  try {
    await connectDB();

    // Clear existing data - DISABLED TO PREVENT ACCIDENTAL WIPES
    // await Product.deleteMany();
    // await Event.deleteMany();
    // await Gallery.deleteMany();
    // await ContentSection.deleteMany();
    // await User.deleteMany();
    // await Review.deleteMany();
    // console.log('🗑️ Data cleared (including reviews)');

    // 1. Create Admin Users
    const defaultPassword = 'SuperAdminPassword123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    await User.create([
      {
        name: 'Siri Devi (Owner)',
        email: 'sirisha.atmakuri@gmail.com',
        role: 'super_admin',
        isVerified: true,
        passwordHash,
        passwordChangedAt: new Date(),
      },
      {
        name: 'Admin User',
        email: 'admin@siriartsandcrafts.com',
        role: 'main_admin',
        isVerified: true,
        passwordHash,
        passwordChangedAt: new Date(),
      }
    ]);
    console.log('👤 Admin & Super Admin users created with default password: ' + defaultPassword);

    // 2. Create Products
    const createdProducts = await Product.insertMany(allProducts);
    console.log(`📦 ${createdProducts.length} Products created`);

    // 3. Create Events
    const createdEvents = await Event.insertMany(masterEventsData);
    console.log(`📅 ${createdEvents.length} Events created`);

    // 4. Create Gallery Items
    const galleryItemsWithRefs = galleryInspirations.map((item, index) => {
      // Map some products to gallery items for demonstration
      const linkedProductIds = createdProducts.slice(0, 2).map(p => p._id);
      return {
        ...item,
        linkedProducts: linkedProductIds,
      };
    });
    const createdGallery = await Gallery.insertMany(galleryItemsWithRefs);
    console.log(`🖼️ ${createdGallery.length} Gallery items created`);

    // 5. Update CMS Content with real IDs
    const finalContent: any = { ...initialWebsiteContent };
    finalContent.featuredProducts.productIds = createdProducts.slice(0, 4).map(p => p._id);
    finalContent.galleryPreview.galleryIds = createdGallery.slice(0, 3).map(g => g._id);

    const sectionEntries = Object.entries(finalContent).map(([key, value]) => ({
      sectionKey: key,
      data: value,
      status: 'published',
    }));

    await ContentSection.insertMany(sectionEntries);
    console.log('📝 CMS Content seeded with cross-references');

    // 6. Create Customer & Reviews
    const customerUser = await User.create({
      name: 'Radha Krishnan',
      email: 'customer@siriartsandcrafts.com',
      role: 'customer',
      isVerified: true,
    });

    const sampleReviews = [
      {
        product: createdProducts[0]._id,
        customer: customerUser._id,
        customerName: 'Meera & Devraj Singhania',
        rating: 5,
        comment: 'The Royal Mandap Arch was the absolute soul of our celebration. The gold leaf detailing and brass lotus pillars felt incredibly authentic and royal. Our event planner was astounded by the pristine quality of these handcrafted rental masterpieces. Worth every single rupee for the premium aura it brought to our palace venue!',
        images: [
          'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop',
        ],
        status: 'approved',
        location: 'Jubilee Hills, Hyderabad',
        eventType: 'Royal Haldi & Engagement Arch',
        favoriteElement: 'Antique Brass Urli & Golden Lotus Archway',
        helpfulCount: 34,
        category: 'showcase',
        verified: true,
        isMock: true,
      },
      {
        product: createdProducts[1]._id,
        customer: customerUser._id,
        customerName: 'Ananya Varma',
        rating: 5,
        comment: 'Siri Arts & Crafts redefined what traditional decor means to our family. The delivery concierge arrived perfectly on time, and the setup team transformed our garden marquee into an absolute sanctuary. The handcrafted coconut leaf arrangements and brass diyas were praised by all our elder relatives.',
        images: [
          'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=800&auto=format&fit=crop',
        ],
        status: 'approved',
        location: 'Banjara Hills, Hyderabad',
        eventType: 'Traditional Bridal Shower Curation',
        favoriteElement: 'Artisanal Coconut Leaf Trays & Hand-carved Pedestals',
        helpfulCount: 28,
        category: 'event',
        verified: true,
        isMock: true,
      },
      {
        product: createdProducts[2]._id,
        customer: customerUser._id,
        customerName: 'Vikramaditya Rao',
        rating: 5,
        comment: 'We rented the premium stage backdrop and 12 antique brass stands for our annual corporate heritage gala. The entire booking experience was flawless. Seamless online quotation, lightning-fast delivery, and an immaculate setup that radiated prestige.',
        images: [
          'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
        ],
        status: 'approved',
        location: 'Gachibowli, Hyderabad',
        eventType: 'Corporate Heritage Banquet',
        favoriteElement: 'Handcrafted Brass Diya Stands & Silk Drapes',
        helpfulCount: 52,
        category: 'product',
        verified: true,
        isMock: true,
      },
      {
        product: createdProducts[3]._id,
        customer: customerUser._id,
        customerName: 'Aarti Patel',
        rating: 4,
        comment: 'They transformed our vision into reality. The floral mandap was breathtaking and the attention to cultural details was deeply appreciated.',
        status: 'pending',
        location: 'Secunderabad',
        eventType: 'Home Varalakshmi Vratam Pooja',
        favoriteElement: 'Brass Diya & Marigold Strings',
        helpfulCount: 0,
        category: 'product',
        verified: true,
        isMock: true,
      }
    ];

    await Review.insertMany(sampleReviews);
    console.log('⭐ Sample reviews seeded successfully');

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding failed: ${error}`);
    process.exit(1);
  }
};

seed();
