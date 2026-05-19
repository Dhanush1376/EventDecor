import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import logger from '../config/logger';

const SITE_URL = process.env.FRONTEND_URL || 'https://siriartsandcrafts.com';

/**
 * Enterprise dynamic sitemap generator.
 * Fetches all static, product, gallery, and event routes from database,
 * builds a valid XML output with Google Image Sitemap tags,
 * and writes to the frontend public static folder.
 */
export async function generateSitemap(): Promise<string> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Core static routes definition
    const staticRoutes = [
      { loc: '', changefreq: 'daily', priority: '1.0' },
      { loc: '/collections', changefreq: 'daily', priority: '0.9' },
      { loc: '/about', changefreq: 'monthly', priority: '0.6' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.6' },
      { loc: '/gallery', changefreq: 'weekly', priority: '0.7' },
      { loc: '/custom-orders', changefreq: 'monthly', priority: '0.8' },
      { loc: '/events', changefreq: 'weekly', priority: '0.8' },
      { loc: '/showcases', changefreq: 'weekly', priority: '0.7' },
      { loc: '/shipping', changefreq: 'monthly', priority: '0.4' },
      { loc: '/returns', changefreq: 'monthly', priority: '0.4' },
      { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
      { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // Append static pages
    for (const route of staticRoutes) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${route.loc}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Retrieve models dynamically from mongoose to prevent circular imports
    const Product = mongoose.model('Product');
    const Gallery = mongoose.model('Gallery');
    const Event = mongoose.model('Event');

    // 2. Fetch Active Products
    if (Product) {
      const products = await Product.find({ isActive: true })
        .select('_id updatedAt imageSrc title')
        .lean() as any[];
        
      for (const prod of products) {
        const prodDate = new Date(prod.updatedAt || new Date()).toISOString().split('T')[0];
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/product/${prod._id}</loc>\n`;
        xml += `    <lastmod>${prodDate}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        if (prod.imageSrc) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${prod.imageSrc}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(prod.title || 'Siri Masterpiece')}</image:title>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      }
    }

    // 3. Fetch Active Gallery Items
    if (Gallery) {
      const galleries = await Gallery.find({ isActive: true })
        .select('_id updatedAt image title')
        .lean() as any[];
        
      for (const item of galleries) {
        const itemDate = new Date(item.updatedAt || new Date()).toISOString().split('T')[0];
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/gallery/${item._id}</loc>\n`;
        xml += `    <lastmod>${itemDate}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        if (item.image) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${item.image}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(item.title || 'Siri Gallery Showcase')}</image:title>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      }
    }

    // 4. Fetch Active Events
    if (Event) {
      const events = await Event.find({ isActive: true })
        .select('_id updatedAt image title')
        .lean() as any[];
        
      for (const ev of events) {
        const evDate = new Date(ev.updatedAt || new Date()).toISOString().split('T')[0];
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/events/${ev._id}</loc>\n`;
        xml += `    <lastmod>${evDate}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        if (ev.image) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${ev.image}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(ev.title || 'Siri Event Styling')}</image:title>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>\n`;

    // 5. Autowrite to static public folder for static host serving
    // Determine the path to the workspace root dynamically based on whether we are running from dist or src
    const isCompiled = __dirname.replace(/\\/g, '/').includes('/dist/');
    const relativePathToRoot = isCompiled ? '../../../../' : '../../../';
    const frontendPublicDir = path.resolve(__dirname, relativePathToRoot, 'frontend/public');
    const frontendPublicPath = path.join(frontendPublicDir, 'sitemap.xml');

    if (fs.existsSync(frontendPublicDir)) {
      try {
        fs.writeFileSync(frontendPublicPath, xml, 'utf8');
        logger.info(`[SITEMAP] Static sitemap successfully written to ${frontendPublicPath}`);
      } catch (fsErr: any) {
        logger.warn(`[SITEMAP] Could not write sitemap file to frontend public folder: ${fsErr.message}`);
      }
    } else {
      logger.info(`[SITEMAP] Frontend public folder not found at ${frontendPublicDir}. Skipping static sitemap write.`);
    }

    return xml;
  } catch (error: any) {
    logger.error(`[SITEMAP GENERATOR ERROR] ${error.message}`);
    throw error;
  }
}

/**
 * Escapes unsafe string characters for valid XML nesting.
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Debounce timer reference
let sitemapTimeout: any = null;

/**
 * Enterprise debounced sitemap updater.
 * Delays sitemap regeneration to avoid overhead on bulk modifications.
 */
export function triggerSitemapUpdate(): void {
  if (sitemapTimeout) {
    (globalThis as any).clearTimeout(sitemapTimeout);
  }
  
  sitemapTimeout = (globalThis as any).setTimeout(async () => {
    try {
      await generateSitemap();
    } catch (err: any) {
      logger.error(`[SITEMAP AUTO-UPDATE ERROR] ${err.message}`);
    }
  }, 5000); // 5 seconds debounce
}

