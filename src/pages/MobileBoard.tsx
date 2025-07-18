import { useState, useEffect } from 'react';
import { CanvasPane } from '../components/CanvasPane.js';
import { PreviewPane } from '../components/PreviewPane.js';

// Very lightweight mobile-oriented page. Reuses existing CanvasPane / PreviewPane
// Layout: vertical flex – top canvas (70vh) bottom panel (30vh)
// Tailwind handles responsive sizing; we assume viewport meta in index.html.
export default function MobileBoard() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // open drawer when generating starts or preview ready
  useEffect(() => {
    if (generating) setDrawerOpen(true);
  }, [generating]);
  useEffect(() => {
    if (previewUrl) setDrawerOpen(true);
  }, [previewUrl]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-white">
      {/* Canvas area */}
      <div className="flex-grow relative">
        <CanvasPane onGenerated={url => setPreviewUrl(url)} onLoadingChange={setGenerating} />
      </div>

      {/* Sliding drawer */}
      <div
        className={`fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-40 bg-white transform transition-transform duration-300 ease-out ${drawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'} flex flex-col h-[100dvh] overflow-y-auto rounded-t-xl shadow-lg`}
      >

        <div className="pt-12 px-3 flex-grow">
          <PreviewPane imageUrl={previewUrl} loading={generating} />
        </div>
      </div>

      {/* Left grip toggle button */}
      <button
        className="fixed left-2 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-50 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center border border-gray-300"
        onClick={() => setDrawerOpen(o=>!o)}
      >
        <span className="block w-5 h-0.5 bg-gray-500 rotate-90" />
      </button>
    </div>
  );
}
