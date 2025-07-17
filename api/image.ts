import OpenAI from 'openai';

// Image generation endpoint powered by Aimixhub image-one
// POST /api/image  { prompt: string }
// Returns: { imageUrl: string }

const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

interface ImageRequestBody {
  prompt: string;
  srcImageUrl?: string; // optional for edit mode
  mode?: 'generate' | 'edit';
}

export async function POST(request: Request) {
  try {
    const { prompt, srcImageUrl, mode = 'generate' } = (await request.json()) as ImageRequestBody;
    // Log the prompt for debugging/traceability
    console.log('[IMAGE] GPT image prompt:', prompt);
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let result: any;
    if (mode === 'edit') {
      if (!srcImageUrl) {
        return new Response(JSON.stringify({ error: 'srcImageUrl required for edit mode' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
            result = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        image_url: srcImageUrl,
      } as any);
    } else {
      result = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
      });
    }

    let outputUrl = result.data?.[0]?.url as string | undefined;
    if (!outputUrl) {
      const b64 = (result.data?.[0] as any)?.b64_json;
      if (b64) {
        outputUrl = `data:image/png;base64,${b64}`;
      }
    }

    if (!outputUrl) {
      console.error('Aimixhub image generate response:', JSON.stringify(result));
      const firstErr = (result as any).error?.message || 'No image returned';
      throw new Error(firstErr);
    }

    // Persist generated image to Cloudinary so it is reliably hosted
    try {
      const uploadRes = await fetch(`${new URL(request.url).origin}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: outputUrl }),
      });
      const { url: storedUrl } = await uploadRes.json();
      return new Response(JSON.stringify({ imageUrl: storedUrl || outputUrl }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.warn('Failed to persist image to Cloudinary, returning original url', e);
      return new Response(JSON.stringify({ imageUrl: outputUrl }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in Image API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
