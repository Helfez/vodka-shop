import { AIAssistantPanel } from './components/AIAssistantPanel.js';
import { CanvasPane } from './components/CanvasPane.js';
import { PreviewPane } from './components/PreviewPane.js';
// @ts-ignore vite handles ts extension
import { FluxTestPage } from './components/FluxTest';
// @ts-ignore vite handles ts extension
import KontextChat from './components/KontextChat';
// @ts-ignore vite handles ts extension
import AiChat from './pages/AiChat';
// @ts-ignore vite handles ts extension
import MobileBoard from './pages/MobileBoard';
// 新移动端白板页面
// @ts-ignore vite handles ts extension
import MobileWhiteboard from './pages/MobileWhiteboard';
// @ts-ignore vite handles ts extension
import MobileBoardV2 from './pages/MobileBoardV2';
// @ts-ignore vite handles ts extension
import PipelinePage from './pages/pipeline';
// iPad 端页面
// @ts-ignore vite handles ts extension
import IPadBoard from './pages/IPadBoard';
// Gemini 测试页面
// @ts-ignore vite handles ts extension
import GeminiTest from './pages/GeminiTest';
// Simple Agent 页面
// @ts-ignore vite handles ts extension
import SimpleAgent from './pages/SimpleAgent';
import { useState, useEffect } from 'react';
// @ts-ignore vite handles ts extension
import LoadingScreen from './components/LoadingScreen';
import { useAuth0 } from '@auth0/auth0-react';
import AuthButtons from './components/AuthButtons.tsx';

function App() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect immediately to Auth0 Universal Login
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIPadUA = /iPad|Macintosh/.test(ua) && 'ontouchend' in document;
  const isMobileUA = /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua) && !isIPadUA;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoading) return; // wait until Auth0 handled tokens
    const isMobileScreen = window.matchMedia('(max-width: 768px)').matches;
    const isMobile = (isMobileUA || isMobileScreen) && !isIPadUA;
    const path = window.location.pathname;
    
    // 调试信息
    console.log('Device detection:', {
      ua,
      isIPadUA,
      isMobileUA,
      isMobileScreen,
      isMobile,
      path
    });
    
    // iPad 自动跳转到 iPad 页面（优先级最高）
    if (isIPadUA && path === '/') {
      console.log('Redirecting iPad to /ipad');
      const hash = window.location.hash;
      window.history.replaceState(null, '', '/ipad' + hash);
      return; // 立即返回，避免后续逻辑
    }
    
    // 移动端自动跳转
    if (isMobile &&
        !path.startsWith('/mobile-whiteboard') &&
        !path.startsWith('/mobile-v2') &&
        !path.startsWith('/mobile') &&
        !path.startsWith('/ipad')) {
      console.log('Redirecting mobile to /mobile-whiteboard');
      const hash = window.location.hash;
      window.history.replaceState(null, '', '/mobile-whiteboard' + hash);
    }
  }, [isLoading, isMobileUA, isIPadUA]);

  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.startsWith('/flux-test')) return <FluxTestPage />;
    if (path.startsWith('/kontext')) return <KontextChat />;
    if (path.startsWith('/ai')) return <AiChat />;
    if (path.startsWith('/gemini-test')) return <GeminiTest />;
    if (path.startsWith('/simple-agent')) return <SimpleAgent />;    if (path.startsWith('/ipad')) return <IPadBoard />;
    if (path.startsWith('/mobile-whiteboard')) return <MobileWhiteboard />;
    if (path.startsWith('/mobile-v2')) return <MobileBoardV2 />;
    if (path.startsWith('/mobile')) return <MobileBoard />;
    if (path.startsWith('/pipeline')) return <PipelinePage />;
  }


  if (isLoading) return null;

  if (!isAuthenticated) {
    // While redirecting, render nothing or a placeholder
    return null;
  }

  if (!loaded) {
    return <LoadingScreen onFinish={() => setLoaded(true)} />;
  }

  return (
    <div className="w-screen h-screen bg-gray-100 p-4 font-sans flex flex-col"> 
      <header className="flex justify-end mb-2">
        <AuthButtons />
      </header>
      <div className="flex-grow flex items-center justify-center">
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
  </div> );
}

export default App;
