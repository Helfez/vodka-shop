import React, { useState } from 'react';
import { CanvasPane } from '../components/CanvasPane.js';
import { PreviewPane } from '../components/PreviewPane.js';
import AuthButtons from '../components/AuthButtons.tsx';

const IPadBoard: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  return (
    <div className="w-screen h-screen bg-gray-100 p-4 font-sans flex flex-col"> 
      <header className="flex justify-end mb-2">
        <AuthButtons />
      </header>
      <div className="flex-grow flex items-center justify-center">
        <div className="w-full h-full max-h-[90vh] bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden grid grid-cols-9 gap-0">
          {/* Canvas - 占据更多空间 */}
          <div className="col-span-6 bg-white p-4 flex flex-col">
            <div className="flex-grow">
              <CanvasPane onGenerated={(url:string)=>setPreviewUrl(url)} onLoadingChange={setGenerating} />
            </div>
          </div>
          {/* Preview */}
          <div className="col-span-3 bg-white overflow-hidden">
            <PreviewPane imageUrl={previewUrl} loading={generating} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPadBoard;
