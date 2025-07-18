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
        {/* single central handle – tap to toggle */}
        {/* handle */}
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-6 flex items-center justify-center cursor-pointer z-50"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <div className="w-14 h-1.5 bg-gray-400 rounded-full" />
        </div>
        <div className="pt-12 px-3 flex-grow">
          <PreviewPane imageUrl={previewUrl} loading={generating} />
        </div>
      </div>
    </div>
  );
}
