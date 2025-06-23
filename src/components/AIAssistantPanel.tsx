import { useState, useRef, useEffect } from 'react';

// Define the shape of a message
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi there! I’m Swishy — your design buddy for creating unique and collectible toys.

Got a spark of an idea? A mood, a character, a shape, or just a word? I’ll help you turn it into a clear, printable toy concept.

Together, we’ll explore style, pose, colors, and structure — all ready for 3D modeling and real-world production.

Whenever you're ready, just tell me what you're imagining. Let’s start creating.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userInput: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userInput]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userInput], task: 'chat' }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantMessageId = Date.now().toString();

      // Add an empty assistant message to start
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        assistantMessage += decoder.decode(value, { stream: true });
        // Update the assistant's message in real-time
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId ? { ...msg, content: assistantMessage } : msg
        ));
      }

    } catch (error) {
      console.error('Error fetching AI response:', error);
      setMessages(prev => [...prev, { id: 'error', role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-cyan-50 p-6">
      {/* Brand */}
      <div className="flex-shrink-0 mb-6 h-24 flex items-center justify-center">
        <img src="/swishmint-logo.png" alt="Swishmint" className="h-full w-auto select-none object-contain mx-auto" />
      </div>

      <div ref={chatContainerRef} className="flex-grow space-y-3 overflow-y-auto pr-2 custom-scrollbar scroll-smooth bg-cyan-50">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`animate-popIn w-fit max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
                }`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
             <div className="animate-popIn w-fit max-w-[85%] rounded-lg p-3 px-4 bg-sky-50/70 text-gray-800">
                <span className="animate-pulse">...</span>
             </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 mt-4">
        <form onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="w-full h-11 px-4 bg-cyan-50 border border-cyan-200 rounded-xl placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
          />
        </form>
      </div>
    </div>
  );
}
