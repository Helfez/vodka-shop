import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore vite handles ts extension
import ChatMessage from '../components/ChatMessage';
// @ts-ignore vite handles ts extension
import useAiChat, { ChatItem } from '../hooks/useAiChat';

export default function AiChat() {
  const { messages, sendMessage, loading, error } = useAiChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100">
      <header className="p-3 shadow bg-white flex items-center justify-between">
        <h1 className="font-semibold text-base">AI Chat – 4o-mini & image-one</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {messages.map((m: ChatItem, idx: number) => (
          <ChatMessage key={idx} role={m.role} content={m.content} imageUrl={m.imageUrl} />
        ))}
        <div ref={bottomRef} />
      </main>

      <footer className="p-3 bg-white shadow-inner">
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full border rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…  (⌘/Ctrl+Enter to send)  |  /img your prompt to generate image"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {loading ? 'Generating…' : error ? `Error: ${error}` : ' '}
            </span>
            <button
              disabled={loading || !input.trim()}
              onClick={handleSend}
              className="px-4 py-1.5 bg-blue-600 text-white rounded disabled:opacity-50 text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
