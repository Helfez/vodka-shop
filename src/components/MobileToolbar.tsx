import React from 'react';

interface MobileToolbarProps {
  activeTool: 'pencil' | 'text' | 'select';
  onSelectTool: (t: 'pencil' | 'text' | 'select') => void;
  onUpload: () => void;
  onUndo: () => void;
  onGenerate: () => void;
  generating: boolean;
}

export default function MobileToolbar({ activeTool, onSelectTool, onUpload, onUndo, onGenerate, generating }: MobileToolbarProps) {
  const btn = (label: string, icon: string, active: boolean, onClick: ()=>void, disabled=false) => (
    <button
      className={`flex flex-col items-center justify-center text-xs ${active?'text-cyan-600':'text-gray-700'} disabled:opacity-40`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="text-2xl">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="w-full h-20 bg-white/90 backdrop-blur-sm border-t border-gray-200 flex justify-around items-center">
      {btn('Draw','✏️',activeTool==='pencil',()=>onSelectTool('pencil'))}
      {btn('Text','🔤',activeTool==='text',()=>onSelectTool('text'))}
      {btn('Upload','📷',false,onUpload)}
      {btn('Undo','↶',false,onUndo)}
      {btn(generating?'...':'Gen','⚡',false,onGenerate,generating)}
    </div>
  );
}
