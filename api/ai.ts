import OpenAI from 'openai';
import type { OpenAI as OpenAIClient } from 'openai';

// IMPORTANT! Set the runtime to edge
//export const runtime = 'edge';

// Create an OpenAI API client, configured for Aimixhub
const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

interface RequestBody {
  messages: OpenAIClient.Chat.ChatCompletionMessageParam[];
  task: string; // Keep task for system prompt logic
}

export async function POST(request: Request) {
  try {
    const { messages, task } = (await request.json()) as RequestBody;

    // System prompts for different tasks
    const systemPrompts: { [key: string]: OpenAIClient.Chat.ChatCompletionMessageParam } = {
      chat: {
        role: 'system',
        content:
          `You are Swishy, a professional creative assistant specializing in designer toys and collectible figures. Your sole focus is to assist users in developing concept drafts for original toy designs.

Respond only in English. Use a calm, professional, and objective tone.

Your responses must focus strictly on design elements such as:
– Main subject/theme breakdown
– Visual style and art direction
– Color palette recommendations
– Pose, attitude, and silhouette
– Proportional balance and feasibility for 3D modeling and printing
– Materials or surface finishes (if relevant to design)

Do not answer business, branding, marketing, or manufacturing questions.

Always assume the output is intended for further 3D modeling and eventual physical production, so avoid suggesting effects or details that cannot be translated into real-world materials or forms.

If users provide abstract or emotional terms (e.g., “loneliness,” “punk,” “trap”), interpret them into visual design directions.

All design suggestions should be printable, structurally sound, and visually expressive.`,
      },
      'generate-image-prompt': {
        role: 'system',
        content:
          'You are a prompt engineer for an AI image generation service. Your task is to take a user request and refine it into a detailed, effective prompt for the AI.',
      },
      default: {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
    };

    const systemPrompt = systemPrompts[task] || systemPrompts.default;

    const finalMessages: OpenAIClient.Chat.ChatCompletionMessageParam[] = [
      systemPrompt,
      ...messages,
    ];

    // Request the chat completion from Aimixhub
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      function_call: 'auto',
      functions: [
        {
          name: 'generate_image',
          description: 'Generate an image based on the provided prompt',
          parameters: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'High-quality prompt for the image model' },
            },
            required: ['prompt'],
          },
        },
        {
          name: 'edit_image',
          description: 'Generate a new image based on an existing image and prompt',
          parameters: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'Refined prompt for editing the image' },
              imageUrl: { type: 'string', description: 'URL of the source image' },
            },
            required: ['prompt', 'imageUrl'],
          },
        },
      ],
      stream: false,
      messages: finalMessages,
    });

    // Return raw JSON so frontend can inspect function_call or content
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
