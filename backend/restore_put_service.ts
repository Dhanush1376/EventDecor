import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ContentService from './src/services/contentService';

dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGO_URI as string).then(async () => {
  try {
    const payload = [
      { id: "hero", label: "Hero Banner", isVisible: true },
      { id: "promoBanner", label: "Promotional Banner", isVisible: true },
      { id: "categoryGrid", label: "Category Grid", "isVisible": true },
      { id: "trendingProducts", label: "Trending Now", isVisible: true },
      { id: "shopByOccasion", label: "Shop By Occasion", isVisible: true },
      { id: "featuredProducts", label: "Best Sellers", isVisible: true },
      { id: "promoBanner_1780922094217", label: "Promotional Banner (Copy)", isVisible: true },
      { id: "recommendedProducts", label: "Recommended For You", isVisible: true },
      { id: "galleryInspiration", label: "Gallery Inspiration", isVisible: true }
    ];
    await ContentService.updateSection('homepageSections', payload);
    console.log('Restore successful');
  } catch (err) {}
  process.exit(0);
}).catch(console.error);
