import React, { useState } from 'react';

interface GenerationResult {
  id: string;
  prompt: string;
  result?: string;
  error?: string;
  timestamp: number;
}

const GeminiTest: React.FC = () => {
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newResult: GenerationResult = {
      id: Date.now().toString(),
      prompt: input,
      timestamp: Date.now(),
    };

    setResults(prev => [newResult, ...prev]);
    setInput('');
    setIsLoading(true);

    try {
      const requestBody = {
        prompt: input,
        modalities: ["text", "image"],
      };

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 调试：打印完整响应数据
      console.log('Gemini API 完整响应:', JSON.stringify(data, null, 2));
      
      // 处理响应数据 - 查找生成的图片
      let generatedContent = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const message = data.choices[0].message;
        
        console.log('Message 内容:', JSON.stringify(message, null, 2));
        
        // 检查是否有图片内容
        if (message.multi_mod_content && Array.isArray(message.multi_mod_content)) {
          console.log('找到 multi_mod_content:', message.multi_mod_content);
          
          const imageContent = message.multi_mod_content.find((item: any) => 
            item.inline_data && item.inline_data.data && item.inline_data.data.length > 0
          );
          
          if (imageContent) {
            console.log('找到图片内容:', imageContent);
            console.log('Data 长度:', imageContent.inline_data?.data?.length || 0);
            
            if (imageContent.inline_data && imageContent.inline_data.data) {
              // 默认使用 PNG 格式，因为 Gemini 通常返回 PNG
              const mimeType = imageContent.inline_data.mimeType || 'image/png';
              generatedContent = `data:${mimeType};base64,${imageContent.inline_data.data}`;
              console.log('成功生成图片 data URL，长度:', generatedContent.length);
            } else {
              console.log('inline_data 或 data 字段为空');
            }
          } else {
            console.log('没有找到符合条件的图片内容');
          }
        } else {
          console.log('没有找到 multi_mod_content 或不是数组');
        }
        
        // 如果没有图片，显示文本内容
        if (!generatedContent && message.content) {
          generatedContent = message.content;
        }
      }
      
      if (!generatedContent) {
        generatedContent = JSON.stringify(data, null, 2);
      }

      // 更新结果
      setResults(prev => prev.map(result => 
        result.id === newResult.id 
          ? { ...result, result: generatedContent }
          : result
      ));
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setResults(prev => prev.map(result => 
        result.id === newResult.id 
          ? { ...result, error: error instanceof Error ? error.message : '未知错误' }
          : result
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gemini 2.5 Flash 图像生成测试
              </h1>
              <p className="text-gray-600 mt-1">
                测试 AiHubMix 的 gemini-2.5-flash-image-preview 图像生成模型
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                返回
              </button>
              <button
                onClick={clearResults}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                清空结果
              </button>
            </div>
          </div>
        </div>

        {/* Generation Results */}
        <div className="bg-white rounded-lg shadow-sm mb-6 min-h-[400px]">
          <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-4">🎨</div>
                <p>输入提示词开始生成图像</p>
              </div>
            ) : (
              results.map((result) => (
                <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="text-sm text-gray-500 mb-1">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                    <div className="font-medium text-gray-900">
                      提示词: {result.prompt}
                    </div>
                  </div>
                  
                  {result.result ? (
                    result.result.startsWith('data:image/') ? (
                      <div className="mb-3">
                        <img
                          src={result.result}
                          alt="生成的图片"
                          className="max-w-full h-auto rounded-lg border"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded p-3 text-sm font-mono whitespace-pre-wrap">
                        {result.result}
                      </div>
                    )
                  ) : result.error ? (
                    <div className="bg-red-50 text-red-700 rounded p-3 text-sm">
                      错误: {result.error}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-sm">生成中...</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Controls */}
            <div className="flex gap-4">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入图像生成提示词，例如：一只可爱的小猫在花园里玩耍"
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isLoading ? '生成中...' : '生成图像'}
                </button>
              </div>
            </div>
          </form>

          {/* Usage Tips */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">使用提示:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 这是 Gemini 2.5 Flash 的图像生成模型，不是图像分析</li>
              <li>• 输入详细的描述来获得更好的生成效果</li>
              <li>• 支持中文和英文提示词</li>
              <li>• 生成的图像会以 base64 格式返回</li>
              <li>• 示例提示词：一只穿着太空服的猫在月球上跳跃，卡通风格，高质量</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiTest;