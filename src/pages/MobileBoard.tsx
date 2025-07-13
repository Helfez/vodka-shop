import { useState } from 'react';
import { CanvasPane } from '../components/CanvasPane.js';
import { PreviewPane } from '../components/PreviewPane.js';

// Very lightweight mobile-oriented page. Reuses existing CanvasPane / PreviewPane
// Layout: vertical flex – top canvas (70vh) bottom panel (30vh)
// Tailwind handles responsive sizing; we assume viewport meta in index.html.
export default function MobileBoard() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-white">
      {/* Canvas area */}
      <div className="flex-grow relative">
        <CanvasPane onGenerated={url => setPreviewUrl(url)} onLoadingChange={setGenerating} />
      </div>

      {/* Bottom panel – preview & actions */}
      <div className="h-[30vh] max-h-60 border-t border-gray-200 p-2 overflow-hidden">
        <PreviewPane imageUrl={previewUrl} loading={generating} />
      </div>
    </div>
  );
}
