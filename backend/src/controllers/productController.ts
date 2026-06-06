import { Request, Response } from 'express';
import fs from 'fs';
import dns from 'dns/promises';
import path from 'path';
import ProductService from '../services/productService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await ProductService.getAllProducts(req.query);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).json(new ApiResponse(true, 'Products fetched successfully', result));
});

export const getAdminProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await ProductService.getAllProducts(req.query, true); // true = isAdmin
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.status(200).json(new ApiResponse(true, 'Admin products fetched successfully', result));
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.getProductById(req.params.id as string);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).json(new ApiResponse(true, 'Product fetched successfully', product));
});

export const createProduct = asyncHandler(async (req: Request | any, res: Response) => {
  const product = await ProductService.createProduct(req.body, req.user);
  res.status(201).json(new ApiResponse(true, 'Product created successfully', product));
});

export const updateProduct = asyncHandler(async (req: Request | any, res: Response) => {
  const product = await ProductService.updateProduct(req.params.id as string, req.body, req.user);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.status(200).json(new ApiResponse(true, 'Product updated successfully', product));
});

export const deleteProduct = asyncHandler(async (req: Request | any, res: Response) => {
  const product = await ProductService.deleteProduct(req.params.id as string, req.user);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.status(200).json(new ApiResponse(true, 'Product moved to recycle bin successfully', product));
});

export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.toggleFeatured(req.params.id as string);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        `Product ${product.featured ? 'featured' : 'unfeatured'} successfully`,
        product,
      ),
    );
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await ProductService.getDistinctCategories();
  res.setHeader(
    'Cache-Control',
    'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
  );
  res.status(200).json(new ApiResponse(true, 'Categories fetched successfully', categories));
});

export const aiAutofillProduct = asyncHandler(async (req: Request, res: Response) => {
  const { title, imageSrc, categoryList } = req.body;

  if (!process.env.GROQ_API_KEY) {
    throw new ApiError(
      400,
      'Groq API Key is not configured. Please add GROQ_API_KEY to your backend .env file.',
    );
  }

  if (!title && !imageSrc) {
    throw new ApiError(400, 'Please provide a title or image URL for analysis.');
  }

  let base64Image = '';
  let mimeType = 'image/jpeg';

  if (imageSrc) {
    try {
      if (imageSrc.startsWith('/')) {
        const absolutePath = path.resolve(process.cwd(), 'public', imageSrc.substring(1));
        if (fs.existsSync(absolutePath)) {
          const buffer = fs.readFileSync(absolutePath);
          base64Image = buffer.toString('base64');
          if (imageSrc.endsWith('.png')) mimeType = 'image/png';
          else if (imageSrc.endsWith('.webp')) mimeType = 'image/webp';
        }
      } else {
        // SSRF protection: validate URL is a proper HTTP(S) URL
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(imageSrc);
        } catch {
          throw new ApiError(400, 'Invalid image URL format');
        }
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new ApiError(400, 'Only HTTP/HTTPS image URLs are allowed');
        }
        // SSRF Protection: Resolve IP to prevent obfuscation (octal/hex) and block private ranges
        let address = '';
        try {
          const lookupResult = await dns.lookup(parsedUrl.hostname);
          address = lookupResult.address;
        } catch {
          throw new ApiError(400, 'Invalid or unresolvable hostname');
        }

        let checkIp = address;
        if (checkIp.includes(':') && checkIp.toLowerCase().startsWith('::ffff:')) {
          checkIp = checkIp.substring(7);
        }

        let isPrivate = false;
        if (checkIp === '::1' || checkIp.toLowerCase().startsWith('fe80:')) {
          isPrivate = true;
        } else {
          const parts = checkIp.split('.');
          if (parts.length === 4) {
            const [p1, p2] = [parseInt(parts[0], 10), parseInt(parts[1], 10)];
            if (
              p1 === 10 ||
              p1 === 127 ||
              p1 === 0 ||
              (p1 === 169 && p2 === 254) ||
              (p1 === 172 && p2 >= 16 && p2 <= 31) ||
              (p1 === 192 && p2 === 168)
            ) {
              isPrivate = true;
            }
          }
        }

        if (isPrivate || parsedUrl.hostname.toLowerCase().endsWith('.internal')) {
          throw new ApiError(400, 'Internal network URLs are not allowed');
        }

        // We checked the IP to prevent basic SSRF.
        // Node native fetch fails with ERR_TLS_CERT_ALTNAME_INVALID if we swap hostname for IP.
        const safeUrl = parsedUrl.toString();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(safeUrl, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // Validate content length (max 2MB)
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        if (contentLength > 2 * 1024 * 1024) {
          throw new ApiError(400, 'Image too large for AI analysis (max 2MB)');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64Image = buffer.toString('base64');

        const contentType = response.headers.get('content-type');
        if (contentType) mimeType = contentType;
      }
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      logger.error('Error fetching image for AI analysis:', err);
    }
  }

  const prompt = `
    You are an expert Indian handicraft catalog analyst for "Siri Arts & Crafts", a premium wedding and festive decor ecommerce platform.
    Your job is to analyze the uploaded product image carefully and extract ONLY accurate, clean, customer-friendly information.

    Please perform a rigorous 4-stage analysis:
    STAGE 1 — OBJECT DETECTION: Identify the exact object (e.g. coconut, tray, plate, basket, garland, welcome board, mandala, floral decor, pooja item).
    STAGE 2 — MATERIAL DETECTION: Detect specific craft materials used (e.g. silk thread, beads, pearls, stones, brass, fabric, wood, coconut shell).
    STAGE 3 — CULTURAL CONTEXT DETECTION: Determine cultural use cases (e.g. Hindu wedding, Telugu heritage, engagement, haldi, mehendi, pooja, return gift, housewarming, festival).
    STAGE 4 — CUSTOMER-FRIENDLY TITLE GENERATION: Generate a clean, elegant, human-readable title.

    Available Store Categories: ${JSON.stringify(categoryList || [])}

    CRITICAL RULES FOR CUSTOMER-FRIENDLY NAMING:
    1. THE ENGLISH TITLE MUST BE SHORT & CLEAN: Keep the "english_title" strictly within 2 to 5 words (e.g., "Lotus Gifting Crate", "Floral Ring Tray", "Traditional Garland Basket", "Royal Haldi Setup", "Coconut Welcome Decor", "Wedding Entrance Decor").
    2. AVOID FLUFF & ROBOTIC DESCRIPTORS: Absolutely DO NOT use words like "Luxurious", "Ultra Elegant", "Premium", "Grand", "Decorative", "Ceremony", "Ceremonial", "Presentation", "Special" in the title. Keep it extremely simple and readable for normal people.
    3. NO KEYWORD STUFFING: Do not repeat terms or stack a long list of attributes. A bad example is "Luxurious Premium Traditional Grand Decorative Engagement Ring Ceremony Presentation Tray". A good example is "Floral Ring Tray".
    4. CUSTOMER-FRIENDLY DESCRIPTION: Write a brief, simple, and elegant 2-sentence description. Use simple language that a normal customer instantly understands. Avoid robotic, overly technical, or repetitive jargon.
    5. CULTURAL ACCURACY: Intelligently understand traditional Indian wedding ceremonies (Telugu heritage, Tamil, Kannada, etc.) and generate accurate names for decorated coconuts, thambulam plates, welcome boards, and ring trays.
    6. Choose the most accurate, clean category from the list.
    7. Generate a clean Telugu translation in Telugu script (e.g., "తాంబూలం ప్లేట్", "కొబ్బరి డెకర్").
    8. Generate a clean, simple, short SEO-friendly slug.
    9. Suggest an estimated, realistic price in INR (e.g., 999, 1500, 2500) based on the intricacy and materials.
    10. Suggest 1 or 2 catchy storefront badges (e.g. "Bestseller", "Trending", "Limited Edition").

    Please output a clean JSON object matching the following structure strictly (do not include any markdown block ticks, just raw JSON):
    {
      "detected_object": "Exact detected object class name",
      "confidence": 95,
      "english_title": "Short, clean 2-5 word title (e.g. Floral Ring Tray)",
      "telugu_title": "Natural Telugu translated title in Telugu script",
      "slug": "simple-url-slug",
      "category": "Store category mapped",
      "subcategory": "Store subcategory mapped",
      "materials": ["Material 1", "Material 2"],
      "colors": ["Color 1", "Color 2"],
      "style": "Decoration style",
      "occasion": ["Occasion 1", "Occasion 2"],
      "tags": ["tag1", "tag2"],
      "badges": ["Bestseller", "Trending"],
      "price": 1500,
      "description": "Premium, clean 2-sentence description",
      "seo_keywords": ["keyword1", "keyword2"]
    }
  `;

  const messages: any[] = [];
  const userContent: any[] = [{ type: 'text', text: prompt }];

  if (base64Image) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64Image}`,
      },
    });
  }

  messages.push({
    role: 'user',
    content: userContent,
  });

  const groqController = new AbortController();
  const groqTimeout = setTimeout(() => groqController.abort(), 15000); // 15s timeout

  let groqResponse;
  try {
    groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: groqController.signal,
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages,
        response_format: {
          type: 'json_object',
        },
        temperature: 0.2,
      }),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError(504, 'Groq API timeout. The request took too long.');
    }
    throw new ApiError(500, 'Failed to connect to Groq AI API.');
  } finally {
    clearTimeout(groqTimeout);
  }

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    logger.error('Groq API Error:', errorText);
    throw new ApiError(500, 'Failed to generate product details from Groq AI API.');
  }

  const responseData: any = await groqResponse.json();
  const textResponse = responseData.choices?.[0]?.message?.content;

  if (!textResponse) {
    throw new ApiError(500, 'Invalid response received from Groq AI API.');
  }

  try {
    const parsedData = JSON.parse(textResponse.trim());
    res
      .status(200)
      .json(new ApiResponse(true, 'AI specifications generated successfully', parsedData));
  } catch (err) {
    logger.error('Failed to parse Groq JSON:', textResponse);
    throw new ApiError(500, 'AI response could not be parsed as clean JSON.');
  }
});

export const refineAiProduct = asyncHandler(async (req: Request, res: Response) => {
  const { previousResult, prompt: userPrompt } = req.body;

  if (!process.env.GROQ_API_KEY) {
    throw new ApiError(
      400,
      'Groq API Key is not configured. Please add GROQ_API_KEY to your backend .env file.',
    );
  }

  if (!previousResult || !userPrompt) {
    throw new ApiError(400, 'Please provide the previous AI result and a prompt.');
  }

  const prompt = `
    You are an expert Indian handicraft catalog analyst for "Siri Arts & Crafts".
    You previously generated the following product curation data:
    ${JSON.stringify(previousResult, null, 2)}
    
    The user wants to make the following modification:
    "${userPrompt}"
    
    Please output an UPDATED clean JSON object matching the EXACT same structure as the previous data, incorporating the user's requested changes.
    Output ONLY the raw JSON object, without any markdown formatting or ticks.
  `;

  const messages: any[] = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];

  const groqController = new AbortController();
  const groqTimeout = setTimeout(() => groqController.abort(), 15000); // 15s timeout

  let groqResponse;
  try {
    groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: groqController.signal,
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError(504, 'Groq API timeout. The request took too long.');
    }
    throw new ApiError(500, 'Failed to connect to Groq AI API.');
  } finally {
    clearTimeout(groqTimeout);
  }

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    logger.error('Groq API Error:', errorText);
    throw new ApiError(500, 'Failed to refine product details from Groq AI API.');
  }

  const responseData: any = await groqResponse.json();
  const textResponse = responseData.choices?.[0]?.message?.content;

  if (!textResponse) {
    throw new ApiError(500, 'Invalid response received from Groq AI API.');
  }

  try {
    const parsedData = JSON.parse(textResponse.trim());
    res
      .status(200)
      .json(new ApiResponse(true, 'AI specifications refined successfully', parsedData));
  } catch (err) {
    logger.error('Failed to parse Groq JSON:', textResponse);
    throw new ApiError(500, 'AI response could not be parsed as clean JSON.');
  }
});
