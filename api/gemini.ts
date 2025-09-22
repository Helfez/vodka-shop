import OpenAI from 'openai';

// Create an OpenAI API client, configured for Aimixhub
const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

interface RequestBody {
  prompt: string;
  modalities?: string[];
  size?: string;
  baseImage?: string;
  baseImages?: string[];
}

export async function POST(request: Request) {
  try {
    const { prompt, modalities = ["text", "image"], size, baseImage, baseImages = [] } = (await request.json()) as RequestBody;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 构建消息内容
    const messageContent: Array<
      | {
          type: 'image_url';
          image_url: { url: string };
        }
      | {
          type: 'text';
          text: string;
        }
    > = [];
    const normalizedImages = Array.isArray(baseImages)
      ? baseImages.slice(0, 3)
      : [];

    const imageReferences = normalizedImages.length
      ? normalizedImages
      : baseImage
        ? [baseImage]
        : [];
    
    // 如果有垫图，添加图片内容
    imageReferences.forEach((imageUrl: string) => {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    });
    
    // 添加文本提示
    let textPrompt = `Please create an image of: ${prompt}. Return only the image, no text description.`;
    if (size) {
      textPrompt += ` Image size should be ${size}.`;
    }
    if (imageReferences.length) {
      textPrompt += imageReferences.length > 1
        ? ` Use the provided images as references or bases for generation.`
        : ` Use the provided image as a reference or base for generation.`;
    }
    
    messageContent.push({
      type: 'text',
      text: textPrompt
    });

    // Call Gemini 2.5 Flash Image Preview for image generation
    const response = await openai.chat.completions.create({
      model: 'gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: imageReferences.length ? messageContent : textPrompt,
        }
      ],
      modalities: modalities,
      temperature: 0.7,
      max_tokens: 1024,
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
