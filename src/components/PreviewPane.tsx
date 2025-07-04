import { useState } from 'react';

interface PreviewPaneProps { imageUrl?: string | null; }

export function PreviewPane({ imageUrl }: PreviewPaneProps) {
  const [size, setSize] = useState(6); // cm

  return (
    <div className="flex flex-col h-full p-4 bg-white">
      <h2 className="text-xl font-semibold mb-4">Preview</h2>

      {/* Image preview */}
      <div className="w-full aspect-square bg-gray-100 border rounded-lg flex items-center justify-center mb-4 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="preview" className="object-contain w-full h-full" />
        ) : (
          <img src="https://placehold.co/300x300?text=Sketch" alt="placeholder" className="object-contain w-full h-full" />
        )}
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

      {/* Price placeholder */}
      <div className="text-3xl font-bold mb-4">$49.00</div>

      {/* Order button (disabled for now) */}
      <button
        disabled
        className="w-full py-2 rounded-md bg-gradient-to-b from-sky-300 to-sky-400 text-white font-medium disabled:opacity-60"
      >
        Order Now
      </button>
    </div>
  );
}
