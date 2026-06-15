import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import logger from './config/logger';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ContentSectionSchema = new mongoose.Schema({
  sectionKey: { type: String, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['published', 'draft', 'archived'], default: 'published' },
});
const ContentSection = mongoose.model('ContentSection', ContentSectionSchema);

const newSections = [
  {
    sectionKey: 'promoBanner',
    data: {
      text: 'FREE SHIPPING ON ALL ORDERS ABOVE ₹999',
      link: '/collections',
      isActive: true,
    },
    status: 'published',
  },
  {
    sectionKey: 'categoryGrid',
    data: {
      sectionTitle: 'Shop By Category',
      sectionSubtitle: 'Explore our artisan-crafted collections',
      selectedCategories: [
        'Traditional Wedding Decor',
        'Pooja Decoration Sets',
        'Engagement Ring Trays',
        'Customized Gift Hampers',
        'Haldi Ceremony Kits',
      ],
      isVisible: true,
    },
    status: 'published',
  },
  {
    sectionKey: 'shopByOccasion',
    data: {
      sectionTitle: 'Shop By Occasion',
      sectionSubtitle: 'Curated for every milestone',
      occasions: [
        {
          id: 1,
          title: 'Weddings',
          link: '/collections?category=Weddings',
          image:
            'https://res.cloudinary.com/drxgnnzeb/image/upload/v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png',
        },
        {
          id: 2,
          title: 'Engagements',
          link: '/collections?category=Engagements',
          image:
            'https://res.cloudinary.com/drxgnnzeb/image/upload/v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png',
        },
        {
          id: 3,
          title: 'Pooja',
          link: '/collections?category=Pooja',
          image:
            'https://res.cloudinary.com/drxgnnzeb/image/upload/v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png',
        },
      ],
      isVisible: true,
    },
    status: 'published',
  },
  {
    sectionKey: 'trendingProducts',
    data: { sectionTitle: 'Trending Now', maxDisplay: 8, isVisible: true },
    status: 'published',
  },
  {
    sectionKey: 'recommendedProducts',
    data: { sectionTitle: 'Recommended For You', maxDisplay: 8, isVisible: true },
    status: 'published',
  },
  {
    sectionKey: 'fashionInspiration',
    data: { sectionTitle: 'Fashion & Inspiration', maxDisplay: 4, isVisible: true },
    status: 'published',
  },
];

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    logger.info('Connected to DB');

    for (const section of newSections) {
      await ContentSection.updateOne(
        { sectionKey: section.sectionKey },
        { $setOnInsert: { data: section.data, status: section.status } },
        { upsert: true },
      );
      logger.info(`Upserted ${section.sectionKey}`);
    }

    // Also update homepageSections
    const hp = await ContentSection.findOne({ sectionKey: 'homepageSections' });
    if (hp && Array.isArray(hp.data)) {
      const keys = [
        'promoBanner',
        'categoryGrid',
        'trendingProducts',
        'shopByOccasion',
        'recommendedProducts',
        'fashionInspiration',
      ];
      let updated = false;
      for (const k of keys) {
        if (!hp.data.find((s: any) => s.id === k)) {
          hp.data.push({ id: k, label: k, isVisible: true });
          updated = true;
        }
      }
      if (updated) {
        await ContentSection.updateOne(
          { sectionKey: 'homepageSections' },
          { $set: { data: hp.data } },
        );
        logger.info('Updated homepageSections');
      }
    }

    logger.info('Migration complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

migrate();
