import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Blog from '../src/models/Blog';
import Location from '../src/models/Location';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') }); // Fallback

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not defined in .env or .env.local');
  process.exit(1);
}

const migrate = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Migrate Blogs
    const blogsPath = path.join(__dirname, '../../frontend/src/content/blogs.json');
    if (fs.existsSync(blogsPath)) {
      const blogsData = JSON.parse(fs.readFileSync(blogsPath, 'utf8'));
      for (const blog of blogsData) {
        // use findOneAndUpdate with upsert
        await Blog.findOneAndUpdate({ slug: blog.slug }, blog, { upsert: true, new: true });
      }
      console.log(`Migrated ${blogsData.length} blogs`);
    } else {
      console.log('blogs.json not found');
    }

    // Migrate Locations
    const locationsPath = path.join(__dirname, '../../frontend/src/content/locations.json');
    if (fs.existsSync(locationsPath)) {
      const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
      for (const location of locationsData) {
        await Location.findOneAndUpdate({ slug: location.slug }, location, {
          upsert: true,
          new: true,
        });
      }
      console.log(`Migrated ${locationsData.length} locations`);
    } else {
      console.log('locations.json not found');
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

migrate();
