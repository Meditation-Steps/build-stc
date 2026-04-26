import type { FloorState } from './types';
import { floorImagePath, maskPath } from './state';

const imageCache = new Map<string, HTMLImageElement>();
const alphaMaskCache = new Map<string, OffscreenCanvas>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

function buildAlphaMask(maskImg: HTMLImageElement, w: number, h: number, key: string): OffscreenCanvas {
  const cached = alphaMaskCache.get(key);
  if (cached) return cached;

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(maskImg, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i + 3] = data.data[i]; // red channel → alpha
    data.data[i] = data.data[i + 1] = data.data[i + 2] = 0;
  }
  ctx.putImageData(data, 0, 0);
  alphaMaskCache.set(key, canvas);
  return canvas;
}

const MAX_BLOCK_SIZE = 16;

function applyPixelation(
  ctx: CanvasRenderingContext2D,
  floorImg: HTMLImageElement,
  alphaMask: OffscreenCanvas,
  progress: number,
): void {
  const blockSize = Math.max(1, Math.round(MAX_BLOCK_SIZE * (1 - progress)));
  const w = floorImg.naturalWidth;
  const h = floorImg.naturalHeight;

  const small = new OffscreenCanvas(Math.max(1, Math.ceil(w / blockSize)), Math.max(1, Math.ceil(h / blockSize)));
  (small.getContext('2d') as OffscreenCanvasRenderingContext2D).drawImage(floorImg, 0, 0, small.width, small.height);

  const pixelated = new OffscreenCanvas(w, h);
  const pixCtx = pixelated.getContext('2d') as OffscreenCanvasRenderingContext2D;
  pixCtx.imageSmoothingEnabled = false;
  pixCtx.drawImage(small, 0, 0, w, h);
  pixCtx.globalCompositeOperation = 'destination-in';
  pixCtx.drawImage(alphaMask, 0, 0);

  ctx.drawImage(pixelated, 0, 0);
}

export async function renderFloor(canvas: HTMLCanvasElement, floor: FloorState): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const roomsToRender = floor.rooms.filter(r => r.status.kind !== 'funded');

  const [floorImg, ...maskResults] = await Promise.all([
    loadImage(floorImagePath(floor.id)),
    ...roomsToRender.map(room =>
      loadImage(maskPath(floor.id, room.id)).catch(() => null)
    ),
  ]);

  canvas.width = floorImg.naturalWidth;
  canvas.height = floorImg.naturalHeight;
  ctx.drawImage(floorImg, 0, 0);

  for (let i = 0; i < roomsToRender.length; i++) {
    const maskImg = maskResults[i];
    if (!maskImg) continue;
    const room = roomsToRender[i];
    const progress = room.status.kind === 'active' ? room.status.progress : 0;
    const key = maskPath(floor.id, room.id);
    const alphaMask = buildAlphaMask(maskImg, floorImg.naturalWidth, floorImg.naturalHeight, key);
    applyPixelation(ctx, floorImg, alphaMask, progress);
  }
}
