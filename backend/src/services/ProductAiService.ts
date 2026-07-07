import fs from 'fs';
import dns from 'dns/promises';
import path from 'path';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import mongoose from 'mongoose';
export class ProductAiService {
  /**
   * AI Autofill Product - Extract object, materials, and generate customer-friendly details
   */
  static async analyzeProductImage(
    title: string | undefined,
    imageSrc: string | undefined,
    categoryList: any,
  ) {
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
        if (imageSrc.startsWith('data:image/')) {
          const parts = imageSrc.split(';');
          mimeType = parts[0].split(':')[1];
          base64Image = parts[1].split(',')[1];
        } else if (imageSrc.startsWith('/')) {
          const absolutePath = path.resolve(process.cwd(), 'public', imageSrc.substring(1));
          if (fs.existsSync(absolutePath)) {
            const buffer = fs.readFileSync(absolutePath);
            base64Image = buffer.toString('base64');
            if (imageSrc.endsWith('.png')) mimeType = 'image/png';
            else if (imageSrc.endsWith('.webp')) mimeType = 'image/webp';
          }
        } else {
          // SSRF protection
          let parsedUrl: URL;
          try {
            parsedUrl = new URL(imageSrc);
          } catch {
            throw new ApiError(400, 'Invalid image URL format');
          }
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new ApiError(400, 'Only HTTP/HTTPS image URLs are allowed');
          }

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

          const safeUrl = parsedUrl.toString();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(safeUrl, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

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
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        logger.error('Error fetching image for AI analysis:', err);
      }
    }

    const prompt = `
      You are an expert Indian handicraft catalog analyst for "Siri Arts & Crafts", a premium wedding and festive decor ecommerce platform.
      Your job is to analyze the uploaded product image carefully and extract ONLY accurate, clean, customer-friendly information.

      ${title ? `The admin has provided the title: "${title}"` : ''}

      Please perform a rigorous 7-stage analysis:
      STAGE 1 — OBJECT DETECTION: Identify the exact object (e.g. coconut, tray, plate, basket, garland, welcome board, floral decor, pooja item, chocolate gift cones, dry fruit hamper, flower basket, gift box).
      STAGE 2 — MATERIAL DETECTION: Detect specific craft materials used (e.g. silk thread, beads, pearls, stones, brass, fabric, wood, coconut shell, chocolate, dry fruits, flowers).
      STAGE 3 — CULTURAL CONTEXT DETECTION: Determine cultural use cases (e.g. Hindu wedding, Telugu heritage, engagement, haldi, mehendi, pooja, return gift, housewarming, festival, birthday, corporate event).
      STAGE 4 — CUSTOMER-FRIENDLY TITLE GENERATION: Generate a clean, elegant, human-readable title.
      STAGE 5 — PERSONALIZATION ANALYSIS: Determine if this product supports customer personalization (names, messages, colors, themes). If yes, generate specific personalization instructions.
      STAGE 6 — CUSTOMER NOTE GENERATION: Generate professional, product-specific important notes for customers (handling instructions, variations disclaimer, storage tips, ideal occasions).
      STAGE 7 — QUANTITY ESTIMATION: Using the image, title, description, and price, estimate the quantity of items visible (e.g. number of cones, pieces, packs, trays, baskets). Use "approximately" when estimating.

      Available Store Categories: ${JSON.stringify(categoryList || [])}

      CRITICAL RULES FOR CUSTOMER-FRIENDLY NAMING:
      1. THE ENGLISH TITLE MUST BE SHORT & CLEAN: Keep the "english_title" strictly within 2 to 5 words (e.g., "Lotus Gifting Crate", "Floral Ring Tray", "Traditional Garland Basket", "Royal Haldi Setup", "Coconut Welcome Decor", "Wedding Entrance Decor").
      2. AVOID FLUFF & ROBOTIC DESCRIPTORS: Absolutely DO NOT use words like "Luxurious", "Ultra Elegant", "Premium", "Grand", "Decorative", "Ceremony", "Ceremonial", "Presentation", "Special" in the title. Keep it extremely simple and readable for normal people.
      3. NO KEYWORD STUFFING: Do not repeat terms or stack a long list of attributes. A bad example is "Luxurious Premium Traditional Grand Decorative Engagement Ring Ceremony Presentation Tray". A good example is "Floral Ring Tray".
      4. CUSTOMER-FRIENDLY DESCRIPTION: Write a brief, simple, and elegant 2-sentence description. Use simple language that a normal customer instantly understands. Avoid robotic, overly technical, or repetitive jargon.
      5. CULTURAL ACCURACY: Intelligently understand traditional Indian wedding ceremonies (Telugu heritage, Tamil, Kannada, etc.) and generate accurate names for decorated coconuts, thambulam plates, welcome boards, and ring trays.
      6. CATEGORY MATCHING (MULTI-CATEGORY): Determine the single best 'primary_category' from the Available Store Categories. Then suggest 1 to 5 relevant 'secondary_categories'. If the exact name doesn't exist, suggest a logical new category name.
      7. Generate a clean Telugu translation in Telugu script (e.g., "తాంబూలం ప్లేట్", "కొబ్బరి డెకర్").
      8. Generate a clean, simple, short SEO-friendly slug.
      9. Suggest an estimated, realistic price in INR (e.g., 999, 1500, 2500) based on the intricacy and materials.
      10. Suggest 1 or 2 catchy storefront badges (e.g. "Bestseller", "Trending", "Limited Edition").
      11. CUSTOMIZATION DETECTION: Intelligently determine if this specific item is commonly personalized with text/names by customers (e.g. welcome boards, ring trays, named coconuts). If yes, set "isCustomizable" to true and provide a "customizationNote" prompt for the customer (e.g., "Enter names to be printed").
      12. CONFIDENCE SCORES: Output an accurate "confidence" integer (between 1 and 100) representing your certainty about the detected object class. ALSO output "category_confidence" object mapping the primary/secondary categories to confidence percentages (1-100).
      13. TELUGU SEARCH ALIASES & KEYWORDS:
          - "telugu_keywords": Generate 3 to 5 transliterated Telugu search terms (written in English script) that local customers would use (e.g., ["kobbari", "kobbari bondam", "kobbari bondalu"] for a decorated coconut; ["pasupu", "kumkuma", "thambulam"] for a pooja/gifting plate).
          - "event_associations": String array mapping this product to specific events where it is used (e.g., ["Wedding", "Housewarming", "Pooja", "BabyShower"]).
          - "search_aliases": Array of alternate names/synonyms users might search for in English or Hindi (e.g., ["nariyal decor", "wedding coconut", "decorated shadi nariyal"]).

      14. PERSONALIZATION CONFIG: Analyze the product type and generate context-aware personalization instructions.
          - "personalization_enabled": boolean — true ONLY if the product genuinely supports customization (e.g. hampers with messages, welcome boards with names, gift boxes with themes). Set false for simple decor items.
          - "personalization_label": A short label for the personalization input (e.g. "Customization Details", "Gift Message", "Bride & Groom Names").
          - "personalization_placeholder": A specific, multi-line placeholder with bullet-pointed instructions. Examples:
            For a Dry Fruit Hamper: "• Mention preferred dry fruit varieties (Cashew, Almond, Pistachio, Raisins, Dates)\n• Mention any allergy concerns\n• Enter your custom gift message for the recipient\n• Mention ribbon color or theme preference"
            For a Chocolate Bouquet: "• Mention preferred chocolate brands or flavors\n• Add recipient's name for a personalized tag\n• Mention preferred wrapping color"
            For a Wedding Return Gift: "• Enter bride & groom names\n• Wedding date\n• Function name (e.g. Reception, Haldi)\n• Preferred color theme"
            For a Flower Basket: "• Mention preferred flower colors\n• Fresh or artificial flowers preferred?\n• Enter your gift message"
          - "personalization_helper": A short helper text for the admin (e.g. "Customers can customize this for their event").

      15. CUSTOMER NOTE: Generate a professional, product-specific multi-line note that will be displayed on the storefront.
          - "customer_note": A multi-line string with bullet points using "• " prefix. This note should contain ONLY relevant, accurate information. Never generate generic placeholder text.
            Examples:
            For a Dry Fruit Gift Basket (₹3499): "• Contains approximately 30 premium assorted dry fruit cones\n• Dry fruit varieties may vary slightly based on seasonal availability while maintaining the same premium quality\n• Decorative accessories shown are for presentation purposes and may vary\n• Ideal for weddings, housewarming ceremonies, festive gifting, and corporate events"
            For a Chocolate Gift Hamper (₹1799): "• Includes approximately 20 handcrafted chocolate gift cones\n• Chocolates are packed hygienically and carefully to maintain freshness\n• Store in a cool and dry place\n• Decorative flowers and accessories may vary depending on availability"
            For a Brass Product: "• Handcrafted by skilled artisans\n• Minor color and finish variations are natural characteristics of handmade products"
            For a Rental Product: "• Rental duration and security deposit apply\n• Product must be returned in its original condition"

      16. QUANTITY ESTIMATION: Analyze the image, title, and price to estimate the number of individual items.
          - "estimated_quantity": An integer estimate of the number of items visible/included (e.g. number of cones, chocolates, baskets, trays). Use the price as a guide: ₹299→~5 cones, ₹899→~10, ₹1799→~20, ₹3499→~30.
          - "estimated_quantity_unit": The unit of measurement (e.g. "Chocolate Cones", "Dry Fruit Packs", "Gift Baskets", "Decorative Items", "Pieces").
          - If you cannot determine the quantity, set estimated_quantity to 1 and estimated_quantity_unit to "Set".

      17. VARIANTS GENERATION: Suggest realistic product variations (e.g., Size, Color, Material) if applicable.
          - "suggested_variants": An array of objects with "name" (Attribute like 'Size' or 'Color'), "value" (Specific choice like 'Large' or 'Red'), and "price" (Price adjustment relative to base price, e.g. 0, 100, -50).

      Please output a clean JSON object matching the following structure strictly (do not include any markdown block ticks, just raw JSON):
      {
        "detected_object": "Exact detected object class name",
        "confidence": 88,
        "english_title": "Short, clean 2-5 word title (e.g. Floral Ring Tray)",
        "telugu_title": "Natural Telugu translated title in Telugu script",
        "slug": "simple-url-slug",
        "primary_category": "Main Category Name",
        "secondary_categories": ["Related Category 1", "Related Category 2"],
        "category_confidence": {
          "Main Category Name": 98,
          "Related Category 1": 85
        },
        "materials": ["Material 1", "Material 2"],
        "colors": ["Color 1", "Color 2"],
        "style": "Decoration style",
        "occasion": ["Occasion 1", "Occasion 2"],
        "tags": ["tag1", "tag2"],
        "badges": ["Bestseller", "Trending"],
        "price": 1500,
        "description": "Premium, clean 2-sentence description",
        "seo_keywords": ["keyword1", "keyword2"],
        "isCustomizable": true,
        "customizationNote": "Enter names to be printed",
        "telugu_keywords": ["transliterated_telugu_1", "transliterated_telugu_2"],
        "event_associations": ["Wedding", "Pooja"],
        "search_aliases": ["alias1", "alias2"],
        "personalization_enabled": true,
        "personalization_label": "Customization Details",
        "personalization_placeholder": "• Specific instruction 1\n• Specific instruction 2\n• Specific instruction 3",
        "personalization_helper": "Customers can customize this gift for their event",
        "customer_note": "• Product-specific note line 1\n• Product-specific note line 2\n• Product-specific note line 3",
        "estimated_quantity": 20,
        "estimated_quantity_unit": "Chocolate Cones",
        "suggested_variants": [
          { "name": "Size", "value": "Standard", "price": 0 },
          { "name": "Size", "value": "Large", "price": 200 }
        ]
      }
    `;

    const messages: Record<string, unknown>[] = [];
    const userContent: Record<string, unknown>[] = [{ type: 'text', text: prompt }];

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
    const groqTimeout = setTimeout(() => groqController.abort(), 15000);

    const modelsToTry = base64Image ? [
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'qwen/qwen3.6-27b'
    ] : [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];

    let groqResponse;
    let lastErrorText = '';

    try {
      for (const model of modelsToTry) {
        groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: groqController.signal,
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
          }),
        });

        if (groqResponse.ok) {
          break; // Successfully got a response!
        } else {
          lastErrorText = await groqResponse.text();
          logger.warn(`Groq Vision Model ${model} failed:`, lastErrorText);
          // If it's a 429 Too Many Requests, break out since it's a rate limit, not a model issue
          if (groqResponse.status === 429) {
             break;
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(504, 'Groq API timeout. The request took too long.');
      }
      logger.error('Groq fetch error:', error);
      throw new ApiError(500, 'Failed to connect to Groq AI API.');
    } finally {
      clearTimeout(groqTimeout);
    }

    if (!groqResponse || !groqResponse.ok) {
      logger.error('Groq API Error:', lastErrorText);
      throw new ApiError(500, 'Failed to generate product details from Groq AI API.');
    }

    const responseData = (await groqResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const textResponse = responseData.choices?.[0]?.message?.content;

    if (!textResponse) {
      throw new ApiError(500, 'Invalid response received from Groq AI API.');
    }

    try {
      const extractedJson = textResponse.match(/\{[\s\S]*\}/);
      if (!extractedJson) throw new Error('No JSON object found in response');
      const parsedData = JSON.parse(extractedJson[0]);

      // Ensure uniqueness against DB for title and slug across both Product and Showcase
      const ProductModel = mongoose.model('Product');
      const ShowcaseModel = mongoose.model('ShowcaseCollection');
      const baseSlug = parsedData.slug;
      const baseTitle = parsedData.english_title;

      let isUnique = false;
      let counter = 1;
      let currentSlug = baseSlug;
      let currentTitle = baseTitle;

      while (!isUnique) {
        // Check if either slug or title already exists in the database
        const existingProduct = await ProductModel.exists({
          $or: [{ slug: currentSlug }, { title: currentTitle }],
        });

        const existingShowcase = await ShowcaseModel.exists({ title: currentTitle });

        if (existingProduct || existingShowcase) {
          // If exists, append a counter to make it unique
          currentSlug = `${baseSlug}-${counter}`;
          currentTitle = `${baseTitle} ${counter}`;
          counter++;
        } else {
          isUnique = true;
        }
      }

      parsedData.slug = currentSlug;
      parsedData.english_title = currentTitle;

      return parsedData;
    } catch (err) {
      logger.error('Failed to parse Groq JSON:', textResponse, err);
      throw new ApiError(500, 'AI response could not be parsed as clean JSON.');
    }
  }

  /**
   * Refine AI Product result based on user prompt
   */
  static async refineAiProduct(previousResult: any, userPrompt: string) {
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

    const messages: Record<string, unknown>[] = [
      { role: 'user', content: [{ type: 'text', text: prompt }] },
    ];

    const groqController = new AbortController();
    const groqTimeout = setTimeout(() => groqController.abort(), 15000);

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
          model: 'llama-3.3-70b-versatile',
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
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

    const responseData = (await groqResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const textResponse = responseData.choices?.[0]?.message?.content;

    if (!textResponse) {
      throw new ApiError(500, 'Invalid response received from Groq AI API.');
    }

    try {
      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleanJson);
    } catch {
      logger.error('Failed to parse Groq JSON:', textResponse);
      throw new ApiError(500, 'AI response could not be parsed as clean JSON.');
    }
  }
}
