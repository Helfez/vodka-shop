import OpenAI from 'openai';

// Create an OpenAI API client, configured for Aimixhub
const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

interface RequestBody {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image?: string;
  }>;
  imageUrl?: string;
  prompt?: string;
}

export async function POST(request: Request) {
  try {
    const { messages, imageUrl, prompt } = (await request.json()) as RequestBody;

    // System prompt for Gemini vision analysis
    const systemPrompt = {
      role: 'system' as const,
      content: `You are a professional image analysis assistant powered by Gemini 2.5 Flash. Your task is to analyze uploaded images with high accuracy and provide detailed, structured descriptions.

When analyzing images, focus on:
- Overall composition and layout
- Objects, people, animals, and their relationships
- Colors, lighting, and visual style
- Text content (if any)
- Artistic elements and techniques
- Context and setting
- Any notable details or anomalies

Provide your analysis in clear, organized sections. Be thorough but concise. If the user asks specific questions about the image, focus your analysis on those aspects while still providing a comprehensive overview.

Respond in Chinese unless the user specifically requests English.`,
    };

    // Prepare messages for vision analysis
    let finalMessages: any[] = [systemPrompt];

    if (imageUrl) {
      // Vision message with image
      const userMessage = {
        role: 'user' as const,
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt || '请分析这张图片' },
        ],
      };
      finalMessages.push(userMessage);
    } else {
      // Text-only messages
      const textMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      finalMessages.push(...textMessages);
    }

    // Call Gemini 2.5 Flash Image Preview model
    const response = await openai.chat.completions.create({
      model: 'gemini-2.5-flash-image-preview',
      messages: finalMessages,
      max_tokens: 2048,
      temperature: 0.7,
    });

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
