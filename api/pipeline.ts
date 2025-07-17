
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

const ROLE_IDS = ['role1', 'role2', 'role3', 'role4', 'role5'] as const;

interface Body {
  imageUrl: string;
  prompts: Record<(typeof ROLE_IDS)[number], string>;
  branch: boolean; // true -> run role2-4, false -> skip directly to role5
}

export async function POST(req: Request) {
  try {
    const { imageUrl, prompts, branch } = (await req.json()) as Body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl required' }), { status: 400 });
    }

    const outputs: Partial<Record<(typeof ROLE_IDS)[number], string>> = {};

    // helper to call chat
    const callChat = async (systemPrompt: string, userContent: string) => {
      const messages = [
        { role: 'system', content: systemPrompt || '' },
        { role: 'user', content: userContent },
      ];
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 1024,
      } as any);
      return res.choices?.[0]?.message?.content || '';
    };

    // role1 – image analysis
    outputs.role1 = await callChat(
      prompts.role1,
      `<image src="${imageUrl}" alt="draft" />\n请分析这张草稿图。`
    );

    // branch roles 2-4
    if (branch) {
      outputs.role2 = await callChat(prompts.role2, outputs.role1 || '');
      outputs.role3 = await callChat(prompts.role3, outputs.role2 || outputs.role1 || '');
      outputs.role4 = await callChat(prompts.role4, outputs.role3 || outputs.role2 || outputs.role1 || '');
    }

    // role5 synthesis
    const synthesisInput = branch
      ? `${outputs.role1}\n${outputs.role2}\n${outputs.role3}\n${outputs.role4}`
      : outputs.role1 || '';
    outputs.role5 = await callChat(prompts.role5, synthesisInput);

    // generate image via internal image API
    // Build absolute URL for the internal /api/image endpoint (required on Vercel)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || process.env.VERCEL_URL ?
      `https://${process.env.VERCEL_URL}` :
      'http://localhost:3000';
    const imgRes = await fetch(`${baseUrl}/api/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: outputs.role5 }),
    });
    const { imageUrl: genImageUrl, error: imgErr } = await imgRes.json();
    if (imgErr) throw new Error(imgErr);

    return new Response(
      JSON.stringify({ outputs, imageUrl: genImageUrl }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('pipeline error', e);
    return new Response(JSON.stringify({ error: e.message || 'pipeline error' }), { status: 500 });
  }
}
