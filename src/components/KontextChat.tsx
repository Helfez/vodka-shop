import { useState } from 'react';

interface Step {
  prompt: string;
  generateUuid?: string;
  images: string[];
}

export default function KontextChat() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [prompt, setPrompt] = useState('a cute vinyl toy cat, ghibli style');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const latestGenerateUuid = steps[steps.length - 1]?.generateUuid;

  const send = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const body: any = {
        mode: sourceImage ? 'img2img' : 'text2img',
        prompt,
      };
      if (sourceImage) body.imageUrl = sourceImage;
      if (latestGenerateUuid) body.parentGenerateUuid = latestGenerateUuid;

      const res = await fetch('/api/flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      const newStep: Step = {
        prompt,
        generateUuid: json.generateUuid,
        images: json.images || [],
      };
      setSteps([...steps, newStep]);
      setPrompt('');
      setSourceImage('');
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* sidebar convo */}
      <div className="md:w-1/3 border-r p-4 space-y-4 overflow-y-auto">
        {steps.map((s, idx) => (
          <div key={idx} className="space-y-2">
            <p className="font-medium text-sm">Prompt #{idx + 1}</p>
            <p className="text-gray-800 whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded">
              {s.prompt}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {s.images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="img"
                  className="w-full h-auto rounded cursor-pointer hover:opacity-80"
                  onClick={() => {
                    setSourceImage(url);
                    setPreviewUrl(url);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* main panel */}
      <div className="flex-1 p-6 flex flex-col space-y-4">
        {sourceImage && (
          <div className="text-sm text-gray-600">Using selected image as source (img2img)</div>
        )}
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          className="w-full border rounded p-3"
          placeholder="Enter prompt..."
        />
        <button
          onClick={send}
          disabled={loading}
          className="self-start px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
        {error && <p className="text-red-600 whitespace-pre-wrap text-sm">{error}</p>}
      </div>

      {/* preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="preview"
            className="max-w-[90vw] max-h-[90vh] object-contain shadow-xl rounded"
          />
        </div>
      )}
    </div>
  );
}
