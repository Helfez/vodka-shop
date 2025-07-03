import crypto from 'crypto';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = process.env as Record<string, string>;

async function uploadToCloudinary(remoteUrl: string): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.warn('Cloudinary env vars missing, skip upload');
    return remoteUrl;
  }
  try {
    const form = new FormData();
    form.append('file', remoteUrl);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    return json.secure_url || json.url || remoteUrl;
  } catch (e) {
    console.error('Cloudinary upload failed', e);
    return remoteUrl;
  }
}

function base64UrlSafe(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(path: string, timestamp: string, nonce: string, secret: string) {
  const content = `${path}&${timestamp}&${nonce}`;
  const hmac = crypto.createHmac('sha1', secret).update(content).digest();
  return base64UrlSafe(hmac);
}

const HOST = process.env.LIBLIB_API_HOST || 'https://api.liblbai.cloud';
const ACCESS_KEY = process.env.LIBLIB_ACCESS_KEY || '';
const SECRET_KEY = process.env.LIBLIB_SECRET_KEY || '';
const T2I_TEMPLATE = process.env.LIBLIB_T2I_TEMPLATE_UUID || '';
const I2I_TEMPLATE = process.env.LIBLIB_I2I_TEMPLATE_UUID || '';

export const config = {
  runtime: 'nodejs',
};

interface FluxRequest {
  mode: 'text2img' | 'img2img';
  prompt: string;
  imageUrl?: string;
  aspectRatio?: string;
  imgCount?: number;
  parentGenerateUuid?: string;
}

export async function POST(request: Request) {
  let data: FluxRequest;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const { mode, prompt, imageUrl, aspectRatio = '1:1', imgCount = 1, parentGenerateUuid } = data;
  if (mode === 'img2img' && !imageUrl) {
    return new Response(JSON.stringify({ error: 'imageUrl required for img2img' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const taskStart = Date.now();

  const path =
    mode === 'text2img'
      ? '/api/generate/kontext/text2img'
      : '/api/generate/kontext/img2img';
      
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).slice(2, 10);
  const signature = sign(path, timestamp, nonce, SECRET_KEY);

  const url = `${HOST}${path}?AccessKey=${ACCESS_KEY}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${nonce}`;

  const templateUuid = mode === 'text2img' ? T2I_TEMPLATE : I2I_TEMPLATE;

  // --- build generateParams ---
  let generateParams: Record<string, any>;
  if (mode === 'text2img') {
    generateParams = {
      model: 'pro',
      prompt,
      aspectRatio,
      imgCount,
      guidance_scale: 3.5,
    };
  } else {
    // ensure source image is hosted on Cloudinary
    const cloudSrc = await uploadToCloudinary(imageUrl!);
    generateParams = {
      model: 'max',
      prompt,
      image_list: [cloudSrc],
    };
  }

  if (parentGenerateUuid) {
    generateParams.parent_generate_uuid = parentGenerateUuid;
  }

  const payload = { templateUuid, generateParams };
  console.log('Flux init payload', JSON.stringify(payload));

  const initRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const initText = await initRes.text();
  console.log('Init res', initRes.status, initText);
  if (!initRes.ok) {
    return new Response(initText, { status: 500 });
  }

  // Extract generateUuid – handle both { generateUuid } and { data: { generateUuid } }
  let generateUuid = '';
  try {
    const initJson = JSON.parse(initText);
    generateUuid = initJson.generateUuid || initJson.data?.generateUuid || '';
  } catch (err) {
    console.error('Init JSON parse error', err);
  }

  if (!generateUuid) {
    return new Response('Failed to get generateUuid', { status: 500 });
  }

  // poll
  const statusPath = '/api/generate/status';
  const start = Date.now();
  while (Date.now() - start < 60000) {
    const ts = Date.now().toString();
    const nonce2 = Math.random().toString(36).slice(2, 10);
    const sig = sign(statusPath, ts, nonce2, SECRET_KEY);
    const statusUrl = `${HOST}${statusPath}?AccessKey=${ACCESS_KEY}&Signature=${sig}&Timestamp=${ts}&SignatureNonce=${nonce2}`;

    const res = await fetch(statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generateUuid }),
    });
    const text = await res.text();
    console.log('Status res', res.status, text);

    if (!res.ok) {
      return new Response(text, { status: 500 });
    }

    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error('Status JSON parse error', err);
    }

    // Liblib 新版返回在 data 字段，下列逻辑自动兼容
    const statusData = json.data ?? json;

    if (statusData.images?.length) {
       let images: string[] = statusData.images.map((i: any) => i.imageUrl ?? i);

       // upload generated images to Cloudinary so they can be reused for chaining
       if (mode === 'img2img') {
         images = await Promise.all(images.map(u => uploadToCloudinary(u)));
       }

       console.log(`Flux task ${generateUuid} (${mode}) completed in ${Date.now() - taskStart} ms`);
       return new Response(JSON.stringify({ images, generateUuid }), {
         headers: { 'Content-Type': 'application/json' },
       });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.error(`Flux task ${generateUuid} (${mode}) timeout after ${Date.now() - taskStart} ms`);
  return new Response('Timeout', { status: 504 });
}
