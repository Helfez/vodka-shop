import { useState } from 'react';


const ROLES = [
  { id: 'role1', name: '角色1 图像信息解析师' },
  { id: 'role2', name: '角色2 ID 设计师' },
  { id: 'role3', name: '角色3 色彩设计师' },
  { id: 'role4', name: '角色4 对象设计师' },
  { id: 'role5', name: '角色5 综合设计师' },
] as const;

type RoleId = typeof ROLES[number]['id'];

export default function PipelinePage() {
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<RoleId, string>>({
    role1: `You are a professional toy design interpretation agent responsible for analyzing chaotic whiteboard sketches. The whiteboard may contain scribbles, abstract brushstrokes, symbols, layered visual elements, or ambiguous text prompts — it may lack a clear focal point.

Your role is to interpret the uploaded whiteboard image and extract structured creative insights for downstream toy design agents.

Please analyze the image from the following seven dimensions:

1. **Text & Symbols** – Detect any visible written prompts, phrases, or symbolic marks.
2. **Brushstrokes & Sketches** – Identify repeated visual motifs, directions, bounding outlines.
3. **Color System & Emotion** – Interpret dominant colors, potential palettes, and emotional tone.
4. **Structural/Form Language** – Observe layout, symmetry, visual density, recurring structures.
5. **Semantic Associations** – Infer possible thematic meanings based on abstract composition.
6. **Style Tags** – Suggest potential toy design styles (e.g., “steampunk”, “Cthulhu”, “neo-kawaii”).
7. **Accessory or Part Cues** – Look for any indication of props, add-ons, or specific body parts (e.g., horns, tails, visors, armor).

Your output **must follow** the structured JSON format below, to be used directly by downstream creative agents:

{
  "Theme Keywords": ["keyword1", "keyword2", "keyword3"],
  "Visual Elements": ["descriptive form 1", "descriptive form 2"],
  "Possible Styles": ["style1", "style2"],
  "Main Colors": ["color1", "accent color2"],
  "Pose or Gesture": ["if recognizable; leave empty if unclear"],
  "Text or Symbol Cues": ["detected word1", "symbol shape2"],
  "Material or Surface Hints": ["e.g., ceramic-like, translucent, soft vinyl"],
  "Creative Summary for Toy Concept": "One short sentence summarizing the visual and conceptual direction"
}`,
    role2: '',
    role3: '',
    role4: `You are a professional toy design interpretation agent responsible for analyzing chaotic whiteboard sketches. The whiteboard may contain scribbles, abstract brushstrokes, symbols, layered visual elements, or ambiguous text prompts — it may lack a clear focal point.

Your role is to interpret the uploaded whiteboard image and extract structured creative insights for downstream toy design agents.

Please analyze the image from the following seven dimensions:

1. **Text & Symbols** – Detect any visible written prompts, phrases, or symbolic marks.
2. **Brushstrokes & Sketches** – Identify repeated visual motifs, directions, bounding outlines.
3. **Color System & Emotion** – Interpret dominant colors, potential palettes, and emotional tone.
4. **Structural/Form Language** – Observe layout, symmetry, visual density, recurring structures.
5. **Semantic Associations** – Infer possible thematic meanings based on abstract composition.
6. **Style Tags** – Suggest potential toy design styles (e.g., “steampunk”, “Cthulhu”, “neo-kawaii”).
7. **Accessory or Part Cues** – Look for any indication of props, add-ons, or specific body parts (e.g., horns, tails, visors, armor).

Your output **must follow** the structured JSON format below, to be used directly by downstream creative agents:

{
  "Theme Keywords": ["keyword1", "keyword2", "keyword3"],
  "Visual Elements": ["descriptive form 1", "descriptive form 2"],
  "Possible Styles": ["style1", "style2"],
  "Main Colors": ["color1", "accent color2"],
  "Pose or Gesture": ["if recognizable; leave empty if unclear"],
  "Text or Symbol Cues": ["detected word1", "symbol shape2"],
  "Material or Surface Hints": ["e.g., ceramic-like, translucent, soft vinyl"],
  "Creative Summary for Toy Concept": "One short sentence summarizing the visual and conceptual direction"
}`,
    role5: `你是潮玩AI设计工作流中用于生成最终 image-one 图像的提示词整合师。你将基于前四位角色的内容，汇总并标准化为 image-one 所需的 prompt 文本。提示词需符合打印可实现精度，不能包含过于复杂的光影或物理不可实现结构，风格表达需聚焦视觉标签与文化特征。`
  });
  const [branch, setBranch] = useState(true);
  const [results, setResults] = useState<Partial<Record<RoleId, string>>>({});
  const [genImage, setGenImage] = useState<string | null>(null);
  

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      } else {
        alert(data.error || '上传失败');
      }
    } catch (e) {
      console.error(e);
      alert('上传失败');
    }
  };

  const runPipeline = async () => {
    if (!imageUrl) return alert('请先上传草图');
    setResults({});
    setGenImage(null);
    
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, prompts, branch }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.outputs || {});
      setGenImage(data.imageUrl || null);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Pipeline error');
    } finally {
      
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 space-y-6">
      <h1 className="text-2xl font-bold">多 Agent 生图流水线 Demo</h1>

      {/* Upload */}
      <div className="flex flex-col items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              
              handleUpload(f);
            }
          }}
        />
        {imageUrl && (
          <img src={imageUrl} className="max-w-xs max-h-60 object-contain border rounded" />
        )}
      </div>

      {/* Branch toggle */}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={branch} onChange={() => setBranch(!branch)} />
        启用角色 2-4 细分
      </label>

      {/* Agent cards */}
      <div className="w-full max-w-3xl flex flex-col gap-4">
        {ROLES.filter((r) => branch || r.id === 'role1' || r.id === 'role5').map((r) => (
          <div key={r.id} className="bg-white p-4 shadow rounded">
            <h2 className="font-semibold mb-2">{r.name}</h2>
            <textarea
              value={prompts[r.id]}
              onChange={(e) => setPrompts({ ...prompts, [r.id]: e.target.value })}
              placeholder="System Prompt (可留空)"
              className="w-full border rounded p-2 text-sm"
              rows={2}
            />
            {results[r.id] && (
              <pre className="mt-2 bg-gray-50 p-2 rounded whitespace-pre-wrap text-sm">
                {results[r.id]}
              </pre>
            )}
          </div>
        ))}
      </div>

      <button
        className="px-6 py-2 bg-cyan-600 text-white rounded disabled:opacity-50"
        disabled={!imageUrl}
        onClick={runPipeline}
      >
        运行流水线
      </button>

      {/* Generated image */}
      {genImage && (
        <div className="mt-6 flex flex-col items-center gap-2 bg-white p-4 rounded shadow">
          <h2 className="font-semibold">生成图结果</h2>
          <img src={genImage} className="max-w-md object-contain" />
          <a href={genImage} target="_blank" className="text-cyan-600 text-sm">
            新标签打开
          </a>
        </div>
      )}
    </div>
  );
}
