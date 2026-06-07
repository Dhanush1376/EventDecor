import { Request, Response } from 'express';
import mongoose from 'mongoose';
import sharp from 'sharp';
import Product from '../models/Product';
import logger from '../config/logger';

/**
 * Fetch an image buffer from a URL.
 * Falls back to a transparent 1x1 pixel buffer on failure.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    logger.error(`Error fetching image for OG composition from ${url}:`, err);
    // Return transparent 1x1 pixel if fetch fails
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
      'base64',
    );
  }
}

/**
 * Creates an SVG layout for the product details (text, price, badge)
 * that `sharp` will overlay on top of the base image.
 */
function createOverlaySvg(title: string, price: number, siteName: string) {
  // Truncate title if it's too long
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
  
  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradient for text backdrop -->
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Gradient overlay to ensure text readability -->
      <rect x="0" y="330" width="1200" height="300" fill="url(#grad)" />
      
      <!-- Brand Logo Badge (Top Right) -->
      <g transform="translate(980, 40)" filter="url(#shadow)">
        <circle cx="90" cy="90" r="80" fill="#ffffff" />
        <circle cx="90" cy="90" r="76" fill="none" stroke="#D0C5AF" stroke-width="2" />
        <text x="90" y="85" font-family="sans-serif" font-size="28" font-weight="bold" fill="#1a1a1a" text-anchor="middle" dominant-baseline="middle">Siri Arts</text>
        <text x="90" y="115" font-family="sans-serif" font-size="20" font-weight="normal" fill="#666666" text-anchor="middle" dominant-baseline="middle">&amp; Crafts</text>
      </g>
      
      <!-- Product Title -->
      <text x="60" y="520" font-family="sans-serif" font-size="64" font-weight="bold" fill="#ffffff" filter="url(#shadow)">
        ${displayTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </text>
      
      <!-- Product Price & Store Name -->
      <text x="60" y="585" font-family="sans-serif" font-size="42" font-weight="bold" fill="#D0C5AF" filter="url(#shadow)">
        ₹${price}
      </text>
      <text x="320" y="585" font-family="sans-serif" font-size="32" font-weight="normal" fill="#e0e0e0" filter="url(#shadow)">
        •  ${siteName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </text>
    </svg>
  `;
}

export const generateOgImage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    let product;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).lean();
    } else {
      product = await Product.findOne({ slug: id }).lean();
    }

    if (!product) {
      return res.status(404).send('Product not found');
    }

    // 1. Fetch the main product image
    const productImageUrl = product.imageSrc || (product.images && product.images[0]);
    if (!productImageUrl) {
      return res.status(400).send('Product has no image');
    }

    const imageBuffer = await fetchImageBuffer(productImageUrl);

    // 2. Base composition: 1200x630 canvas
    const baseCanvas = sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 245, g: 245, b: 245, alpha: 1 }
      }
    });

    // 3. Resize and crop the product image to fill the canvas as a cover
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();

    // 4. Generate the overlay text and layout SVG
    const siteName = process.env.VITE_SITE_NAME || 'Siri Arts & Crafts';
    const svgOverlay = Buffer.from(createOverlaySvg(product.title, product.price, siteName));

    // 5. Composite everything together
    const finalImageBuffer = await baseCanvas
      .composite([
        { input: resizedImageBuffer, top: 0, left: 0 },
        { input: svgOverlay, top: 0, left: 0 }
      ])
      .png()
      .toBuffer();

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // Cache for 24 hours
    res.send(finalImageBuffer);
  } catch (err) {
    logger.error(`[Social Preview] Error generating OG image for product ${req.params.id}:`, err);
    res.status(500).send('Error generating image');
  }
};

export const generateSocialPreviewHtml = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    let product;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).lean();
    } else {
      product = await Product.findOne({ slug: id }).lean();
    }

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const siteUrl = process.env.VITE_SITE_URL || `https://${req.get('host')}`;
    const siteName = process.env.VITE_SITE_NAME || 'Siri Arts & Crafts';
    const productUrl = `${siteUrl}/product/${product.slug || product._id}`;
    
    // OG Image Route
    const ogImageUrl = `${process.env.BACKEND_URL || `https://${req.get('host')}/api/v1`}/social/product/${product._id}/image.png`;
    
    // Truncate description for SEO
    const description = (product.seoDescription || product.description || '').replace(/<[^>]*>?/gm, '').substring(0, 160);
    const title = `${product.seoTitle || product.title} | ${siteName}`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <meta name="description" content="${description}">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="product">
        <meta property="og:url" content="${productUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${ogImageUrl}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:site_name" content="${siteName}">
        <meta property="product:price:amount" content="${product.price}">
        <meta property="product:price:currency" content="INR">

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:url" content="${productUrl}">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${ogImageUrl}">
        
        <!-- Redirect real users who happen to hit this page to the frontend -->
        <meta http-equiv="refresh" content="0;url=${productUrl}">
        <link rel="canonical" href="${productUrl}">
      </head>
      <body>
        <p>Redirecting to <a href="${productUrl}">${title}</a>...</p>
        <script>
          window.location.replace("${productUrl}");
        </script>
      </body>
      </html>
    `;

    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(html.trim());
  } catch (err) {
    logger.error(`[Social Preview] Error generating HTML for product ${req.params.id}:`, err);
    res.status(500).send('Error generating HTML');
  }
};
