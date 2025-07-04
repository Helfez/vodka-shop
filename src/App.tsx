import { AIAssistantPanel } from './components/AIAssistantPanel.js';
import { CanvasPane } from './components/CanvasPane.js';
import { PreviewPane } from './components/PreviewPane.js';
// @ts-ignore vite handles ts extension
import { FluxTestPage } from './components/FluxTest';
// @ts-ignore vite handles ts extension
import KontextChat from './components/KontextChat';
// @ts-ignore vite handles ts extension
import AiChat from './pages/AiChat';

import { useState } from 'react';
// @ts-ignore vite handles ts extension
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.startsWith('/flux-test')) return <FluxTestPage />;
    if (path.startsWith('/kontext')) return <KontextChat />;
if (path.startsWith('/ai')) return <AiChat />;
  }
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return <LoadingScreen onFinish={() => setLoaded(true)} />;
  }

  return (
    <div className="w-screen h-screen bg-gray-100 p-4 font-sans flex items-center justify-center">
      <div className="w-full h-full max-h-[90vh] bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden grid grid-cols-12 gap-0">

        {/* Left – Chat */}
        <div className="col-span-3 bg-white overflow-hidden border-r border-gray-200">
          <AIAssistantPanel />
        </div>
        {/* Middle – Canvas */}
        <div className="col-span-6 bg-white p-4 flex flex-col">
          
          <div className="flex-grow">
            {/* dynamically imported to avoid SSR issues if any */}
            <CanvasPane onGenerated={(url:string)=>setPreviewUrl(url)} onLoadingChange={setGenerating} />
          </div>
        </div>
        {/* Right – Preview */}
        <div className="col-span-3 bg-white overflow-hidden">
          <PreviewPane imageUrl={previewUrl} loading={generating} />
        </div>
      </div>
    </div>
  );
}

export default App;
