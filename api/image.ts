import OpenAI from 'openai';
import type { OpenAI as OpenAIClient } from 'openai';

// Image generation endpoint powered by Aimixhub image-one
// POST /api/image  { prompt: string }
// Returns: { imageUrl: string }

const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

interface ImageRequestBody {
  prompt: string;
}

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as ImageRequestBody;
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await openai.images.generate({
      model: 'image-one',
      prompt,
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = result.data?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL returned');

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in Image API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
