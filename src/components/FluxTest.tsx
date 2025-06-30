import { useState } from 'react';

export function FluxTestPage() {
  const [mode, setMode] = useState<'text2img' | 'img2img'>('text2img');
  const [prompt, setPrompt] = useState('a cute vinyl toy cat, ghibli style');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);

  const generate = async () => {
    setError(null);
    setImages([]);
    setLoading(true);
    try {
      const res = await fetch('/api/flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, prompt, imageUrl }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      setImages(json.images);
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Liblib Flux Kontext Test</h1>

      <div className="bg-white p-6 rounded-xl shadow w-full max-w-xl space-y-4">
        {/* Mode */}
        <div>
          <label className="mr-4 font-medium">Mode:</label>
          <label className="mr-3">
            <input
              type="radio"
              value="text2img"
              checked={mode === 'text2img'}
              onChange={() => setMode('text2img')}
              className="mr-1"
            />
            text2img
          </label>
          <label>
            <input
              type="radio"
              value="img2img"
              checked={mode === 'img2img'}
              onChange={() => setMode('img2img')}
              className="mr-1"
            />
            img2img
          </label>
        </div>

        {/* Prompt */}
        <div>
          <label className="block font-medium mb-1">Prompt:</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="w-full border p-2 rounded"
            rows={3}
          />
        </div>

        {/* imageUrl if img2img */}
        {mode === 'img2img' && (
          <>
            <div>
              <label className="block font-medium mb-1">Upload Source Image:</label>
              <input
                type="file"
                accept="image/*"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
                  if (!cloudName || !uploadPreset) {
                    alert('Missing Cloudinary env vars');
                    return;
                  }
                  setUploading(true);
                  const form = new FormData();
                  form.append('file', file);
                  form.append('upload_preset', uploadPreset);
                  try {
                    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                      method: 'POST',
                      body: form,
                    });
                    const json = await res.json();
                    if (json.secure_url) {
                      setImageUrl(json.secure_url);
                    } else {
                      alert('Cloudinary upload failed');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Upload error');
                  } finally {
                    setUploading(false);
                  }
                }}
                className="mb-2"
              />
              {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
            </div>
            <div>
              <label className="block font-medium mb-1">Or paste Source Image URL:</label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
          </>
        )}

        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>

        {error && <p className="text-red-600 whitespace-pre-wrap">{error}</p>}

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {images.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`result-${idx}`}
                className="w-full h-auto rounded border"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
