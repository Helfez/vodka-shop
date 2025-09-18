import OpenAI from 'openai';

// Create an OpenAI API client, configured for Aimixhub v1 endpoint
const openai = new OpenAI({
  apiKey: process.env.AIMIXHUB_API_KEY,
  baseURL: 'https://aihubmix.com/v1',
});

interface AgentRequest {
  whiteboardImage: string; // 白板快照 base64 或 URL
  productImage: string;    // 选择的商品图 base64 或 URL
  node: string;           // 节点标识，如 "1-1"
  task: string;           // 任务类型，如 "devdesign"
}

interface AgentResponse {
  node: string;
  task: string;
  result: string;         // 统一的分析结果
  timestamp: number;
}

export async function POST(request: Request) {
  try {
    const { whiteboardImage, productImage, node = "1-1", task = "devdesign" } = (await request.json()) as AgentRequest;

    if (!whiteboardImage || !productImage) {
      return new Response(JSON.stringify({ 
        error: 'Both whiteboardImage and productImage are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[AGENT ${node}] 开始处理 ${task} 任务 - 使用 gpt-4o 模型（临时替代）`);

    // 节点1-1: Devdesign 任务的系统提示
    const systemPrompt = {
      role: 'system' as const,
      content: `你是一个专业的珠串设计分析师。你需要分析用户的白板创意草图和选择的珠串商品，然后给出具体的设计建议。

分析要点：
1. 白板创意解读：识别用户画的图案、颜色、布局意图
2. 珠串商品特征：分析珠串的材质、颜色、形状、风格
3. 设计融合建议：如何将用户创意与珠串特征结合

输出要求：
- 简洁明了的设计分析
- 具体可执行的设计建议
- 突出亮点和创新点
- 用中文回复`,
    };

    // 构建视觉分析消息
    const userMessage = {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: '请分析用户的白板创意草图和选择的珠串商品，给出设计建议。第一张是白板快照，第二张是选择的珠串商品。'
        },
        {
          type: 'image_url' as const,
          image_url: { url: whiteboardImage }
        },
        {
          type: 'image_url' as const, 
          image_url: { url: productImage }
        }
      ]
    };

    // 暂时使用GPT-4o进行视觉分析（因为Gemini MIME类型问题）
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemPrompt, userMessage],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const analysisResult = response.choices[0]?.message?.content || '分析失败';

    // 构建简化的 Agent 响应格式
    const agentResponse: AgentResponse = {
      node,
      task,
      result: analysisResult,
      timestamp: Date.now()
    };

    console.log(`[AGENT ${node}] ${task} 任务完成 - 模型: gpt-4o（临时替代）`);

    return new Response(JSON.stringify(agentResponse), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agent API 错误:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Agent processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
