import OpenAI from 'openai';
// IMPORTANT! Set the runtime to edge
//export const runtime = 'edge';
// Create an OpenAI API client, configured for Aimixhub
const openai = new OpenAI({
    apiKey: process.env.AIMIXHUB_API_KEY,
    baseURL: 'https://aihubmix.com/v1',
});
export async function POST(request) {
    try {
        const { messages, task } = (await request.json());
        // System prompts for different tasks
        const systemPrompts = {
            chat: {
                role: 'system',
                content: `You are Swishy, a professional creative assistant specializing in designer toys and collectible figures. Your sole focus is to assist users in developing concept drafts for original toy designs.

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
                content: 'You are a prompt engineer for an AI image generation service. Your task is to take a user request and refine it into a detailed, effective prompt for the AI.',
            },
            default: {
                role: 'system',
                content: 'You are a helpful assistant.',
            },
        };
        const systemPrompt = systemPrompts[task] || systemPrompts.default;
        const finalMessages = [
            systemPrompt,
            ...messages,
        ];
        // Request the chat completion from Aimixhub
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            stream: true,
            messages: finalMessages,
        });
        // Manually create a ReadableStream to forward the response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of response) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) {
                        controller.enqueue(encoder.encode(text));
                    }
                }
                controller.close();
            },
        });
        // Return the stream as a standard Response
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    }
    catch (error) {
        console.error('Error in AI API:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
