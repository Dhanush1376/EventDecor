import { Request, Response } from 'express';
import CMSService from '../../services/cmsService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';

export const getContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await CMSService.getContent(req.params.key as string);
  res.status(200).json(new ApiResponse(true, 'Content fetched', content));
});

export const updateContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await CMSService.updateContent(req.params.key as string, req.body, req.user!.id);
  res.status(200).json(new ApiResponse(true, 'Content updated', content));
});

export const getAllSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = await CMSService.getAllSections();
  res.status(200).json(new ApiResponse(true, 'All sections', sections));
});

export const aiGenerateContent = asyncHandler(async (req: Request, res: Response) => {
  const { text, style } = req.body;

  if (!text || !style) {
    throw new ApiError(400, 'Both text and style are required');
  }

  const stylePrompts: Record<string, string> = {
    heritage: `Rewrite the following text in a rich South Indian heritage and cultural artisan style for a premium Telugu wedding decor ecommerce brand called "Siri Arts & Crafts". Maintain elegance and authenticity. Keep it concise (1-2 sentences max).`,
    luxury: `Rewrite the following text in an ultra-premium luxury brand copywriting style. Think Cartier/Hermès level elegance. Keep it concise (1-2 sentences max).`,
    traditional: `Rewrite the following text with authentic Telugu traditional and ceremonial cultural context. Reference real Telugu customs and festivals where relevant. Keep it concise (1-2 sentences max).`,
    seo: `Rewrite the following text as an SEO-optimized snippet for an Ongole-based Indian wedding decorations ecommerce store. Include relevant local keywords naturally. Keep it concise (1-2 sentences max).`,
    translate: `Translate the following English text into natural, fluent Telugu script (తెలుగు). Only output the Telugu translation, nothing else.`,
  };

  const systemPrompt = stylePrompts[style];
  if (!systemPrompt) {
    throw new ApiError(400, 'Invalid style. Choose: heritage, luxury, traditional, seo, translate');
  }

  if (!process.env.GROQ_API_KEY) {
    // Graceful fallback when API key isn't configured
    throw new ApiError(400, 'AI content generation requires GROQ_API_KEY in backend .env file.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Original text: "${text}"` },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!groqResponse.ok) {
      throw new ApiError(500, 'AI service temporarily unavailable');
    }

    const data: any = await groqResponse.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new ApiError(500, 'Content generation returned no results');
    }

    res
      .status(200)
      .json(new ApiResponse(true, 'AI content generated', { text: generatedText, style }));
  } catch (err: any) {
    clearTimeout(timeout);
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'AI content generation failed');
  }
});
