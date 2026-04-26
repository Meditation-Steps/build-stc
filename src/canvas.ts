import type { FloorState } from './types';
import { floorImagePath, maskPath } from './state';

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

const MAX_BLOCK_SIZE = 16;

async function applyPixelation(
  ctx: CanvasRenderingContext2D,
  floorImg: HTMLImageElement,
  maskImg: HTMLImageElement,
  progress: number,
): Promise<void> {
  const blockSize = Math.max(1, Math.round(MAX_BLOCK_SIZE * (1 - progress)));
  const w = floorImg.naturalWidth;
  const h = floorImg.naturalHeight;

  // Scale down to block resolution, then back up without smoothing → pixelation
  const small = new OffscreenCanvas(Math.max(1, Math.ceil(w / blockSize)), Math.max(1, Math.ceil(h / blockSize)));
  (small.getContext('2d') as OffscreenCanvasRenderingContext2D).drawImage(floorImg, 0, 0, small.width, small.height);

  const pixelated = new OffscreenCanvas(w, h);
  const pixCtx = pixelated.getContext('2d') as OffscreenCanvasRenderingContext2D;
  pixCtx.imageSmoothingEnabled = false;
  pixCtx.drawImage(small, 0, 0, w, h);

  // Convert white-on-black mask to alpha mask (white → opaque, black → transparent)
  const maskCanvas = new OffscreenCanvas(w, h);
  const maskCtx = maskCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  maskCtx.drawImage(maskImg, 0, 0, w, h);
  const maskData = maskCtx.getImageData(0, 0, w, h);
  for (let i = 0; i < maskData.data.length; i += 4) {
    maskData.data[i + 3] = maskData.data[i]; // red channel → alpha
    maskData.data[i] = maskData.data[i + 1] = maskData.data[i + 2] = 0;
  }
  maskCtx.putImageData(maskData, 0, 0);

  // Clip pixelated image to mask shape, then composite onto main canvas
  pixCtx.globalCompositeOperation = 'destination-in';
  pixCtx.drawImage(maskCanvas, 0, 0);
  ctx.drawImage(pixelated, 0, 0);
}

export async function renderFloor(canvas: HTMLCanvasElement, floor: FloorState): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const floorImg = await loadImage(floorImagePath(floor.id));
  canvas.width = floorImg.naturalWidth;
  canvas.height = floorImg.naturalHeight;
  ctx.drawImage(floorImg, 0, 0);

  for (const room of floor.rooms) {
    if (room.status.kind === 'funded') continue;
    const progress = room.status.kind === 'active' ? room.status.progress : 0;
    try {
      const maskImg = await loadImage(maskPath(floor.id, room.id));
      await applyPixelation(ctx, floorImg, maskImg, progress);
    } catch {
      // Mask not yet painted — skip silently
    }
  }
}
