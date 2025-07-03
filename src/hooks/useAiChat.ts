import { useState, useCallback } from 'react';
// @ts-ignore vite handles ts extension
import type { ChatRole } from '../components/ChatMessage.js';

export interface ChatItem {
  role: ChatRole;
  content?: string;
  imageUrl?: string;
}

export default function useAiChat() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (rawInput: string, sourceImageUrl?: string) => {
    if (!rawInput.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: rawInput }]);
    setError(null);
    setLoading(true);

    try {
      // Call backend chat API (non-stream) with full messages
      const chatRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'chat',
          messages: [...messages, { role: 'user', content: rawInput }],
          imageUrl: sourceImageUrl || null,
        }),
      });
      if (!chatRes.ok) throw new Error(await chatRes.text());
      const resp = await chatRes.json();
      const msg = resp.choices?.[0]?.message;
      if (!msg) throw new Error('Invalid response');

      if (msg.function_call) {
        const { name, arguments: argsJson } = msg.function_call;
        const args = JSON.parse(argsJson || '{}');
        if (name === 'generate_image') {
          const { prompt } = args;
          const imgRes = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, mode: 'generate' }),
          });
          if (!imgRes.ok) throw new Error(await imgRes.text());
          const { imageUrl } = await imgRes.json();
          setMessages(prev => [...prev, { role: 'image', imageUrl, content: prompt }]);
        } else if (name === 'edit_image') {
          const { prompt, imageUrl: imgUrl } = args;
          const imgRes = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, srcImageUrl: imgUrl, mode: 'edit' }),
          });
          if (!imgRes.ok) throw new Error(await imgRes.text());
          const { imageUrl } = await imgRes.json();
          setMessages(prev => [...prev, { role: 'image', imageUrl, content: prompt }]);
        } else {
          // Unknown function, fallback
          setMessages(prev => [...prev, { role: 'assistant', content: msg.content || '' }]);
        }
      } else {
        // Normal assistant text
        setMessages(prev => [...prev, { role: 'assistant', content: msg.content || '' }]);
      }
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [messages]);

  return { messages, sendMessage, loading, error };
}

