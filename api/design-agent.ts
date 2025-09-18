// 全新的设计分析API - 避免Vercel构建冲突

interface DesignRequest {
  whiteboardImage: string;
  productImage: string;
  node?: string;
  task?: string;
}

// 提取base64数据
function extractBase64(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1] || '';
  }
  return dataUrl;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { whiteboardImage, productImage, node = "1-1", task = "devdesign" } = req.body as DesignRequest;

    if (!whiteboardImage || !productImage) {
      return res.status(400).json({ 
        success: false,
        error: 'Both whiteboardImage and productImage are required' 
      });
    }

    console.log(`[AGENT ${node}] 开始处理 ${task} 任务`);

    // 处理白板图片数据
    const whiteboardBase64 = extractBase64(whiteboardImage);

    // 系统提示词
    const systemPrompt = `你是一个专业的珠串设计分析师。请分析用户的白板创意草图和选择的珠串商品，给出具体的设计建议。

分析要点：
1. 白板创意解读：识别用户画的图案、颜色、布局意图、设计元素
2. 珠串商品匹配：分析如何将创意与商品特征结合
3. 设计建议：提供具体可执行的设计方案

商品信息：${productImage}

请用中文回复，给出简洁明了的设计分析和具体可执行的设计建议。`;

    // 构建请求内容
    const parts = [
      { text: systemPrompt },
      {
        inline_data: {
          mime_type: "image/png",
          data: whiteboardBase64
        }
      }
    ];

    // 如果商品图片是base64，添加到请求中
    if (productImage.startsWith('data:')) {
      const productBase64 = extractBase64(productImage);
      if (productBase64) {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: productBase64
          }
        });
      }
    }

    // 调用 AiHubMix Gemini API
    const apiKey = process.env.AIMIXHUB_API_KEY;
    const response = await fetch(`https://aihubmix.com/gemini/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API 错误:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '分析失败';

    // 详细日志输出
    console.log(`[AGENT ${node}] Gemini API 原始响应:`, JSON.stringify(data, null, 2));
    console.log(`[AGENT ${node}] 提取的分析结果:`, result);
    console.log(`[AGENT ${node}] ${task} 任务完成`);

    return res.status(200).json({
      success: true,
      result,
      node,
      task,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Agent API 错误:', error);
    
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
}
