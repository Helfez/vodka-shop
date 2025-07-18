import { useState, useCallback } from 'react';
import { DEFAULT_PIPELINE_PROMPTS, THEME_PROMPTS } from '../pipelinePrompts.js';
import type { PipelinePrompts } from '../pipelinePrompts.js';
interface Options {
  canvas: HTMLCanvasElement | null;
  templateId: string;
  prompts?: PipelinePrompts;
  branch?: boolean;
}

interface Result {
  imageUrl: string;
}

export function useBoardGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const generate = useCallback(async (options: Options) => {
    const { canvas, templateId, prompts, branch = true } = options;
    if (!canvas) {
      setError('Canvas not ready');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Downscale to 512px for vision input
      const maxSize = 512;
      const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1);
      const targetW = Math.round(canvas.width * scale);
      const targetH = Math.round(canvas.height * scale);
      const off = document.createElement('canvas');
      off.width = targetW;
      off.height = targetH;
      const ctx = off.getContext('2d');
      if (!ctx) throw new Error('Context error');
      ctx.drawImage(canvas, 0, 0, targetW, targetH);

      const boardDataUrl = off.toDataURL('image/png');

      // 先上传到 Cloudinary，获取可公开访问的 URL，供 GPT-4o vision 使用
      let boardUrl = boardDataUrl;
      try {
        const upBoard = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: boardDataUrl }),
        });
        if (upBoard.ok) {
          const { url: uploadedUrl } = await upBoard.json();
          if (uploadedUrl) boardUrl = uploadedUrl;
        }
      } catch (err) {
        console.warn('Upload board image failed, fallback to dataUrl', err);
      }

      // Call multi-agent pipeline backend
      // 根据 templateId 选择对应的主题 prompts
      const themePrompts = templateId ? THEME_PROMPTS[templateId] : DEFAULT_PIPELINE_PROMPTS;
      const finalPrompts = prompts ?? themePrompts ?? DEFAULT_PIPELINE_PROMPTS;
      
      const resp = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: boardUrl,
          prompts: finalPrompts,
          branch,
        }),
      });

      if (!resp.ok) throw new Error(`Pipeline API error: ${resp.status}`);
      const { imageUrl: genUrl } = await resp.json();
      if (!genUrl) throw new Error('No image from pipeline');

      let finalUrl = genUrl;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: genUrl }),
        });
        if (upRes.ok) {
          const { secureUrl } = await upRes.json();
          if (secureUrl) finalUrl = secureUrl;
        }
      } catch (err) {
        console.warn('Cloudinary upload failed', err);
      }
      setResult({ imageUrl: finalUrl });
    } catch (e: any) {
      setError(e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, result };
}
