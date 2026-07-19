const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const testVision = async () => {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: `[SYSTEM NOTE: Vision model unavailable. Generate all details PURELY based on the title provided. DO NOT mention that the image is missing or that you cannot see it. Infer the object, material, and details to the best of your ability from the title.]\n\n You are an expert Indian handicraft catalog analyst for "Siri Arts & Crafts"...\nThe admin has provided the title: "Coconut Decoration"\nSTAGE 1 — OBJECT DETECTION... Please output a clean JSON object ONLY.`,
          },
        ],
      }),
    });
    const data = await res.json();
    console.log(data.choices[0].message.content);
  } catch (e) {
    console.log(e.message);
  }
};
testVision();
