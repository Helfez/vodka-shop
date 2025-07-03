import { useState, useCallback } from 'react';
import type { ChatRole } from '../components/ChatMessage';

export interface ChatItem {
  role: ChatRole;
  content?: string;
  imageUrl?: string;
}

export default function useAiChat() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (rawInput: string) => {
    if (!rawInput.trim()) return;

    // append user message
    setMessages(prev => [...prev, { role: 'user', content: rawInput }]);
    setError(null);
    setLoading(true);

    const isImage = rawInput.startsWith('/img');

    try {
      if (isImage) {
        const purePrompt = rawInput.replace(/^\/img\s*/i, '').trim();
        // 1. ask ai to refine prompt
        const refinedPrompt = await getRefinedPrompt(purePrompt, messages);
        // 2. request image-one
        const imgRes = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: refinedPrompt }),
        });
        if (!imgRes.ok) throw new Error(await imgRes.text());
        const { imageUrl } = (await imgRes.json()) as { imageUrl: string };
        setMessages(prev => [
          ...prev,
          { role: 'image', imageUrl, content: refinedPrompt },
        ]);
      } else {
        // normal chat completes, stream
        const chatRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: 'chat',
            messages: [...messages, { role: 'user', content: rawInput }],
          }),
        });
        if (!chatRes.ok) throw new Error(await chatRes.text());
        const reader = chatRes.body?.getReader();
        if (!reader) throw new Error('No stream');
        let assistantText = '';
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value);
          setMessages(prev => {
            const last = prev[prev.length - 1];
            // if last message is assistant in progress, update, else push new
            if (last && last.role === 'assistant' && !last.imageUrl) {
              return [...prev.slice(0, -1), { ...last, content: assistantText }];
            }
            return [...prev, { role: 'assistant', content: assistantText }];
          });
        }
      }
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [messages]);

  return { messages, sendMessage, loading, error };
}

async function getRefinedPrompt(userPrompt: string, history: any[]) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'generate-image-prompt',
      messages: [
        ...history,
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No stream');
  const decoder = new TextDecoder();
  let refined = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    refined += decoder.decode(value);
  }
  return refined.trim();
}
