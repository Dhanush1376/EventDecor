import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import Category from '../../models/Category';
import logger from '../../config/logger';

export const analyzeShowcaseImage = asyncHandler(async (req: Request, res: Response) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    throw new ApiError(400, 'Image URL is required for AI Vision analysis');
  }

  if (!process.env.GROQ_API_KEY) {
    throw new ApiError(400, 'AI content generation requires GROQ_API_KEY in backend .env file.');
  }

  const systemPrompt = `You are an expert luxury event and wedding decorator for "Siri Arts & Crafts". 
Analyze the provided image of an event decor setup (like a mandap, ring tray, or stage) and output ONLY a valid, raw JSON object (without markdown code blocks) representing the setup.
The JSON must have the following keys:
- "title": A luxurious, catchy title (e.g. "Lotus Gifting Crate").
- "subtitle": Descriptive context (e.g. "Carved coconuts with jasmine garlands").
- "category": A suggested theme/category name (e.g. "South Indian Wedding", "Engagement Gifts", "Telugu Heritage"). Use Title Case.
- "description": A beautiful, atmospheric narrative description (2-3 sentences).
- "inclusionsText": Comma-separated list of items and props seen in the image.
- "colorPalette": Comma-separated list of hex codes or color names (e.g. "#8B0000, #FFD700").
- "suggestedProps": Comma-separated list of styling props.
- "setupTimeHours": Integer representing estimated setup time in hours (e.g. 2).
- "rentalPrice": Integer representing the estimated fair market rental price in rupees (e.g. 15000).
- "strikingPrice": Integer representing a higher original MRP or striking price to show a discount (e.g. 20000). Optional.
- "seoTitle": SEO optimized title (max 60 chars).
- "seoDescription": SEO optimized description (max 150 chars).

Do NOT include any extra text before or after the JSON.`;

  let timeout: NodeJS.Timeout | undefined;

  try {
    let base64Image = '';
    let mimeType = 'image/jpeg';

    if (imageUrl.startsWith('data:image')) {
      base64Image = imageUrl.split(',')[1];
      mimeType = imageUrl.split(';')[0].split(':')[1];
    } else {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new ApiError(400, 'Could not fetch image from the provided URL');
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Image = buffer.toString('base64');
      const contentType = imgRes.headers.get('content-type');
      if (contentType) mimeType = contentType;
    }

    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout for vision model

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!groqResponse.ok) {
      const errData = await groqResponse.json().catch(() => ({}));
      logger.error('Groq API Error: ' + JSON.stringify(errData));
      throw new ApiError(500, 'AI Vision service temporarily unavailable');
    }

    const data: any = await groqResponse.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new ApiError(500, 'Vision analysis returned no results');
    }

    let parsedPayload;
    try {
      const extractedJson = generatedText.match(/\{[\s\S]*\}/);
      if (!extractedJson) throw new Error('No JSON object found in response');
      parsedPayload = JSON.parse(extractedJson[0]);

      const baseTitle = parsedPayload.title;
      parsedPayload.title = baseTitle;
    } catch (e) {
      logger.error('Failed to parse Groq response or check uniqueness: ' + String(e));
      logger.error('Actual Groq Text: ' + generatedText);
      throw new ApiError(500, 'AI returned malformed JSON or DB error');
    }

    // Category handling
    const suggestedCategoryName = parsedPayload.category || 'Special Events';
    const suggestedSlug = suggestedCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let categoryDoc = await Category.findOne({
      $or: [
        { slug: suggestedSlug, type: 'event' },
        { name: new RegExp(`^${suggestedCategoryName}$`, 'i'), type: 'event' },
      ],
    });

    let categoryCreated = false;

    if (!categoryDoc) {
      categoryDoc = await Category.create({
        name: suggestedCategoryName,
        slug: suggestedSlug,
        type: 'event',
        description: `Autogenerated category for ${suggestedCategoryName}`,
        isActive: true,
        displayOrder: 99,
      });
      categoryCreated = true;
    }

    res.status(200).json(
      new ApiResponse(true, 'AI Vision analysis complete', {
        payload: parsedPayload,
        category: {
          id: categoryDoc._id,
          name: categoryDoc.name,
          slug: categoryDoc.slug,
          isNew: categoryCreated,
        },
      }),
    );
  } catch (err: any) {
    if (timeout) clearTimeout(timeout);
    if (err instanceof ApiError) throw err;
    logger.error('AI Vision Error: ', err);
    throw new ApiError(500, 'AI Vision content generation failed');
  }
});

export const refineShowcaseImage = asyncHandler(async (req: Request, res: Response) => {
  const { previousData, prompt } = req.body;

  if (!previousData || !prompt) {
    throw new ApiError(400, 'Previous data and prompt are required');
  }

  if (!process.env.GROQ_API_KEY) {
    throw new ApiError(400, 'AI content generation requires GROQ_API_KEY in backend .env file.');
  }

  const systemPrompt = `You are an expert luxury event and wedding decorator for "Siri Arts & Crafts". 
You previously generated the following JSON data for an event showcase:
${JSON.stringify(previousData)}

The user has given you the following feedback/instructions to refine it:
"${prompt}"

Output ONLY a valid, raw JSON object (without markdown code blocks) representing the updated setup. Maintain the exact same JSON schema: title, subtitle, category, description, inclusionsText, colorPalette, suggestedProps, setupTimeHours, rentalPrice, strikingPrice, seoTitle, seoDescription. Do NOT include any extra text before or after the JSON.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!groqResponse.ok) {
      const errData = await groqResponse.json().catch(() => ({}));
      logger.error('Groq API Error in Refine: ' + JSON.stringify(errData));
      throw new ApiError(500, 'AI service temporarily unavailable');
    }

    const data: any = await groqResponse.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new ApiError(500, 'Vision analysis returned no results');
    }

    let parsedPayload;
    try {
      const extractedJson = generatedText.match(/\{[\s\S]*\}/);
      if (!extractedJson) throw new Error('No JSON object found in response');
      parsedPayload = JSON.parse(extractedJson[0]);
    } catch {
      throw new ApiError(500, 'AI returned malformed JSON');
    }

    // Handle category creation
    const suggestedCategoryName = parsedPayload.category || 'Special Events';
    const suggestedSlug = suggestedCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let categoryDoc = await Category.findOne({
      $or: [
        { slug: suggestedSlug, type: 'event' },
        { name: new RegExp(`^${suggestedCategoryName}$`, 'i'), type: 'event' },
      ],
    });

    let categoryCreated = false;

    if (!categoryDoc) {
      categoryDoc = await Category.create({
        name: suggestedCategoryName,
        slug: suggestedSlug,
        type: 'event',
        description: `Autogenerated category for ${suggestedCategoryName}`,
        isActive: true,
        displayOrder: 99,
      });
      categoryCreated = true;
    }

    res.status(200).json(
      new ApiResponse(true, 'AI Refinement complete', {
        payload: parsedPayload,
        category: {
          id: categoryDoc._id,
          name: categoryDoc.name,
          slug: categoryDoc.slug,
          isNew: categoryCreated,
        },
      }),
    );
  } catch (err: any) {
    clearTimeout(timeout);
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'AI Refinement failed');
  }
});
