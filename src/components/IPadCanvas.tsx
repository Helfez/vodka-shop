import React, { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';

interface IPadCanvasProps {
  onGenerated?: (url: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const IPadCanvas: React.FC<IPadCanvasProps> = ({ onGenerated, onLoadingChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedTool, setSelectedTool] = useState<'select' | 'pen' | 'text' | 'image'>('select');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 初始化 Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;

    // 设置画笔模式
    const setPenMode = () => {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.color = '#000000';
      }
    };

    // 设置选择模式
    const setSelectMode = () => {
      canvas.isDrawingMode = false;
    };

    // 根据工具切换模式
    if (selectedTool === 'pen') {
      setPenMode();
    } else {
      setSelectMode();
    }

    return () => {
      canvas.dispose();
    };
  }, [selectedTool]);

  const handleToolChange = (tool: typeof selectedTool) => {
    setSelectedTool(tool);
  };

  const handleAddText = () => {
    if (!fabricCanvasRef.current) return;
    
    const text = new fabric.IText('点击编辑文本', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000'
    });
    
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      fabric.Image.fromURL(imgUrl).then((img: fabric.Image) => {
        img.scaleToWidth(200);
        img.set({
          left: 50,
          top: 50
        });
        fabricCanvasRef.current?.add(img);
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!fabricCanvasRef.current) return;
    
    setIsGenerating(true);
    onLoadingChange?.(true);

    try {
      // 导出画布为图片
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });

      // 这里应该调用生成 API
      // 暂时模拟延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onGenerated?.(dataURL);
    } catch (error) {
      console.error('生成失败:', error);
    } finally {
      setIsGenerating(false);
      onLoadingChange?.(false);
    }
  };

  const handleClear = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = '#ffffff';
    fabricCanvasRef.current.renderAll();
  };

  return (
    <>
      {/* 工具栏 */}
      <div className="ipad-toolbar">
        <div className="ipad-toolbar-left">
          <button
            className={`ipad-tool-button ${selectedTool === 'select' ? 'active' : ''}`}
            onClick={() => handleToolChange('select')}
          >
            选择
          </button>
          <button
            className={`ipad-tool-button ${selectedTool === 'pen' ? 'active' : ''}`}
            onClick={() => handleToolChange('pen')}
          >
            画笔
          </button>
          <button
            className="ipad-tool-button"
            onClick={handleAddText}
          >
            文本
          </button>
          <label className="ipad-tool-button">
            图片
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        <div className="ipad-toolbar-right">
          <button
            className="ipad-tool-button"
            onClick={handleClear}
          >
            清空
          </button>
          <button
            className="ipad-generate-button"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '生成'}
          </button>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="ipad-canvas-area">
        <canvas ref={canvasRef} />
      </div>
    </>
  );
};

export default IPadCanvas;
