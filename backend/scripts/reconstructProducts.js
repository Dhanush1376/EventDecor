const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const reconstruct = () => {
  const sitemapPath = path.resolve(__dirname, '../sitemap_backup.xml');
  const cloudinaryPath = path.resolve(__dirname, '../cloudinary_inventory.json');
  const outputPath = path.resolve(__dirname, '../recovered_products_preview.json');

  if (!fs.existsSync(sitemapPath) || !fs.existsSync(cloudinaryPath)) {
    console.error('Missing sitemap or cloudinary data.');
    return;
  }

  const cloudinaryData = JSON.parse(fs.readFileSync(cloudinaryPath, 'utf8'));
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsedSitemap = parser.parse(sitemapXml);

  const urls = parsedSitemap.urlset.url || [];

  const recovered = [];

  // Parse sitemap for titles and images
  urls.forEach((u) => {
    if (u['image:image']) {
      const imgInfo = u['image:image'];
      // Some sitemap entries might have an array of images or a single object
      const images = Array.isArray(imgInfo) ? imgInfo : [imgInfo];

      images.forEach((img) => {
        let loc = img['image:loc'];
        let title = img['image:title'];

        // Match with cloudinary data
        const cImage = cloudinaryData.find((c) => c.secure_url === loc || c.url === loc);

        recovered.push({
          title: title || 'Unknown Title',
          slug: title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'unknown-slug',
          imageUrls: [loc],
          source: 'sitemap' + (cImage ? ' + cloudinary' : ''),
          confidenceScore: cImage ? 'High' : 'Medium',
          cloudinaryId: cImage ? cImage.public_id : null,
          cloudinaryDate: cImage ? cImage.created_at : null,
        });
      });
    }
  });

  // What about Cloudinary images in /products/ folder that aren't in sitemap?
  cloudinaryData.forEach((c) => {
    if (c.asset_folder === 'products' || c.public_id.startsWith('products/')) {
      const alreadyRecovered = recovered.find(
        (r) => r.imageUrls.includes(c.secure_url) || r.imageUrls.includes(c.url),
      );

      if (!alreadyRecovered) {
        // Try to guess title from display_name if it isn't random gibberish
        let title = c.display_name;
        if (title.length > 15 && !title.includes(' ')) {
          title = 'Unknown Product - ' + c.public_id.split('/').pop();
        }

        recovered.push({
          title: title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          imageUrls: [c.secure_url],
          source: 'cloudinary-only',
          confidenceScore: 'Low',
          cloudinaryId: c.public_id,
          cloudinaryDate: c.created_at,
        });
      }
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(recovered, null, 2));
  console.log(`✅ Generated recovered_products_preview.json with ${recovered.length} items.`);
};

reconstruct();
