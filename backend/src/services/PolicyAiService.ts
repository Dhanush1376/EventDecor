import StoreSettings from '../models/StoreSettings';
import ApiError from '../utils/ApiError';

export class PolicyAiService {
  /**
   * Generates a policy based on the given topic and the current StoreSettings.
   * Uses Groq API with Llama 3 for fast, highly structured generation.
   */
  static async generatePolicy(topic: string, existingPolicy?: any) {
    if (!process.env.GROQ_API_KEY) {
      throw new ApiError(
        400,
        'Groq API Key is not configured. Please add GROQ_API_KEY to your backend .env file.',
      );
    }

    if (!topic || topic.trim() === '') {
      throw new ApiError(400, 'Please provide a policy topic or instruction.');
    }

    // Fetch store settings to inject business context
    const settings = await StoreSettings.findOne();
    if (!settings) {
      throw new ApiError(500, 'Store settings not found. Please configure settings first.');
    }

    // Construct the context string
    const storeContext = `
      STORE GENERAL INFO:
      Name: ${settings.general.storeName}
      Contact Email: ${settings.contact.email}
      Contact Phone: ${settings.contact.phone}
      Address: ${settings.contact.address}

      SHIPPING CONFIGURATION:
      Free Shipping Threshold: ₹${settings.shipping.freeShippingThreshold}
      Delivery Charge: ₹${settings.shipping.deliveryCharge}
      Express Delivery Charge: ₹${settings.shipping.expressDeliveryCharge}
      Estimated Delivery Days: ${settings.shipping.estimatedDeliveryDays}

      PAYMENTS:
      COD Enabled: ${settings.payments.enableCOD} (Fee: ₹${settings.payments.codFee})
      Wallet Enabled: ${settings.payments.enableWallet}

      RETURNS & CANCELLATIONS:
      Returns Enabled: ${settings.returnsExchanges.enableReturns}
      Return Window (Days): ${settings.returnsExchanges.returnWindowDays}
      Exchanges Enabled: ${settings.returnsExchanges.enableExchanges}
      Cancellation Allowed: ${settings.cancellation.allowCancellation}
      Cancellation Window (Hours): ${settings.cancellation.cancellationWindowHours}
      Refund Timeline: ${settings.cancellation.refundTimeline}
    `;

    const isEdit = existingPolicy && existingPolicy.title;

    let prompt: string;
    if (isEdit) {
      prompt = `
      You are an expert legal policy editor for an e-commerce platform.
      Here are the current store settings:
      ${storeContext}

      Here is the EXISTING policy you are editing:
      Title: ${existingPolicy.title}
      Current Content JSON: ${existingPolicy.content}

      The user has requested the following changes or additions:
      "${topic}"

      RULES:
      1. Apply the user's requested changes to the existing policy.
      2. Keep the existing policy structure intact unless the user asks to rewrite it.
      3. Use actual values from the store settings if the user asks to include new rules (e.g. if they ask to add the return window, use the value from settings).
      4. Write in a clear, professional, customer-friendly tone.
      `;
    } else {
      prompt = `
      You are an expert legal policy writer for an e-commerce platform.
      Generate a professional, structured "${topic}" for the store based strictly on the following actual store settings:

      ${storeContext}

      RULES:
      1. Use the actual values provided in the settings (e.g. mention the exact refund timeline, shipping costs, and return windows).
      2. If a setting is disabled (e.g. Returns Enabled: false), clearly state that returns are not accepted.
      3. Organize the policy into clear sections (headings and paragraphs).
      4. Write in a clear, professional, customer-friendly tone.
      `;
    }

    prompt += `
      OUTPUT FORMAT:
      Output a clean JSON object matching the following structure strictly (do not include any markdown block ticks or markdown code blocks like \`\`\`json, just output raw JSON text starting with { and ending with }):
      {
        "title": "Generated title (e.g. Shipping Policy)",
        "slug": "url-friendly-slug",
        "seoMetadata": {
          "title": "SEO Title",
          "description": "Short SEO description"
        },
        "content": [
          {
            "heading": "Section 1 Heading",
            "paragraph": "Section 1 Paragraph..."
          },
          {
            "heading": "Section 2 Heading",
            "paragraph": "Section 2 Paragraph..."
          }
        ]
      }
    `;

    const messages = [
      {
        role: 'system',
        content: 'You are an API that strictly outputs raw valid JSON without markdown wrapping.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let groqResponse;
    try {
      groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new ApiError(504, 'Groq API request timed out');
      }
      throw new ApiError(500, 'Failed to connect to Groq API');
    }

    if (!groqResponse.ok) {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const errText = await groqResponse.text();
      // Error logged intentionally omitted for linting
      throw new ApiError(groqResponse.status, 'Error from Groq API');
    }

    const data = (await groqResponse.json()) as any;
    let textContent = data.choices[0]?.message?.content || '';

    // Strip markdown formatting if the LLM ignored instructions
    textContent = textContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '')
      .trim();

    try {
      const parsed = JSON.parse(textContent);
      return parsed;
    } catch (_err) {
      throw new ApiError(500, 'AI generated invalid JSON. Please try again.');
    }
  }
}
