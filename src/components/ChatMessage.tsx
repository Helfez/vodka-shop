import React from 'react';

export type ChatRole = 'user' | 'assistant' | 'image';

export interface ChatMessageProps {
  role: ChatRole;
  content?: string;
  imageUrl?: string;
}

export default function ChatMessage({ role, content, imageUrl }: ChatMessageProps) {
  if (role === 'image' && imageUrl) {
    return (
      <div className="my-2 flex justify-center">
        <img
          src={imageUrl}
          alt={content || 'image'}
          className="max-w-[60%] rounded shadow cursor-pointer hover:opacity-90 transition"
          onClick={() => window.open(imageUrl, '_blank')}
        />
        {content && (
          <p className="text-xs text-gray-500 mt-1 max-w-[60%] whitespace-pre-wrap">{content}</p>
        )}
      </div>
    );
  }

  const isUser = role === 'user';
  return (
    <div
      className={`my-2 flex ${isUser ? 'justify-end' : 'justify-start'} text-sm whitespace-pre-wrap`}
    >
      <div
        className={`px-3 py-2 rounded-lg max-w-[70%] leading-relaxed ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
      >
        {content}
      </div>
    </div>
  );
}
