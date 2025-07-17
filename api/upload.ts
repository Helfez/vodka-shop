import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    // Try to parse as multipart/form-data first (works even if content-type header missing in some runtimes)
    try {
      const formData = await request.clone().formData();
      const file = formData.get('file');
      if (file) {
        if (!(file instanceof File)) {
          return new Response(JSON.stringify({ error: 'file field invalid' }), { status: 400 });
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadRes: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'vodkaShop', overwrite: false },
            (err, res) => {
              if (err || !res) return reject(err || new Error('Upload failed'));
              resolve(res);
            },
          );
          stream.end(buffer);
        });

        return new Response(JSON.stringify({ secureUrl: uploadRes.secure_url }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (_) {
      // not formData, fall through to JSON parsing
    }

    // Fallback to JSON body
      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: 'file field missing' }), { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload via stream to Cloudinary
      const uploadRes: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'vodkaShop', overwrite: false },
          (err, res) => {
            if (err || !res) return reject(err || new Error('Upload failed'));
            resolve(res);
          },
        );
        stream.end(buffer);
      });

      return new Response(JSON.stringify({ secureUrl: uploadRes.secure_url }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fallback: JSON body containing imageUrl (base64 or URL)
    const { imageUrl } = (await request.json()) as { imageUrl?: string };
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl missing' }), { status: 400 });
    }
    const uploadRes = await cloudinary.uploader.upload(imageUrl, {
      folder: 'vodkaShop',
      overwrite: false,
    });
    return new Response(JSON.stringify({ secureUrl: uploadRes.secure_url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}
