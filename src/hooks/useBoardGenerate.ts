import { useState, useCallback } from 'react';
import type { ChatCompletion } from 'openai/resources/chat/completions';

interface Options {
  canvas: HTMLCanvasElement | null;
  templateId: string;
  userPrompt?: string;
}

interface Result {
  imageUrl: string;
  prompt: string;
}

export function useBoardGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const generate = useCallback(async ({ canvas, templateId, userPrompt }: Options) => {
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

      // Call backend vision agent
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'board-generate',
          boardImageUrl: boardDataUrl,
          templateId,
          userPrompt: userPrompt || '',
          messages: [],
        }),
      });

      if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
      const ai: ChatCompletion = await resp.json();
      const msg = ai.choices?.[0]?.message;
      if (!msg) throw new Error('No message from AI');

      if (msg.function_call) {
        const { name, arguments: argsJson } = msg.function_call;
        const args = JSON.parse(argsJson || '{}');
        const prompt = args.prompt as string;
        if (name === 'generate_image') {
          const ctrl = new AbortController();
          const timeoutId = setTimeout(() => ctrl.abort(), 60000); // 60s timeout
          let imgRes: Response;
          try {
            imgRes = await fetch('/api/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, mode: 'generate' }),
              signal: ctrl.signal,
            });
          } catch (err) {
            if ((err as any).name === 'AbortError') throw new Error('Image generation timeout');
            throw err;
          } finally {
            clearTimeout(timeoutId);
          }
          const { imageUrl } = await imgRes.json();
          let finalUrl = imageUrl;
          try {
            const upRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl }),
            });
            if (upRes.ok) {
              const { secureUrl } = await upRes.json();
              if (secureUrl) finalUrl = secureUrl;
            }
          } catch (err) {
            console.warn('Cloudinary upload failed', err);
          }
          setResult({ imageUrl: finalUrl, prompt });
        } else if (name === 'edit_image') {
          const ctrl = new AbortController();
          const timeoutId = setTimeout(() => ctrl.abort(), 60000);
          let imgRes: Response;
          try {
            imgRes = await fetch('/api/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, mode: 'edit', srcImageUrl: boardDataUrl }),
              signal: ctrl.signal,
            });
          } catch (err) {
            if ((err as any).name === 'AbortError') throw new Error('Image generation timeout');
            throw err;
          } finally {
            clearTimeout(timeoutId);
          }
          const { imageUrl } = await imgRes.json();
          let finalUrl = imageUrl;
          try {
            const upRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl }),
            });
            if (upRes.ok) {
              const { secureUrl } = await upRes.json();
              if (secureUrl) finalUrl = secureUrl;
            }
          } catch (err) {
            console.warn('Cloudinary upload failed', err);
          }
          setResult({ imageUrl: finalUrl, prompt });
        } else {
          throw new Error('Unknown function');
        }
      } else {
        throw new Error('AI did not return function_call');
      }
    } catch (e: any) {
      setError(e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, result };
}
