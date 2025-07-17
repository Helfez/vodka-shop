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

    // Persist generated image to Cloudinary directly (more reliable than internal fetch)
    try {
      // Lazy import to avoid unused dep in edge if not configured
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const cldRes: any = await cloudinary.uploader.upload(outputUrl, {
        folder: 'vodkaShop/generated',
        overwrite: false,
      });
      return new Response(JSON.stringify({ imageUrl: cldRes.secure_url }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.warn('Cloudinary persist failed, fallback to original url', e);
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
