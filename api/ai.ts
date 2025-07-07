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
  task: string;
  boardImageUrl?: string; // rasterized board PNG
  templateId?: string;
  userPrompt?: string;
}

export async function POST(request: Request) {
  try {
    const { messages, task, boardImageUrl, templateId, userPrompt } = (await request.json()) as RequestBody;

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

    let systemPrompt = systemPrompts[task] || systemPrompts.default;

    // prepare final messages array
    let finalMessages: OpenAIClient.Chat.ChatCompletionMessageParam[] = [];

  // Special prompt for vision board generation
  if (task === 'board-generate') {
    systemPrompt = {
      role: 'system',
      content: `You are a professional toy design assistant specialized in collectible and 3D-printable art toys. Your role is to analyze a user's whiteboard image, which may contain sketches, annotations, keywords, color marks, or layout compositions, to infer the user’s design intention.

Based on that, and the user’s selected style tag (e.g. Popmart, LEGO, DnD mini, Warhammer, Ghibli, Urban Vinyl, or Cthulhu), you must generate a clear, descriptive, and production-ready image prompt suitable for toy rendering using high-resolution AI models (like image-one / flux1).

You must follow these constraints:

The toy must be 3D printable (no fine hair, floating parts, or non-supported thin elements).

The design must be physically feasible, with all parts structurally connected and no floating elements.

Color scheme should be derived from the whiteboard input (if any), or appropriate to the selected style.

Use a clean, white transparent background with no environmental lighting or shadows.

Keep the design moderately simplified: avoid hyper-complex details that are not manufacturable.

Use concise and structured prompt formatting, including elements like [subject], [pose], [material/look], [style], [color], and [render format].

Output only the final prompt. Do not include explanations or alternative prompts.

When responding, you MUST return a function_call to either "generate_image" or "edit_image". Do NOT reply with plain text.`
        };

    if (task === 'board-generate' && boardImageUrl) {
      // Vision message structure with image
      const visionUser: OpenAIClient.Chat.ChatCompletionMessageParam = {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: boardImageUrl } },
          {
            type: 'text',
            text: `templateId: ${templateId || 'generic'}\n${userPrompt || ''}`,
          },
        ] as any, // OpenAI vision content type
      } as any;
      finalMessages = [systemPrompt, visionUser];
    } else {
      finalMessages = [systemPrompt, ...messages];
    }
  } // end if task === 'board-generate'

    // Fallback for other tasks
    if (finalMessages.length === 0) {
      finalMessages = [systemPrompt, ...messages];
    }

    // Request the chat completion from Aimixhub
    const response = await openai.chat.completions.create({
      model: task === 'board-generate' && boardImageUrl ? 'gpt-4o' : 'gpt-4.1-mini',
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

  } // end try
  catch (error) {
    console.error('Error in AI API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
