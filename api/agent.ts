// 直接使用 fetch 调用 AiHubMix 的 Gemini 端点

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

    console.log(`[AGENT ${node}] 开始处理 ${task} 任务 - 使用 gemini-2.5-flash-lite 模型（直接调用AiHubMix）`);

    // 处理图片数据
    const extractBase64 = (dataUrl: string) => {
      if (dataUrl.startsWith('data:')) {
        return dataUrl.split(',')[1];
      }
      return dataUrl;
    };

    // 获取图片的base64数据
    let whiteboardBase64: string;
    let productImageBase64: string | null = null;

    if (whiteboardImage.startsWith('data:')) {
      whiteboardBase64 = extractBase64(whiteboardImage);
    } else {
      // 如果是URL，需要下载图片并转换为base64
      const response = await fetch(whiteboardImage);
      const buffer = await response.arrayBuffer();
      whiteboardBase64 = Buffer.from(buffer).toString('base64');
    }

    if (productImage.startsWith('data:')) {
      productImageBase64 = extractBase64(productImage);
    } else if (productImage.startsWith('http')) {
      // 如果是完整URL，下载并转换
      const response = await fetch(productImage);
      const buffer = await response.arrayBuffer();
      productImageBase64 = Buffer.from(buffer).toString('base64');
    }

    // 构建消息内容 - 使用Gemini原生格式
    const parts = [
      {
        text: `你是一个专业的珠串设计分析师。请分析用户的白板创意草图${productImageBase64 ? '和选择的珠串商品' : ''}，给出具体的设计建议。

分析要点：
1. 白板创意解读：识别用户画的图案、颜色、布局意图
${productImageBase64 ? '2. 珠串商品特征：分析珠串的材质、颜色、形状、风格' : ''}
${productImageBase64 ? '3. 设计融合建议：如何将用户创意与珠串特征结合' : '2. 设计建议：基于创意草图给出珠串设计建议'}

${!productImageBase64 ? `商品信息：${productImage}` : ''}

请用中文回复，给出简洁明了的设计分析和具体可执行的设计建议。`
      },
      {
        inline_data: {
          mime_type: "image/png",
          data: whiteboardBase64
        }
      }
    ];

    // 如果有商品图片数据，添加到parts中
    if (productImageBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg", 
          data: productImageBase64
        }
      });
    }

    // 直接调用 AiHubMix 的 Gemini API
    const apiKey = process.env.AIMIXHUB_API_KEY;
    const geminiResponse = await fetch(`https://aihubmix.com/gemini/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API 错误:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini API 响应:', JSON.stringify(geminiData, null, 2));

    const analysisResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '分析失败';

    // 构建简化的 Agent 响应格式
    const agentResponse: AgentResponse = {
      node,
      task,
      result: analysisResult,
      timestamp: Date.now()
    };

    console.log(`[AGENT ${node}] ${task} 任务完成 - 模型: gemini-2.5-flash-lite`);

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
