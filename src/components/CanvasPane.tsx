import { useEffect, useRef, useState } from 'react';
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

export function CanvasPane() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'pencil' | 'text' | 'select'>('pencil');
  // style selection state: default first option checked
  const [selectedStyles, setSelectedStyles] = useState<string[]>([STYLE_OPTIONS[0].id]);

  // AI generation hook
  const { generate, loading, error, result } = useBoardGenerate();

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      }
      if (prev.length >= 2) return prev; // max 2
      return [...prev, id];
    });
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
        fabricCanvas.renderAll();
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setCanvas(fabricCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      fabricCanvas.dispose();
    };
  }, []);

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
    canvas.renderAll();
  }, [activeTool, canvas]);

  // keep canvas width and height in sync with container element
  useEffect(() => {
    if (!containerRef.current || !canvas) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        canvas.setWidth(cr.width);
        canvas.setHeight(cr.height);
        canvas.renderAll();
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
        canvas.renderAll();
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
            {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      {result && (
        <div className="text-green-600 text-sm mt-1">Generated!</div>
      )}
    </div>
      {/* Style picker */}
      <div className="flex gap-3 mb-3 overflow-x-auto whitespace-nowrap pb-1">
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
        className="flex-grow mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white relative"
      >
        <canvas ref={canvasRef} className="w-full h-full block" style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

// Tailwind component style helpers could be extracted, kept inline for brevity
