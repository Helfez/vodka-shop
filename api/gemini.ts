import OpenAI from 'openai';

// Create an OpenAI API client, configured for Aimixhub
const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

interface RequestBody {
  prompt: string;
  modalities?: string[];
}

export async function POST(request: Request) {
  try {
    const { prompt, modalities = ["text", "image"] } = (await request.json()) as RequestBody;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Gemini 2.5 Flash Image Preview for image generation
    const response = await openai.chat.completions.create({
      model: 'gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      modalities: modalities,
      temperature: 0.7,
    } as any);

    // Return the response
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Gemini API:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
