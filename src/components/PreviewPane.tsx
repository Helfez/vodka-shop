import { useState, useRef, useEffect } from 'react';
import lottieWeb from 'lottie-web';
import ShopifyBuyButton from './ShopifyBuyButton.tsx';

interface PreviewPaneProps {
  imageUrl?: string | null;
  loading?: boolean;
}

export function PreviewPane({ imageUrl, loading = false }: PreviewPaneProps) {
  const [size, setSize] = useState(6); // cm

  return (
    <div className="flex flex-col h-full p-4 bg-white">
      <h2 className="text-xl font-semibold mb-4">Preview</h2>

      {/* Image preview */}
      <div className="w-full aspect-square bg-gray-100 border rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
        {imageUrl ? (
          <img src={imageUrl} alt="preview" className="object-contain w-full h-full" />
        ) : (
          <img src="https://placehold.co/300x300?text=Sketch" alt="placeholder" className="object-contain w-full h-full" />
        )}
        {loading && <LoadingOverlay />}
        {/* Progress bar */}
        {loading && <div className="loading-bar" />}
      </div>

      {/* Size control */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
        <input
          type="range"
          min={5}
          max={10}
          step={0.5}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>5&nbsp;cm</span>
          <span>10&nbsp;cm</span>
        </div>
      </div>

      {/* Shopify buy button */}
      {imageUrl && !loading ? (
        <ShopifyBuyButton imageUrl={imageUrl} />
      ) : (
        <button disabled className="w-full py-3 bg-gray-400 text-white rounded opacity-60 cursor-not-allowed">Buy now</button>
      )}
    </div>
  );
}

function LoadingOverlay() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const anim = lottieWeb.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/Animation - loading.json',
    });
    return () => anim.destroy();
  }, []);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
      <div ref={ref} className="w-24 h-24" />
    </div>
  );
}
