import { useState, useEffect } from 'react';
import { CanvasPane } from '../components/CanvasPane.js';
import { PreviewPane } from '../components/PreviewPane.js';

// Very lightweight mobile-oriented page. Reuses existing CanvasPane / PreviewPane
// Layout: vertical flex – top canvas (70vh) bottom panel (30vh)
// Tailwind handles responsive sizing; we assume viewport meta in index.html.
export default function MobileBoard() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  type DrawerState = 'peek' | 'half' | 'full';
  const [drawerState, setDrawerState] = useState<DrawerState>('peek');

  // auto open drawer when image generated
  useEffect(() => {
    if (previewUrl) setDrawerState('half');
  }, [previewUrl]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-white">
      {/* Canvas area */}
      <div className="flex-grow relative">
        <CanvasPane onGenerated={url => setPreviewUrl(url)} onLoadingChange={setGenerating} />
      </div>

      {/* Sliding drawer */}
      <div
        className={`fixed left-0 bottom-0 w-full bg-white border-t border-gray-200 shadow-xl transform transition-transform duration-300 ease-out
          ${drawerState==='peek' ? 'translate-y-[calc(100%_-_24px)] max-h-0' : drawerState==='half' ? 'translate-y-[40vh] max-h-[60vh]' : 'translate-y-0 h-[100dvh]'}`}
      >
        {/* handle */}
        <div
          className="w-12 h-1.5 bg-gray-400 rounded-full mx-auto my-2 cursor-pointer"
          onClick={() => setDrawerState(prev => {
            if (prev==='peek') return 'half';
            if (prev==='half') return 'full';
            return 'peek';
          })}
        />
        <div className="p-3 overflow-y-auto max-h-[calc(60vh-40px)]">
          <PreviewPane imageUrl={previewUrl} loading={generating} />
        </div>
      </div>
    </div>
  );
}
