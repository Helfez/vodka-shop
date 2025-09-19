// 全新的设计分析API - 避免Vercel构建冲突

interface DesignRequest {
  whiteboardImage: string;
  productImage: string;
  node?: string;
  task?: string;
  // 节点1-2专用字段
  node1_1Result?: string; // 节点1-1的分析结果，作为User Message
}

// 提取base64数据
function extractBase64(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1] || '';
  }
  return dataUrl;
}

export default async function handler(req: any, res: any) {
  // 🔍 断点1: API入口
  console.log('🔍 [BREAKPOINT 1] API Handler 入口');
  console.log('📥 请求方法:', req.method);
  console.log('📥 请求体大小:', JSON.stringify(req.body).length, 'bytes');
  
  if (req.method !== 'POST') {
    console.log('❌ [BREAKPOINT 1] 请求方法错误:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { whiteboardImage, productImage, node = "1-1", task = "devdesign", node1_1Result } = req.body as DesignRequest;

    // 🔍 断点2: 参数解析
    console.log('🔍 [BREAKPOINT 2] 参数解析完成');
    console.log('📊 节点:', node);
    console.log('📊 任务:', task);
    console.log('📊 白板图片长度:', whiteboardImage?.length || 0);
    console.log('📊 商品图片长度:', productImage?.length || 0);
    console.log('📊 1-1结果长度:', node1_1Result?.length || 0);
    console.log('📊 是否有1-1结果:', !!node1_1Result);

    if (!whiteboardImage || !productImage) {
      console.log('❌ [BREAKPOINT 2] 必需参数缺失');
      console.log('❌ 白板图片存在:', !!whiteboardImage);
      console.log('❌ 商品图片存在:', !!productImage);
      return res.status(400).json({ 
        success: false,
        error: 'Both whiteboardImage and productImage are required' 
      });
    }

    console.log(`🚀 [AGENT ${node}] 开始处理 ${task} 任务`);

    // 🔍 断点3: 节点路由
    console.log('🔍 [BREAKPOINT 3] 节点路由判断');
    console.log('🔀 当前节点:', node);
    console.log('🔀 路由到:', node === "1-2" ? '节点1-2 (图片生成)' : '节点1-1 (文本分析)');

    // 根据节点类型选择不同的处理逻辑
    if (node === "1-2") {
      console.log('➡️ [BREAKPOINT 3] 路由到节点1-2处理函数');
      return await handleNode1_2(req, res, { whiteboardImage, productImage, node1_1Result, node, task });
    }

    // 🔍 断点4: 节点1-1处理开始
    console.log('🔍 [BREAKPOINT 4] 节点1-1处理开始');
    console.log('🎯 开始文本分析任务');

    // 节点1-1的处理逻辑
    // 处理白板图片数据
    const whiteboardBase64 = extractBase64(whiteboardImage);
    console.log('📸 白板图片Base64提取完成，长度:', whiteboardBase64.length);

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

    // 🔍 断点5: 图片数据处理
    console.log('🔍 [BREAKPOINT 5] 节点1-1图片数据处理');
    console.log('📋 构建API请求内容');

    // 商品图片必须是base64，添加到请求中
    if (productImage.startsWith('data:')) {
      const productBase64 = extractBase64(productImage);
      console.log('📸 商品图片Base64提取完成，长度:', productBase64.length);
      if (productBase64) {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: productBase64
          }
        });
        console.log('✅ 商品图片已添加到请求中');
      }
    } else {
      console.log('❌ [BREAKPOINT 5] 商品图片格式错误，不是base64');
      // 如果不是base64，说明前端处理有问题
      throw new Error('商品图片必须是base64格式');
    }

    console.log('📊 最终请求parts数量:', parts.length);

    // 🔍 断点6: API调用准备
    console.log('🔍 [BREAKPOINT 6] 节点1-1 API调用准备');
    
    // 调用 AiHubMix Gemini API
    const apiKey = process.env.AIMIXHUB_API_KEY;
    console.log('🔑 API Key存在:', !!apiKey);
    console.log('🔗 API URL: https://aihubmix.com/gemini/v1beta/models/gemini-2.5-flash-lite:generateContent');
    console.log('🚀 开始调用Gemini API...');
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

    // 🔍 断点7: API响应处理
    console.log('🔍 [BREAKPOINT 7] 节点1-1 API响应处理');
    console.log('📡 响应状态:', response.status);
    console.log('📡 响应OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BREAKPOINT 7] Gemini API 错误:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    // 🔍 断点8: 结果提取
    console.log('🔍 [BREAKPOINT 8] 节点1-1 结果提取');
    console.log('📄 响应数据keys:', Object.keys(data));
    console.log('📄 candidates存在:', !!data.candidates);
    console.log('📄 candidates长度:', data.candidates?.length || 0);
    
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '分析失败';
    console.log('✅ 提取的分析结果长度:', result.length);
    console.log('📝 分析结果预览:', result.substring(0, 100) + '...');

    // 详细日志输出
    console.log(`[AGENT ${node}] Gemini API 原始响应:`, JSON.stringify(data, null, 2));
    console.log(`[AGENT ${node}] 提取的分析结果:`, result);
    console.log(`[AGENT ${node}] ${task} 任务完成`);

    // 🔍 断点9: 节点1-1最终返回
    console.log('🔍 [BREAKPOINT 9] 节点1-1 最终返回');
    console.log('✅ 准备返回分析结果');
    
    const finalResult = {
      success: true,
      result,
      node,
      task,
      timestamp: Date.now()
    };
    
    console.log('📤 分析结果长度:', finalResult.result.length);
    console.log('📤 返回节点:', finalResult.node);

    return res.status(200).json(finalResult);

  } catch (error) {
    console.error('Agent API 错误:', error);
    
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
}

// 节点1-2处理函数：图片生成
async function handleNode1_2(_req: any, res: any, params: {
  whiteboardImage: string;
  productImage: string;
  node1_1Result?: string;
  node: string;
  task: string;
}) {
  // 🔍 断点9: 节点1-2函数入口
  console.log('🔍 [BREAKPOINT 9] 节点1-2函数入口');
  console.log('🎨 开始图片生成任务');
  
  const { whiteboardImage, productImage, node1_1Result, node, task } = params;

  // 🔍 断点10: 参数验证
  console.log('🔍 [BREAKPOINT 10] 节点1-2参数验证');
  console.log('📊 白板图片长度:', whiteboardImage?.length || 0);
  console.log('📊 商品图片长度:', productImage?.length || 0);
  console.log('📊 1-1结果长度:', node1_1Result?.length || 0);
  console.log('📊 节点:', node);
  console.log('📊 任务:', task);

  // 验证节点1-2的必需参数
  if (!node1_1Result) {
    console.log('❌ [BREAKPOINT 10] 缺少1-1结果，无法进行图片生成');
    return res.status(400).json({
      success: false,
      error: 'node1_1Result is required for node 1-2',
      timestamp: Date.now()
    });
  }

  try {
    console.log(`🚀 [AGENT ${node}] 节点1-2开始生图，基于1-1结果: ${node1_1Result.substring(0, 100)}...`);

    // 🔍 断点11: 图片数据处理
    console.log('🔍 [BREAKPOINT 11] 节点1-2图片数据处理');
    
    // 处理图片数据
    const whiteboardBase64 = extractBase64(whiteboardImage);
    const productBase64 = extractBase64(productImage);
    
    console.log('📸 白板图片Base64提取完成，长度:', whiteboardBase64.length);
    console.log('📸 商品图片Base64提取完成，长度:', productBase64.length);

    // 节点1-2的系统提示词（占位符）
    const systemPrompt = `你是一名珠宝设计师的AI助手，专门负责根据设计分析生成主珠的视觉图像。
    基于设计分析结果，生成符合描述的主珠图像。
    请根据提供的白板灵感、配珠参考和设计分析，创造出精美的主珠设计图。
    
    要求：
    1. 图像应该清晰展示主珠的设计细节
    2. 风格要与设计分析中的描述一致
    3. 考虑配珠的搭配和整体美感
    4. 生成高质量的珠宝设计效果图`;

    // 🔍 断点12: 请求内容构建
    console.log('🔍 [BREAKPOINT 12] 节点1-2请求内容构建');
    console.log('📝 系统提示词长度:', systemPrompt.length);
    
    // 构建请求内容 - 包含两张图片和1-1的分析结果
    const contents = [
      {
        parts: [
          { text: systemPrompt },
          {
            inline_data: {
              mime_type: "image/png",
              data: whiteboardBase64
            }
          },
          {
            inline_data: {
              mime_type: "image/jpeg", 
              data: productBase64
            }
          },
          { text: `设计分析结果：${node1_1Result}` },
          { text: "请基于以上信息生成主珠的设计图像。" }
        ]
      }
    ];

    console.log('📋 请求内容parts数量:', contents[0].parts.length);

    // 🔍 断点13: API调用准备
    console.log('🔍 [BREAKPOINT 13] 节点1-2 API调用准备');
    
    // 调用 Gemini 2.5 Flash Image Preview 进行图片生成
    const apiKey = process.env.AIMIXHUB_API_KEY;
    console.log('🔑 API Key存在:', !!apiKey);
    console.log('🔗 API URL: https://aihubmix.com/gemini/v1beta/models/gemini-2.5-flash-image-preview:generateContent');
    console.log('🚀 开始调用Gemini Image API...');
    const response = await fetch(`https://aihubmix.com/gemini/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.8
        }
      }),
    });

    // 🔍 断点14: API响应处理
    console.log('🔍 [BREAKPOINT 14] 节点1-2 API响应处理');
    console.log('📡 响应状态:', response.status);
    console.log('📡 响应OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BREAKPOINT 14] Gemini Image API 错误:', errorText);
      throw new Error(`Gemini Image API error: ${response.status}`);
    }

    const data = await response.json();
    
    // 🔍 断点15: 图片结果提取
    console.log('🔍 [BREAKPOINT 15] 节点1-2 图片结果提取');
    console.log('📄 响应数据keys:', Object.keys(data));
    console.log('📄 candidates存在:', !!data.candidates);
    console.log('📄 candidates长度:', data.candidates?.length || 0);
    
    // 详细日志输出
    console.log(`[AGENT ${node}] Gemini Image API 原始响应:`, JSON.stringify(data, null, 2));

    // 从响应中提取生成的图片数据
    const candidates = data.candidates;
    let generatedImageUrl = null;
    let textResult = null;

    // 🔍 断点16: 图片数据解析
    console.log('🔍 [BREAKPOINT 16] 节点1-2 图片数据解析');

    if (candidates && candidates[0]) {
      const parts = candidates[0].content?.parts || [];
      console.log('📋 响应parts数量:', parts.length);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        console.log(`📋 Part ${i} 类型:`, Object.keys(part));
        
        // 检查是否有生成的图片
        if (part.inline_data && part.inline_data.data) {
          // 构建base64图片URL
          const mimeType = part.inline_data.mime_type || 'image/jpeg';
          generatedImageUrl = `data:${mimeType};base64,${part.inline_data.data}`;
          console.log(`✅ [AGENT ${node}] 成功生成图片，大小: ${part.inline_data.data.length} bytes`);
          console.log(`📷 图片MIME类型: ${mimeType}`);
        }
        
        // 检查是否有文本描述
        if (part.text) {
          textResult = part.text;
          console.log(`📝 生成的文本描述长度: ${part.text.length}`);
        }
      }
    } else {
      console.log('❌ 没有找到candidates或candidates为空');
    }

    // 🔍 断点17: 结果验证
    console.log('🔍 [BREAKPOINT 17] 节点1-2 结果验证');
    console.log('🖼️ 图片生成成功:', !!generatedImageUrl);
    console.log('📝 文本描述存在:', !!textResult);

    if (!generatedImageUrl) {
      console.error(`❌ [AGENT ${node}] 未能从响应中找到生成的图片`);
      throw new Error('No image generated from Gemini API');
    }

    console.log(`✅ [AGENT ${node}] ${task} 图片生成任务完成`);

    // 🔍 断点18: 最终返回
    console.log('🔍 [BREAKPOINT 18] 节点1-2 最终返回');
    console.log('✅ 准备返回成功结果');
    
    const finalResult = {
      success: true,
      result: {
        imageUrl: generatedImageUrl,
        description: textResult,
        basedOn: node1_1Result
      },
      node,
      task,
      timestamp: Date.now()
    };
    
    console.log('📤 返回结果keys:', Object.keys(finalResult.result));
    console.log('📤 图片URL长度:', finalResult.result.imageUrl?.length || 0);
    
    return res.status(200).json(finalResult);

  } catch (error) {
    console.error(`[AGENT ${node}] 图片生成失败:`, error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Image generation failed',
      node,
      task,
      timestamp: Date.now()
    });
  }
}
