import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CanvasPane from '../components/CanvasPane.js';
import MobileToolbar from '../components/MobileToolbar.tsx';

/**
 * Formal mobile board page (V2) – resembles the provided mockup.
 * Structure:
 *  ┌──────────────────────────┐
 *  │←       (status bar)      │
 *  │  Canvas / dot-grid       │
 *  │                          │
 *  │                          │
 *  │                          │
 *  │                          │
 *  │                          │
 *  ├──────────────────────────┤
 *  │  bottom toolbar (white)  │
 *  │  Camera Text Paint More  │
 *  │      FAB  (orange)       │
 *  └──────────────────────────┘
 */
export default function MobileBoardV2() {
  const nav = useNavigate();

  const [activeTool, setActiveTool] = useState<'pencil' | 'text' | 'select'>('select');
  const [generating, setGenerating] = useState(false);

  /**
   * Generate callback – here we just toggle loading state for demo;
   * hook up actual generate when ready.
   */
  const handleGenerate = () => {
    if (generating) return;
    setGenerating(true);
    // TODO integrate generation flow
    setTimeout(() => setGenerating(false), 1500);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-white overflow-hidden relative">
      {/* Back button */}
      <button
        className="absolute top-[env(safe-area-inset-top,8px)] left-3 z-40 text-2xl text-black/80"
        onClick={() => nav(-1)}
      >
        ←
      </button>

      {/* Canvas area with dot grid background */}
      <div className="flex-grow relative" style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)", backgroundSize: "12px 12px" }}>
        <CanvasPane />
      </div>

      {/* Floating FAB */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] right-5 z-50 w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg transition active:scale-95 ${generating ? 'bg-gray-300 text-gray-500' : 'bg-orange-500 text-white'} `}
      >
        ▶️
      </button>

      {/* Bottom toolbar */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white h-24 flex items-center justify-around border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ToolButton label="Camera" icon="📷" onClick={() => {}} />
        <ToolButton label="Text" icon="T" active={activeTool==='text'} onClick={() => setActiveTool('text')} />
        <ToolButton label="Paint" icon="🖌️" active={activeTool==='pencil'} onClick={() => setActiveTool('pencil')} />
        <ToolButton label="More" icon="✨" onClick={() => {}} />
      </div>
    </div>
  );
}

interface TBProps { label: string; icon: string; onClick: () => void; active?: boolean; }
function ToolButton({ label, icon, onClick, active=false }: TBProps) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center text-xs ${active? 'text-orange-600' : 'text-black'} font-medium`}>
      <span className="text-2xl mb-1">{icon}</span>
      {label}
    </button>
  );
}
