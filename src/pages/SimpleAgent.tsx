import React, { useEffect, useRef, useState, useCallback } from 'react';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import * as fabric from 'fabric';
import AssetPanel from '../components/AssetPanel.js';

// 珠串数据结构
interface BeadItem {
  id: string;
  name: string;
  imagePath: string;
  price: number;
}

// 模拟珠串数据
const MOCK_BEADS: BeadItem[] = [
  {
    id: 'bead-1',
    name: '淡蓝色珠配珠',
    imagePath: '/beads/pastelbluebeadsbracelet3_740x.webp',
    price: 299
  },
  {
    id: 'bead-2', 
    name: '方形青金石配珠',
    imagePath: '/beads/square1-SodaliteBraceletV_8mm_2.webp',
    price: 399
  },
  {
    id: 'bead-3',
    name: '珍珠配珠',
    imagePath: '/beads/nialaya-men-s-beaded-bracelet-men-s-smiley-face-pearl-bracelet-28501627830344.jpg',
    price: 199
  }
];

const SimpleAgent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'pencil' | 'text' | 'select'>('select');
  
  // Asset panel state
  const [assetOpen, setAssetOpen] = useState(false);
  const [usedAssets, setUsedAssets] = useState(new Set<string>());
  
  // 珠串选择状态
  const [selectedBead, setSelectedBead] = useState<BeadItem | null>(null);
  
  // Agent 设计功能状态
  const [isDesigning, setIsDesigning] = useState(false);
  const [designResult, setDesignResult] = useState<string | null>(null);
  
  // Pen settings
  const COLORS = ['#1f1f1f','#ff4d4f','#fa8c16','#fadb14','#52c41a','#1677ff','#722ed1'];
  const [penColor, setPenColor] = useState(COLORS[0]);
  const [penSize, setPenSize] = useState(4);

  /* ---------------- Undo / Redo history ---------------- */
  const historyRef = useRef<string[]>([]);
  const ignoreRef = useRef(false);
  const [pointer, setPointer] = useState(0);
  const pointerRef = useRef(0);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;visible:boolean}>({x:0,y:0,visible:false});
  const fileInputRef = useRef<HTMLInputElement|null>(null);

  // 重新扫描画布中的图片，生成已用素材集合
  const recomputeUsedAssets = useCallback(() => {
    if (!canvas) return;
    const urls = canvas.getObjects('image')
      .map(o => ((o as any).getSrc?.() || (o as any).src) as string)
      .filter(Boolean);
    setUsedAssets(new Set(urls));
  }, [canvas]);

  const saveHistory = useCallback(() => {
    if (!canvas) return;
    if (ignoreRef.current) return;

    const json = compressToUTF16(JSON.stringify(canvas.toJSON()));
    const base = historyRef.current.slice(0, pointerRef.current + 1);
    let newHist = [...base, json];
    if (newHist.length > 20) newHist = newHist.slice(newHist.length - 20);
    historyRef.current = newHist;
    pointerRef.current = newHist.length - 1;
    setPointer(pointerRef.current);
  }, [canvas]);

  // Pen settings update
  useEffect(() => {
    if (!canvas) return;
    const brush = canvas.freeDrawingBrush as fabric.PencilBrush;
    brush.color = penColor;
    brush.width = penSize;
  }, [penColor, penSize, canvas]);

  // Context menu handlers
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

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const fabricCanvas = new fabric.Canvas(canvasRef.current!, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: true,
      allowTouchScrolling: true,
      enableRetinaScaling: true,
      uniformScaling: false,
      uniScaleTransform: false,
    });

    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.color = '#000000';
    fabricCanvas.freeDrawingBrush.width = 2;

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

    setCanvas(fabricCanvas);
    historyRef.current = [compressToUTF16(JSON.stringify(fabricCanvas.toJSON()))];
    pointerRef.current = 0;
    setPointer(0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      fabricCanvas.dispose();
    };
  }, []);

  // Save history on canvas changes
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

  // Undo functionality
  const canUndo = pointerRef.current > 0;
  const undo = useCallback(() => {
    if (!canvas || pointerRef.current <= 0) return;
    
    const idx = pointerRef.current - 1;
    if (idx < 0) return;
    const json = decompressFromUTF16(historyRef.current[idx]);
    ignoreRef.current = true;
    canvas.loadFromJSON(json as any, () => {
      canvas.setViewportTransform([1,0,0,1,0,0]);
      canvas.forEachObject(obj => obj.setCoords());
      canvas.requestRenderAll();
      recomputeUsedAssets();
      setPointer(() => {
        const nxt = idx;
        pointerRef.current = nxt;
        return nxt;
      });
      const release = () => { ignoreRef.current = false; canvas?.off('mouse:down', release); };
      canvas?.on('mouse:down', release);
    });
  }, [canvas, canUndo]);

  // Global keyboard shortcut for Undo
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

  // Canvas resize observer
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

  // Image animation
  const animateIn = (obj: fabric.Object) => {
    if (!canvas) return;
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

  // Check if canvas is empty
  const isCanvasEmpty = useCallback(() => {
    if (!canvas) return true;
    return canvas.getObjects().length === 0;
  }, [canvas]);

  // Random package handler
  const handleRandomPackage = useCallback(() => {
    if (!canvas || !isCanvasEmpty()) return;
    
    const buildAssetIndex = (glob: Record<string, any>) => Object.values(glob) as string[];
    const assetGroups = {
      style: buildAssetIndex(import.meta.glob('/src/assets/style/*', { eager: true, import: 'default' } as any)),
      main: buildAssetIndex(import.meta.glob('/src/assets/main/*', { eager: true, import: 'default' } as any)),
      prop: buildAssetIndex(import.meta.glob('/src/assets/prop/*', { eager: true, import: 'default' } as any)),
      symbol: buildAssetIndex(import.meta.glob('/src/assets/symbol/*', { eager: true, import: 'default' } as any)),
      color: buildAssetIndex(import.meta.glob('/src/assets/color/*', { eager: true, import: 'default' } as any)),
    };
    
    const selectedImages: string[] = [];
    Object.values(assetGroups).forEach(group => {
      if (group.length > 0) {
        const randomIndex = Math.floor(Math.random() * group.length);
        selectedImages.push(group[randomIndex]);
      }
    });
    
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight * 0.35;
    
    const imageSize = 120;
    const spacing = 140;
    const totalWidth = (selectedImages.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;
    
    selectedImages.forEach((url, index) => {
      const x = startX + index * spacing;
      const y = centerY + (index % 2 === 0 ? -20 : 20);
      
      fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
        if (!img) return;
        
        img.scaleToWidth(imageSize);
        img.set({
          left: x,
          top: y,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.45)', blur: 15, offsetX: 0, offsetY: 6 }),
          angle: (Math.random() * 10 - 5),
          lockMovementX: false,
          lockMovementY: false,
          lockScalingX: false,
          lockScalingY: false,
          lockRotation: false,
          touchCornerSize: 24,
          cornerSize: 12,
          transparentCorners: false,
          cornerColor: '#00bcd4',
          cornerStrokeColor: '#ffffff',
          borderColor: '#00bcd4',
          minScaleLimit: 0.1,
          maxScaleLimit: 5
        });
        
        canvas.add(img);
        animateIn(img);
        canvas.setViewportTransform([1,0,0,1,0,0]);
        canvas.forEachObject(obj => obj.setCoords());
        canvas.requestRenderAll();
        
        setUsedAssets(prev => {
          const next = new Set(prev);
          next.add(url);
          return next;
        });
      });
    });
    
    setTimeout(() => {
      saveHistory();
    }, 100);
  }, [canvas, isCanvasEmpty, saveHistory]);

  // Add asset handler
  const handleAddAsset = (url: string) => {
    if (!canvas) return;
    if (usedAssets.has(url)) return;

    fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
      if (!img) return;
      img.scaleToWidth(200);
      
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const topAreaY = canvasHeight * 0.15;
      const centerX = canvasWidth / 2;
      
      img.set({
        left: centerX - 100,
        top: topAreaY,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.45)', blur: 15, offsetX: 0, offsetY: 6 }),
        angle: (Math.random() * 10 - 5),
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        touchCornerSize: 24,
        cornerSize: 12,
        transparentCorners: false,
        cornerColor: '#00bcd4',
        cornerStrokeColor: '#ffffff',
        borderColor: '#00bcd4',
        minScaleLimit: 0.1,
        maxScaleLimit: 5
      });
      
      canvas.add(img);
      animateIn(img);
      (canvas as any).setActiveObject?.(img);
      canvas.setViewportTransform([1,0,0,1,0,0]);
      canvas.forEachObject(obj => obj.setCoords());
      canvas.requestRenderAll();
      saveHistory();
      setUsedAssets(prev => {
        const next = new Set(prev);
        next.add(url);
        return next;
      });
    });
  };

  // Upload handler
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
          angle: (Math.random() * 10 - 5)
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

  // 将图片URL转换为base64的辅助函数
  const imageToBase64 = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        try {
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = imageSrc;
    });
  };

  // Agent 设计功能
  const handleDesign = async () => {
    if (!canvas || !selectedBead) {
      alert('请先选择一个配珠！');
      return;
    }

    setIsDesigning(true);
    setDesignResult(null);

    try {
      // 获取白板快照
      const whiteboardDataURL = canvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 1
      });

      // 将商品图片转换为base64
      const productImageBase64 = await imageToBase64(selectedBead.imagePath);

      // 调用 Agent API
      const response = await fetch('/api/design-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whiteboardImage: whiteboardDataURL,
          productImage: productImageBase64,
          node: '1-1',
          task: 'devdesign'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // 适配新的API响应格式
      if (result.success) {
        setDesignResult(result.result);
      } else {
        throw new Error(result.error || '设计分析失败');
      }
      
    } catch (error) {
      console.error('设计分析失败:', error);
      const errorMessage = error instanceof Error ? error.message : '设计分析失败，请重试！';
      alert(errorMessage);
    } finally {
      setIsDesigning(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-100 p-4 font-sans flex flex-col">
      <header className="flex justify-center items-center mb-2">
        <h1 className="text-xl font-bold text-gray-900">🤖 Simple Agent</h1>
      </header>

      <div className="flex-grow flex gap-4">
        {/* 左侧珠串选择区域 - 1/4 */}
        <div className="w-1/4 bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">配珠选择</h2>
            {selectedBead && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  已选择: <span className="font-medium">{selectedBead.name}</span>
                </p>
                <p className="text-xs text-blue-600">¥{selectedBead.price}</p>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {MOCK_BEADS.map((bead) => (
                <div
                  key={bead.id}
                  onClick={() => setSelectedBead(bead)}
                  className={`cursor-pointer rounded-lg border-2 p-2 transition-all hover:shadow-md ${
                    selectedBead?.id === bead.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="aspect-square mb-2 overflow-hidden rounded-md bg-gray-100">
                    <img
                      src={bead.imagePath}
                      alt={bead.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xs font-medium text-gray-900 mb-1 truncate">
                      {bead.name}
                    </h3>
                    <p className="text-sm font-semibold text-blue-600">
                      ¥{bead.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧白板区域 - 3/4 */}
        <div className="w-3/4 bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="pill-panel flex gap-3 items-center px-6 py-3 border-b border-gray-200">
          <button
            className={`ghost-btn ${activeTool === 'pencil' ? 'ghost-btn-active' : 'bg-white text-gray-700'}`}
            onClick={() => setActiveTool('pencil')}
          >
            ✏️
          </button>
          <button
            className={`ghost-btn ${activeTool === 'text' ? 'ghost-btn-active' : 'bg-white text-gray-700'}`}
            onClick={() => setActiveTool('text')}
          >
            T
          </button>
          <label className="ghost-btn bg-white text-gray-700 cursor-pointer">
            📷
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          <button
            className={`ghost-btn ${activeTool === 'select' ? 'ghost-btn-active' : 'bg-white text-gray-700'}`}
            onClick={() => setActiveTool('select')}
          >
            🖱️
          </button>

          <button
            className="ghost-btn bg-white text-gray-500 disabled:opacity-40"
            onClick={undo}
            disabled={pointerRef.current <= 0}
          >
            ↶
          </button>

          <button
            className={`w-16 h-16 rounded-full bg-green-500 text-white shadow-lg flex flex-col items-center justify-center transition-all duration-200 hover:rotate-3 hover:scale-110 ${isDesigning ? 'ring-4 ring-green-300 animate-pulse' : ''}`}
            onClick={handleDesign}
            disabled={!selectedBead || isDesigning}
          >
            {isDesigning ? (
              <>
                <span className="text-lg">⏳</span>
                <span className="text-xs font-medium">分析中</span>
              </>
            ) : (
              <>
                <span className="text-lg">🎨</span>
                <span className="text-xs font-medium">设计</span>
              </>
            )}
          </button>

          <button
            className={`w-16 h-16 rounded-full bg-cyan-500 text-white shadow-lg flex flex-col items-center justify-center transition-all duration-200 hover:rotate-4 hover:scale-110 ${assetOpen ? 'ring-4 ring-cyan-300' : ''}`}
            onClick={() => setAssetOpen(true)}
          >
            <span className="text-lg">🖼️</span>
            <span className="text-xs font-medium">素材</span>
          </button>
        </div>

        {/* Pen settings panel */}
        <div className={`transition-all duration-300 overflow-hidden border-b border-gray-200 ${activeTool === 'pencil' ? 'max-h-20' : 'max-h-0'}`}
          style={{ visibility: activeTool === 'pencil' ? 'visible' : 'hidden' }}>
          <div className="flex items-center gap-3 px-4 py-2">
            {COLORS.map(c =>
              <button key={c} className={`w-6 h-6 rounded-full border-2 ${penColor === c ? 'border-cyan-500' : 'border-white'}`} style={{ background: c }}
                onClick={() => setPenColor(c)} />
            )}
            <input type="range" min={2} max={20} value={penSize} onChange={e => setPenSize(Number(e.target.value))} className="flex-grow" />
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          onContextMenu={openContextMenu}
          className="flex-grow border-gray-300 overflow-hidden bg-white relative"
        >
          <canvas ref={canvasRef} className="w-full h-full block" style={{ height: '100%', width: '100%' }} />
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
        </div>
      </div>

      {/* 设计结果显示区域 */}
      {designResult && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
              🎨 设计分析结果
              <button 
                onClick={() => setDesignResult(null)}
                className="ml-auto text-sm text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </h3>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500">
              <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
                {designResult}
              </pre>
            </div>
          </div>
        </div>
      )}

      <AssetPanel
        open={assetOpen}
        onClose={() => setAssetOpen(false)}
        onSelect={handleAddAsset}
        used={usedAssets}
        onRandomPackage={handleRandomPackage}
        canUseRandomPackage={isCanvasEmpty()}
      />
    </div>
  );
};

export default SimpleAgent;
