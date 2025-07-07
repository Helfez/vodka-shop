import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface RequestBody {
  imageUrl: string; // can be data URL or http(s) URL
}

export async function POST(request: Request) {
  try {
    const { imageUrl } = (await request.json()) as RequestBody;
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl missing' }), { status: 400 });
    }

    // Upload to Cloudinary
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
