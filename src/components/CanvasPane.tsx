import { useEffect, useRef, useState, useCallback } from 'react';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import * as fabric from 'fabric';
import { useBoardGenerate } from '../hooks/useBoardGenerate.js';

// Basic toolbar actions
// Style option definitions
interface StyleOption { id: string; name: string; img: string; }
const STYLE_OPTIONS: StyleOption[] = [
  { id: 'ghibli', name: 'Ghibli', img: '/Style_img/Ghibli Style.png' },
  { id: 'lego', name: 'LEGO', img: '/Style_img/LEGO Style.png' },
  { id: 'popmart', name: 'Pop Mart', img: '/Style_img/Pop Mart Style.png' },
  { id: 'cthulhu', name: 'Cthulhu-Inspired', img: '/Style_img/Cthulhu-Inspired Style.png' },
  { id: 'dnd', name: 'D&D', img: '/Style_img/D&D Style.png' },
  { id: 'ppg', name: 'Powerpuff Girls', img: '/Style_img/Powerpuff Girls Style.png' },
  { id: 'warhammer', name: 'Warhammer', img: '/Style_img/Warhammer Style.png' },
];

interface CanvasPaneProps { onGenerated?: (url: string) => void; onLoadingChange?: (loading:boolean)=>void; }
export function CanvasPane({ onGenerated, onLoadingChange }: CanvasPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'pencil' | 'text' | 'select'>('pencil');
  // style selection state: default first option checked
  const [styleOpen,setStyleOpen]=useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([STYLE_OPTIONS[0].id]);

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

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      }
      if (prev.length >= 2) return prev; // max 2
      return [...prev, id];
    });
  };

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

  const maxChosen = selectedStyles.length >= 2;

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
      // bind change events for history
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
    canvas.on('object:removed', () => saveHistory());
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(reader.result as string).then((img: any) => {
        img.scaleToWidth(200);
        canvas.add(img);
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
          className="ghost-btn bg-white text-gray-700 disabled:opacity-40"
          onClick={undo}
          disabled={pointerRef.current <= 0}
        >↶ Undo</button>
        {/* Style drawer toggle */}
        <button
          className="ghost-btn bg-white text-gray-700"
          onClick={() => setStyleOpen(o=>!o)}
        >✨ Style</button>

          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      {result && (
        <div className="text-green-600 text-sm mt-1">Generated!</div>
      )}
    </div>
      {/* Style picker */}
      <div className={`transition-all duration-300 overflow-x-auto whitespace-nowrap pb-1 ${styleOpen?'max-h-44':'max-h-0'} ${styleOpen?'mt-3':'mt-0'}`}
        style={{visibility: styleOpen ? 'visible':'hidden'}}>
        <div className="flex gap-3">
        {STYLE_OPTIONS.map(opt => {
          const active = selectedStyles.includes(opt.id);
          const disabled = maxChosen && !active;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !disabled && toggleStyle(opt.id)}
              className={`ghost-btn !w-32 !h-32 shrink-0 flex items-center justify-center relative group
                ${active ? 'ring-4 ring-inset ring-cyan-500' : ''}
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

      {/* Generate button */}
      <div className="mb-4 flex justify-end">
        <button
          disabled={loading}
          onClick={() => {
            const styleText = selectedStyles.map(s => `style:${s}`).join(' ');
            generate({ canvas: canvasRef.current, templateId: 'poster', userPrompt: styleText });
          }}
          className="px-4 py-2 rounded bg-cyan-500 text-white disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onContextMenu={openContextMenu}
        className="flex-grow mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white relative"
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
  );
}
