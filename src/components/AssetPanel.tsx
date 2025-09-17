import { useEffect, useState, useCallback } from 'react';

interface AssetPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  used: Set<string>; // urls already inserted
  onRandomPackage?: () => void; // 新增：随机包功能
  canUseRandomPackage?: boolean; // 新增：是否可以使用随机包（画布为空时）
}

type AssetIndex = Record<string, string[]>;

export default function AssetPanel({ open, onClose, onSelect, used, onRandomPackage, canUseRandomPackage = false }: AssetPanelProps) {
  // build index at module init via Vite glob import (eager)
  const index: AssetIndex = ((): AssetIndex => {
    const build = (glob: Record<string, any>) =>
      Object.values(glob) as string[];
    return {
      style: build(import.meta.glob('/src/assets/style/*', { eager: true, import: 'default' } as any)),
      main: build(import.meta.glob('/src/assets/main/*', { eager: true, import: 'default' } as any)),
      prop: build(import.meta.glob('/src/assets/prop/*', { eager: true, import: 'default' } as any)),
      symbol: build(import.meta.glob('/src/assets/symbol/*', { eager: true, import: 'default' } as any)),
      color: build(import.meta.glob('/src/assets/color/*', { eager: true, import: 'default' } as any)),
    };
  })();

  // 只保留 hot 和符文两个分类
  const categories = ['hot', '符文'];
  const [activeCat, setActiveCat] = useState<string>('hot');
  
  // 根据分类获取对应的素材
  const getAssetsForCategory = (category: string) => {
    switch (category) {
      case 'hot':
        return [...index.main, ...index.prop]; // hot 分类显示 main 和 prop 素材
      case '符文':
        return index.symbol; // 符文分类显示 symbol 素材
      default:
        return [];
    }
  };
  
  const assets = getAssetsForCategory(activeCat);

  const handleSelect = useCallback(
    (url: string) => {
      if (used.has(url)) return;
      console.log('AssetPanel select',url); onSelect(url);
    },
    [onSelect, used]
  );



  return (
    <div
      className={`fixed left-0 right-0 bottom-0 h-1/2 z-40 transition-transform duration-300 bg-white/95 backdrop-blur-sm overflow-hidden ${
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
      <div className="flex gap-4 justify-center px-4 py-3 border-b bg-gray-50">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeCat === cat 
                ? 'bg-cyan-500 text-white shadow-md scale-105' 
                : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-sm'
            }`}
          >
            {cat === 'hot' ? '🔥 Hot' : '🔮 符文'}
          </button>
        ))}
      </div>

      {/* assets grid */}
      <div className="p-4 overflow-y-auto h-[calc(100vh-160px)] custom-scrollbar">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {assets.map((file) => {
            const url = file;
            const disabled = used.has(url);
            return (
              <button
                key={file}
                onClick={() => handleSelect(url)}
                disabled={disabled}
                className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  disabled 
                    ? 'opacity-40 cursor-not-allowed border-gray-200' 
                    : 'border-gray-200 hover:border-cyan-400 hover:shadow-lg hover:scale-105 hover:rotate-1'
                }`}
              >
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 p-2">
                  <img
                    src={url}
                    alt={file}
                    className="object-contain w-full h-full pointer-events-none select-none transition-transform duration-200"
                  />
                </div>
                {disabled && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <span className="text-2xl text-green-500">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
