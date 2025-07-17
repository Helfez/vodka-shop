
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

const ROLE_IDS = ['role1', 'role2', 'role3', 'role4', 'role5'] as const;

interface Body {
  imageUrl: string;
  styleImageUrl?: string;
  prompts: Record<(typeof ROLE_IDS)[number], string>;
  branch: boolean; // true -> run role2-4, false -> skip directly to role5
  useStyle?: Partial<Record<'role2' | 'role3' | 'role4' | 'role5', boolean>>;
}

export async function POST(req: Request) {
  try {
    const { imageUrl, styleImageUrl, prompts, branch, useStyle = {} } = (await req.json()) as Body;

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
      // Run roles 2-4 in parallel, all based on role1 output to avoid dependency chain
      const withStyle = (role: 'role2' | 'role3' | 'role4') =>
        (useStyle[role] && styleImageUrl ? `<image src="${styleImageUrl}" alt="style" />\n` : '') + (outputs.role1 || '');

      const [r2, r3, r4] = await Promise.all([
        callChat(prompts.role2, withStyle('role2')),
        callChat(prompts.role3, withStyle('role3')),
        callChat(prompts.role4, withStyle('role4')),
      ]);
      outputs.role2 = r2;
      outputs.role3 = r3;
      outputs.role4 = r4;
    }

    // role5 synthesis
    const synthesisInput = branch
      ? `${outputs.role1}\n${outputs.role2}\n${outputs.role3}\n${outputs.role4}`
      : outputs.role1 || '';
    const role5Input = (useStyle.role5 && styleImageUrl ? `<image src="${styleImageUrl}" alt="style" />\n` : '') + synthesisInput;
    outputs.role5 = await callChat(prompts.role5, role5Input);

    // generate image via internal image API
    // Build absolute URL for the internal /api/image endpoint (required on Vercel)
    // Derive current origin from the incoming request (works both locally and on Vercel)
    const baseUrl = new URL(req.url).origin;
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
