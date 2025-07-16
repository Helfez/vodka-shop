import { useEffect, useState, useCallback } from 'react';

interface AssetPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  used: Set<string>; // urls already inserted
}

interface AssetIndex {
  [category: string]: string[];
}

export default function AssetPanel({ open, onClose, onSelect, used }: AssetPanelProps) {
  const [index, setIndex] = useState<AssetIndex>({});
  const [activeCat, setActiveCat] = useState<string>('');

  // fetch index lazy
  useEffect(() => {
    if (!open || Object.keys(index).length) return;
    fetch('/assets/assets.json')
      .then((r) => r.json())
      .then((data: AssetIndex) => {
        setIndex(data);
        setActiveCat(Object.keys(data)[0] ?? '');
      })
      .catch((e) => console.error('fetch assets.json error', e));
  }, [open, index]);

  const handleSelect = useCallback(
    (url: string) => {
      if (used.has(url)) return;
      onSelect(url);
    },
    [onSelect, used]
  );

  const categories = Object.keys(index);
  const assets = activeCat ? index[activeCat] ?? [] : [];

  return (
    <div
      className={`fixed inset-0 z-40 transition-transform duration-300 bg-white/95 backdrop-blur-sm overflow-hidden ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-lg font-semibold">素材包</h3>
        <button onClick={onClose} className="text-2xl">
          ×
        </button>
      </div>

      {/* categories tabs */}
      <div className="flex gap-3 overflow-x-auto px-4 py-2 border-b">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-sm ${
              activeCat === cat ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* assets grid (simple flex wrap, can upgrade to react-window later) */}
      <div className="p-4 overflow-y-auto h-[calc(100vh-160px)] custom-scrollbar">
        <div className="grid grid-cols-3 gap-3">
          {assets.map((file) => {
            const url = `/assets/${activeCat}/${file}`;
            const disabled = used.has(url);
            return (
              <button
                key={file}
                onClick={() => handleSelect(url)}
                disabled={disabled}
                className={`relative w-full aspect-square rounded-lg overflow-hidden border ${
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:ring-2 hover:ring-cyan-400'
                }`}
              >
                <img
                  src={url}
                  alt={file}
                  className="object-contain w-full h-full pointer-events-none select-none"
                />
                {disabled && (
                  <span className="absolute inset-0 bg-white/60 flex items-center justify-center text-xl">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
