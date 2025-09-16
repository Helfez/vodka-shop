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
}

export async function POST(request: Request) {
  try {
    const { prompt, modalities = ["text", "image"], size, baseImage } = (await request.json()) as RequestBody;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 构建消息内容
    let messageContent: any = [];
    
    // 如果有垫图，添加图片内容
    if (baseImage) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: baseImage }
      });
    }
    
    // 添加文本提示
    let textPrompt = `Please create an image of: ${prompt}. Return only the image, no text description.`;
    if (size) {
      textPrompt += ` Image size should be ${size}.`;
    }
    if (baseImage) {
      textPrompt += ` Use the provided image as a reference or base for generation.`;
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
          content: baseImage ? messageContent : textPrompt,
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
