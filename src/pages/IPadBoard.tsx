import React, { useState } from 'react';
import AuthButtons from '../components/AuthButtons.tsx';
import IPadCanvas from '../components/IPadCanvas.tsx';
import IPadPreview from '../components/IPadPreview.tsx';
import '../styles/ipadBoard.css';

const IPadBoard: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerated = (url: string) => {
    setPreviewUrl(url);
  };

  const handleLoadingChange = (loading: boolean) => {
    setGenerating(loading);
  };

  return (
    <div className="ipad-board">
      {/* 顶部导航 */}
      <header className="ipad-header">
        <AuthButtons />
      </header>

      {/* 主内容区域 */}
      <main className="ipad-main">
        {/* 画布区域 */}
        <section className="ipad-canvas-section">
          <div className="ipad-canvas-container">
            <IPadCanvas 
              onGenerated={handleGenerated}
              onLoadingChange={handleLoadingChange}
            />
          </div>
        </section>

        {/* 预览区域 */}
        <section className="ipad-preview-section">
          <IPadPreview 
            imageUrl={previewUrl}
            loading={generating}
          />
        </section>
      </main>
    </div>
  );
};

export default IPadBoard;
