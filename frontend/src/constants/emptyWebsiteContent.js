/**
 * Minimal CMS shape for loading states — no marketing copy or stock imagery.
 * Admin editor defaults remain in admin/data/websiteContentData.js.
 */
export const emptyWebsiteContent = {
  hero: {
    title: '',
    subtitle: '',
    ctaPrimary: { text: '', link: '/' },
    ctaSecondary: { text: '', link: '/' },
    backgroundImage: '',
    mobileBackgroundImage: '',
    isVisible: true,
    status: 'published',
  },
  heroNavigationCards: { items: [], isVisible: true, status: 'published' },
  featuredCollections: {
    sectionTitle: '',
    sectionSubtitle: '',
    items: [],
    isVisible: true,
    status: 'published',
  },
  featuredProducts: {
    sectionTitle: '',
    sectionSubtitle: '',
    productIds: [],
    maxDisplay: 4,
    isVisible: true,
    status: 'published',
  },
  testimonials: { sectionTitle: '', items: [], isVisible: true, status: 'published' },
  contact: { email: '', phone: '', whatsapp: '', address: '' },
  aboutPage: { heroImage: '', title: '', subtitle: '' },
  eventsPage: {
    hero: { title: '', subtitle: '', backgroundImage: '' },
    promo: { title: '', subtitle: '', image: '' },
  },
};
