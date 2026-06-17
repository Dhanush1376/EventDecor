const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Manually define schema to ensure it works even if TypeScript compilation is messy
const ProductSchema = new mongoose.Schema(
  {
    title: String,
    slug: { type: String, unique: true },
    category: String,
    price: Number,
    imageSrc: String,
    images: [String],
    description: String,
    isActive: Boolean,
    stock: Number,
  },
  { strict: false },
);

const TempProduct = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const importProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const dataPath = path.resolve(__dirname, '../../recovered_products_preview.json');
    const recoveredData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`Starting import of ${recoveredData.length} recovered products...`);

    let imported = 0;

    for (const item of recoveredData) {
      try {
        const product = new TempProduct({
          title: item.title,
          slug: item.slug,
          category: 'Recovered Items',
          price: 0,
          imageSrc: item.imageUrls[0],
          images: item.imageUrls,
          description:
            'Description pending. Please use the AI Auto-fill tool to generate descriptions and update pricing.',
          isActive: false, // Imported as Draft
          stock: 0,
        });

        await product.save();
        imported++;
        console.log(`[+] Imported: ${item.title}`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`[-] Skipped (Duplicate Slug): ${item.slug}`);
        } else {
          console.error(`[!] Failed to import ${item.title}:`, err.message);
        }
      }
    }

    console.log(`✅ Successfully imported ${imported} products as DRAFTS.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
};

importProducts();
