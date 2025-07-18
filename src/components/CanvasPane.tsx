import { useEffect, useRef, useState, useCallback } from 'react';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import AssetPanel from './AssetPanel.js';
import * as fabric from 'fabric';
import { useBoardGenerate } from '../hooks/useBoardGenerate.js';
import { THEME_BRANCH } from '../pipelinePrompts.js';

// Basic toolbar actions
// Style option definitions
interface StyleOption { id: string; name: string; img: string; }
const STYLE_OPTIONS: StyleOption[] = [
  { id: 'nomoral', name: 'Normal', img: '/Style_img/normal.PNG' },
  { id: 'PowerGirls', name: 'PowerGirls', img: '/Style_img/powergirl.PNG' },
  { id: 'WearableSculpture', name: 'Wearable Sculpture', img: '/Style_img/body.PNG' },
];

interface CanvasPaneProps { onGenerated?: (url: string) => void; onLoadingChange?: (loading:boolean)=>void; }
export function CanvasPane({ onGenerated, onLoadingChange }: CanvasPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'pencil' | 'text' | 'select'>('select');
  // style selection state: default first option checked
  // 主题选择现在常驻显示，不再需要 styleOpen 和 styleHint 状态
  // theme selection state: default to first theme
  const [selectedTheme, setSelectedTheme] = useState<string>('nomoral');
  // asset panel state
  const [assetOpen,setAssetOpen]=useState(false);
  const [usedAssets,setUsedAssets]=useState(new Set<string>());
  // 已移除 styleHint 相关的 useEffect，不再需要
  // 重新扫描画布中的图片，生成已用素材集合
  const recomputeUsedAssets = useCallback(() => {
    if (!canvas) return;
    const urls = canvas.getObjects('image')
      .map(o => ((o as any).getSrc?.() || (o as any).src) as string)
      .filter(Boolean);
    setUsedAssets(new Set(urls));
  }, [canvas]);

  /* ---------------- Undo / Redo history ---------------- */
  const historyRef = useRef<string[]>([]);
  const ignoreRef = useRef(false);
  const [pointer, setPointer] = useState(0);
  const pointerRef = useRef(0);
  

  const saveHistory = useCallback(() => {
    if (!canvas) return;
    if (ignoreRef.current) return;

    const json = compressToUTF16(JSON.stringify(canvas.toJSON()));
    const base = historyRef.current.slice(0, pointerRef.current + 1);
    let newHist = [...base, json];
    if (newHist.length > 20) newHist = newHist.slice(newHist.length - 20);
    historyRef.current = newHist;
    pointerRef.current = newHist.length -1;
    setPointer(pointerRef.current);
    console.log('historyLen now', historyRef.current.length);
  }, [canvas, pointer]);

  // AI generation hook
  const { generate, loading, error, result } = useBoardGenerate();

  // Notify parent when result changes
  useEffect(() => {
    if (result?.imageUrl && onGenerated) onGenerated(result.imageUrl);
  }, [result, onGenerated]);

  // report loading state
  useEffect(() => { onLoadingChange?.(loading); }, [loading, onLoadingChange]);

  // pen settings
  const COLORS = ['#ff4d4f','#fa8c16','#fadb14','#52c41a','#1677ff','#722ed1','#1f1f1f'];
  const [penColor,setPenColor]=useState(COLORS[0]);
  const [penSize,setPenSize]=useState(4);

  useEffect(()=>{
    if(!canvas) return;
    const brush = canvas.freeDrawingBrush as fabric.PencilBrush;
    brush.color = penColor;
    brush.width = penSize;
  },[penColor,penSize,canvas]);

  const chooseTheme = (id: string) => setSelectedTheme(id);

  // ---------------- Context Menu ----------------
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;visible:boolean}>({x:0,y:0,visible:false});
  const fileInputRef = useRef<HTMLInputElement|null>(null);

  const openContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  };
  const closeContextMenu = () => setContextMenu(v => ({ ...v, visible: false }));

  useEffect(() => {
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const menuUpload = () => {
    fileInputRef.current?.click();
    closeContextMenu();
  };
  const menuAddText = () => {
    if (!canvas) return;
    const text = window.prompt('Enter text');
    if (text) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const left = contextMenu.x - (rect?.left ?? 0);
      const top = contextMenu.y - (rect?.top ?? 0);
      const itext = new fabric.IText(text, { left, top, fontSize: 24, fill: '#000' });
      canvas.add(itext);
      canvas.setActiveObject(itext);
      canvas.setViewportTransform([1,0,0,1,0,0]);
      canvas.forEachObject(obj => obj.setCoords());
      canvas.requestRenderAll();
      saveHistory();
    }
    closeContextMenu();
  };

  // Theme selection is single choice, no max limit needed
  const disabled = loading; // Disable theme selection during generation

  // Initialise Fabric.js once
  useEffect(() => {
    if (!canvasRef.current) return;
    const fabricCanvas = new fabric.Canvas(canvasRef.current!, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: true,
    });

    // Pencil style resembling sketch
    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.color = '#000000';
    fabricCanvas.freeDrawingBrush.width = 2;

    // Fit canvas to container width initially
    const resizeCanvas = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        fabricCanvas.setWidth(width);
        fabricCanvas.setHeight(height);
        fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
        fabricCanvas.forEachObject(obj => obj.setCoords());
        fabricCanvas.requestRenderAll();
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    console.log('Fabric canvas initialised');
    setCanvas(fabricCanvas);
      // save initial snapshot
      
      historyRef.current = [compressToUTF16(JSON.stringify(fabricCanvas.toJSON()))];
      pointerRef.current = 0;
      setPointer(0);
      const release = () => {  console.log('history recording re-enabled'); ignoreRef.current = false; canvas?.off('mouse:down', release); };
      canvas?.on('mouse:down', release);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      fabricCanvas.dispose();
    };

  }, []);

  // save snapshot on finalized changes: completed drawings and non-drawing additions
  useEffect(() => {
    if (!canvas) return;
    const handlePath = () => saveHistory();
    const handleAdded = (e: any) => {
      if (e?.target?.type !== 'path') saveHistory();
    };
    canvas.on('path:created', handlePath);
    canvas.on('object:added', handleAdded);
    canvas.on('object:modified', handleAdded);
    canvas.on('object:removed', () => { saveHistory(); recomputeUsedAssets(); });
    return () => {
      canvas.off('path:created', handlePath);
      canvas.off('object:added', handleAdded);
      canvas.off('object:modified', handleAdded);
      canvas.off('object:removed', () => saveHistory());
    };
  }, [canvas, saveHistory]);

  // Undo helpers
  const canUndo = pointerRef.current > 0;

  const undo = useCallback(() => {
    console.log('UNDO pressed', { pointer: pointerRef.current, historyLen: historyRef.current.length });
    if (!canvas || pointerRef.current<=0) return;
    
    const idx = pointerRef.current - 1;
    if (idx < 0) return;
    const json = decompressFromUTF16(historyRef.current[idx]);
    ignoreRef.current = true;
    canvas.loadFromJSON(json as any, () => {
      const objs = canvas.getObjects();
      console.log('after load objects', objs.length, objs.map(o => ({type:o.type,left:o.left,top:o.top,width:o.width,height:o.height,visible:o.visible})) );
      canvas.setViewportTransform([1,0,0,1,0,0]);
      canvas.forEachObject(obj => obj.setCoords());
      canvas.requestRenderAll();
      recomputeUsedAssets();
      setPointer(() => {
        const nxt = idx;
        pointerRef.current = nxt;
        return nxt;
      });
      const release = () => {  console.log('history recording re-enabled'); ignoreRef.current = false; canvas?.off('mouse:down', release); };
      canvas?.on('mouse:down', release);
    });
  }, [canvas, canUndo]);

  // global keyboard shortcut for Undo only
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [undo]);

  // Sync tool changes
  useEffect(() => {
    if (!canvas) return;
    if (activeTool === 'pencil') {
      canvas.isDrawingMode = true;
    } else {
      canvas.isDrawingMode = false;
      if (activeTool === 'text') {
        const textbox = new fabric.Textbox('Text', {
          left: 50,
          top: 50,
          fontSize: 24,
          editable: true,
        });
        canvas.add(textbox);
        (canvas as any).setActiveObject?.(textbox);
      }
    }
    canvas.forEachObject(obj => obj.setCoords());
    canvas.requestRenderAll();
  }, [activeTool, canvas]);

  // keep canvas width and height in sync with container element
  useEffect(() => {
    if (!containerRef.current || !canvas) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        canvas.setWidth(cr.width);
        canvas.setHeight(cr.height);
        canvas.setViewportTransform([1,0,0,1,0,0]);
        canvas.forEachObject(obj => obj.setCoords());
        canvas.requestRenderAll();
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [canvas]);

  // 图片进入动画
const animateIn = (obj: fabric.Object) => {
  if(!canvas) return;
  const { scaleX = 1, scaleY = 1 } = obj;
  obj.set({ scaleX: 0.1, scaleY: 0.1 });
  canvas.requestRenderAll();
  obj.animate({ scaleX }, {
    duration: 400,
    onChange: canvas.renderAll.bind(canvas),
    easing: fabric.util.ease.easeOutBack,
  });
  obj.animate({ scaleY }, {
    duration: 400,
    onChange: canvas.renderAll.bind(canvas),
    easing: fabric.util.ease.easeOutBack,
  });
};

// 检测画布是否为空（没有任何对象）
const isCanvasEmpty = useCallback(() => {
  if (!canvas) return true;
  return canvas.getObjects().length === 0;
}, [canvas]);

// 随机选择每个分组一张图片并插入到画板
const handleRandomPackage = useCallback(() => {
  if (!canvas || !isCanvasEmpty()) return;
  
  // 构建所有分组的图片索引
  const buildAssetIndex = (glob: Record<string, any>) => Object.values(glob) as string[];
  const assetGroups = {
    style: buildAssetIndex(import.meta.glob('/src/assets/style/*', { eager: true, import: 'default' } as any)),
    main: buildAssetIndex(import.meta.glob('/src/assets/main/*', { eager: true, import: 'default' } as any)),
    prop: buildAssetIndex(import.meta.glob('/src/assets/prop/*', { eager: true, import: 'default' } as any)),
    symbol: buildAssetIndex(import.meta.glob('/src/assets/symbol/*', { eager: true, import: 'default' } as any)),
    color: buildAssetIndex(import.meta.glob('/src/assets/color/*', { eager: true, import: 'default' } as any)),
  };
  
  // 从每个分组随机选择一张图片
  const selectedImages: string[] = [];
  Object.values(assetGroups).forEach(group => {
    if (group.length > 0) {
      const randomIndex = Math.floor(Math.random() * group.length);
      selectedImages.push(group[randomIndex]);
    }
  });
  
  // 计算画布中心偏上的位置
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight * 0.35; // 中心偏上
  
  // 计算每张图片的位置，避免重叠 - 调整为更紧凑的布局
  const imageSize = 120; // 减小图片尺寸
  const spacing = 140; // 减小间距
  const totalWidth = (selectedImages.length - 1) * spacing;
  const startX = centerX - totalWidth / 2;
  
  // 依次插入每张图片
  selectedImages.forEach((url, index) => {
    const x = startX + index * spacing;
    const y = centerY + (index % 2 === 0 ? -20 : 20); // 减小交错幅度
    
    fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
      if (!img) {
        console.error('fabric load failed', url);
        return;
      }
      
      img.scaleToWidth(imageSize); // 使用调整后的尺寸
      img.set({
        left: x,
        top: y,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.45)', blur: 15, offsetX: 0, offsetY: 6 }),
        angle: (Math.random() * 10 - 5)
      });
      
      canvas.add(img);
      animateIn(img);
      canvas.setViewportTransform([1,0,0,1,0,0]);
      canvas.forEachObject(obj => obj.setCoords());
      canvas.requestRenderAll();
      
      // 更新已使用的资产
      setUsedAssets(prev => {
        const next = new Set(prev);
        next.add(url);
        return next;
      });
    });
  });
  
  // 保存历史记录
  setTimeout(() => {
    saveHistory();
  }, 100);
  
  console.log('Random package inserted:', selectedImages.length, 'images');
}, [canvas, isCanvasEmpty, saveHistory]);

const handleAddAsset = (url: string) => {
    console.log('handleAddAsset called', url, 'canvas?', canvas, 'used?', usedAssets.has(url));
    if (!canvas) return;
    if (usedAssets.has(url)) return;
    console.log('handleAddAsset start',url);
fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
      if(!img){console.error('fabric load failed',url);return;}
      img.scaleToWidth(200);
      
      // 计算画布顶部位置，避免被素材包抽屉遮挡
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const topAreaY = canvasHeight * 0.15; // 顶部区域，避免被抽屉遮挡
      const centerX = canvasWidth / 2;
      
      img.set({
        left: centerX - 100, // 居中显示
        top: topAreaY,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.45)', blur: 15, offsetX: 0, offsetY: 6 }),
        angle: (Math.random() * 10 - 5)
      });
      
      canvas.add(img);
      animateIn(img);
      (canvas as any).setActiveObject?.(img);
      canvas.setViewportTransform([1,0,0,1,0,0]);
      canvas.forEachObject(obj=>obj.setCoords());
      canvas.requestRenderAll();
      saveHistory();
      setUsedAssets(prev => {
        const next = new Set(prev);
        next.add(url);
        return next;
      });
console.log('handleAddAsset done');
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(reader.result as string).then((img: any) => {
        img.scaleToWidth(200);
        img.set({
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.45)', blur: 15, offsetX: 0, offsetY: 6 }),
          angle: (Math.random() * 10 - 5) // -5° ~ +5°
        });
        canvas.add(img);
        animateIn(img);
        (canvas as any).centerObject?.(img);
        (canvas as any).setActiveObject?.(img);
        canvas.setViewportTransform([1,0,0,1,0,0]);
        canvas.forEachObject(obj => obj.setCoords());
        canvas.requestRenderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="pill-panel flex gap-3 items-center px-6 py-3 mb-3">
        <button
          className={`ghost-btn ${activeTool==='pencil' ? 'ghost-btn-active' : 'bg-white text-gray-700'}`}
          onClick={() => setActiveTool('pencil')}
        >
          ✏️
        </button>
        <button
          className={`ghost-btn ${activeTool==='text' ? 'ghost-btn-active' : 'bg-white text-gray-700'}`}
          onClick={() => setActiveTool('text')}
        >
          T
        </button>
        <label className="ghost-btn bg-white text-gray-700 cursor-pointer">
          📷
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
        <button
          className={`ghost-btn ${activeTool==='select' ? 'ghost-btn-active' : 'bg-white text-gray-700'}`}
          onClick={() => setActiveTool('select')}
        >
          🖱️
        </button>

        {/* Undo button */}
        <button
          className="ghost-btn bg-white text-gray-500 disabled:opacity-40"
          onClick={undo}
          disabled={pointerRef.current <= 0}
        >↶</button>
        {/* Asset Pack button */}
        <button
          className={`w-14 h-14 rounded-full bg-cyan-500 text-white shadow-lg flex items-center justify-center ${assetOpen?'ring-4 ring-cyan-300':''}`}
          onClick={()=>setAssetOpen(true)}
        >🖼️</button>
        {/* 主题选择按钮已移除，现在常驻显示 */}

          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      {result && (
        <div className="text-green-600 text-sm mt-1">Generated!</div>
      )}
    </div>
      {/* Pen settings panel */}
      <div className={`transition-all duration-300 overflow-hidden ${activeTool==='pencil'?'max-h-20':'max-h-0'}`}
        style={{visibility:activeTool==='pencil'?'visible':'hidden'}}>
        <div className="flex items-center gap-3 px-4 py-2">
          {COLORS.map(c=>
            <button key={c} className={`w-6 h-6 rounded-full border-2 ${penColor===c?'border-cyan-500':'border-white'}`} style={{background:c}}
              onClick={()=>setPenColor(c)}/>
          )}
          <input type="range" min={2} max={20} value={penSize} onChange={e=>setPenSize(Number(e.target.value))} className="flex-grow"/>
        </div>
      </div>

      {/* Style picker - 现在常驻显示 */}
      <div className="overflow-x-auto whitespace-nowrap pb-1 mt-3">
        <div className="flex gap-3">
        {STYLE_OPTIONS.map(opt => {
          const active = selectedTheme===opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !disabled && chooseTheme(opt.id)}
              className={`ghost-btn !w-32 !h-32 shrink-0 flex items-center justify-center relative group transition transform
                ${active ? 'ring-4 ring-inset ring-cyan-500' : 'hover:ring-2 hover:ring-cyan-400'}
                ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <img src={opt.img} alt={opt.name} className="w-28 h-28 object-contain pointer-events-none" />
              <div className="absolute bottom-1 left-0 right-0 text-center text-xs text-white bg-black/60 rounded opacity-0 group-hover:opacity-100 pointer-events-none select-none">
                {opt.name}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onContextMenu={openContextMenu}
        className="flex-grow mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white relative"
      >
        <canvas ref={canvasRef} className="w-full h-full block" style={{ height: '100%', width: '100%' }} />
        {/* Generate FAB inside canvas */}
        <button
          disabled={loading}
          onClick={() => {
            // Use selected theme for generation
            generate({ 
              canvas: canvasRef.current, 
              templateId: selectedTheme,
              branch: THEME_BRANCH[selectedTheme] || false
            });
          }}
          className={`absolute top-2 left-2 z-20 w-10 h-10 rounded-full text-lg shadow-md flex items-center justify-center transition-colors ${loading?'bg-gray-300 text-gray-500':'bg-cyan-500 text-white hover:bg-cyan-600'}`}
        >⚡</button>
        {contextMenu.visible && (
          <ul
            className="absolute bg-white border rounded shadow-md z-50 text-sm"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={e => e.preventDefault()}
          >
            <li className="px-3 py-1 hover:bg-gray-100 cursor-pointer" onClick={menuUpload}>📷 Upload Image</li>
            <li className="px-3 py-1 hover:bg-gray-100 cursor-pointer" onClick={menuAddText}>T Add Text</li>
            <li className="px-3 py-1 hover:bg-gray-100 cursor-pointer" onClick={() => { undo(); closeContextMenu(); }}>↶ Undo</li>
          </ul>
        )}
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleUpload} />
      </div>
        
      <AssetPanel
        open={assetOpen}
        onClose={()=>setAssetOpen(false)}
        onSelect={handleAddAsset}
        used={usedAssets}
        onRandomPackage={handleRandomPackage}
        canUseRandomPackage={isCanvasEmpty()}
      />
    </div>
  );
}
