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

// 异步上传到 Cloudinary 的辅助函数
async function uploadToCloudinaryAsync(imageUrl: string): Promise<string | null> {
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const cldRes: any = await cloudinary.uploader.upload(imageUrl, {
      folder: 'vodkaShop/generated',
      overwrite: false,
    });
    console.log('[IMAGE] Background upload to Cloudinary successful:', cldRes.secure_url);
    return cldRes.secure_url;
  } catch (error) {
    console.error('[IMAGE] Background Cloudinary upload failed:', error);
    return null;
  }
}

// 重试机制辅助函数
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 指数退避延迟
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[IMAGE] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
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
    
    // 使用重试机制调用图像生成 API
    result = await retryWithBackoff(async () => {
      if (mode === 'edit') {
        if (!srcImageUrl) {
          throw new Error('srcImageUrl required for edit mode');
        }
        return await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '768x768', // 优化分辨率提升速度
          image_url: srcImageUrl,
        } as any);
      } else {
        return await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '768x768', // 优化分辨率提升速度
        });
      }
    });

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

    // 立即返回生成的图片，后台异步上传到 Cloudinary
    const response = new Response(JSON.stringify({ imageUrl: outputUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });

    // 异步上传到 Cloudinary（不阻塞响应）
    uploadToCloudinaryAsync(outputUrl).catch((e: any) => {
      console.warn('Background Cloudinary upload failed:', e);
    });

    return response;
  } catch (error) {
    console.error('Error in Image API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
