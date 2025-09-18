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

    // 系统提示词（不包含商品信息）
    const systemPrompt = `你是一名多元的主珠设计师
    解析用户的第一张白板表达（主题、符号、风格、情绪）和第二张图的配珠信息（材质、尺寸、色彩、串法）。
    设计主珠的描述语言
    1. 从灵感来源出发确认是否存在，个人符号、文化符号、自然意象、情绪态度。
    2. 把灵感提炼为视觉符号（几何线条、纹样、质感或具象主体），方便应用到珠子表面。
    3. 根据主题，在造型上做一个选择：圆形、切面、异形，镂空/浮雕，人物/物件，
    4. 在配色与材质上结合配珠信息，表达主题。（和配珠可以反色，可以正色，可以渐变，但要和主题相关）

    注意！你只需要需输出一段描述主珠的造型、主题融合方式的描述语言。其中【符号】或【融合方式】没法解析，则不需要输出。
    必须如下结构输出文案：主珠的造型是【形状/物件/人物】，主题融合方式是【融合方式】，符号是【符号】，配色是【配色】，材质是【材质】。
`;

    // 构建请求内容 - 只包含图片，不需要额外的用户消息
    const parts = [
      {
        inline_data: {
          mime_type: "image/png",
          data: whiteboardBase64
        }
      }
    ];

    // 商品图片必须是base64，添加到请求中
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
    } else {
      // 如果不是base64，说明前端处理有问题
      throw new Error('商品图片必须是base64格式');
    }

    // 调用 AiHubMix Gemini API
    const apiKey = process.env.AIMIXHUB_API_KEY;
    const response = await fetch(`https://aihubmix.com/gemini/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              ...parts
            ]
          }
        ],
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
