import type { FloorState } from './types';
import { floorImagePath, maskPath } from './state';

// ─── Visual parameters — edit freely ─────────────────────────────────────────
const UNFUNDED_COLOR  = { r: 120, g:  70, b:  40 } as const; // brown
const FUNDED_COLOR    = { r:  55, g: 150, b:  55 } as const; // green
const OVERLAY_ALPHA   = 0.55;         // 0–1, opacity of the colour tint

const LABEL_FONT_SIZE = 33;           // px at native canvas resolution
const LABEL_FONT      = `bold ${LABEL_FONT_SIZE}px sans-serif`;
const LABEL_COLOR     = 'white';
const LABEL_BG        = 'rgba(0,0,0,0.42)'; // text-box fill
const LABEL_PADDING   = 5;           // px inside text box
const LABEL_RADIUS    = 4;           // px corner radius of text box

const FUNDED_LABEL    = '✅';         // shown on fully funded rooms
const UNFUNDED_LABEL  = '🚧';        // shown on not-yet-funded rooms
const ACTIVE_LABEL    = '🏗️';        // shown on the room currently being funded

const FENCE_THICKNESS   = 10;        // px, border ring width at native resolution
const FENCE_STRIPE_WIDTH = 22;       // px per stripe
const FENCE_SPEED       = 40;        // px/s, marching speed
const FENCE_COLOR_A     = 'rgba(255, 200, 0, 0.92)';  // yellow stripe
const FENCE_COLOR_B     = 'rgba(20,  20,  20, 0.85)'; // dark stripe
// ─────────────────────────────────────────────────────────────────────────────

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface MaskData {
  readonly alphaMask: OffscreenCanvas;
  readonly borderMask: OffscreenCanvas;
  readonly anchor: { readonly x: number; readonly y: number };
}

export interface ActiveRoomOverlay {
  readonly borderMask: OffscreenCanvas;
  readonly w: number;
  readonly h: number;
}

const imageCache    = new Map<string, HTMLImageElement>();
const maskDataCache = new Map<string, MaskData>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

// Fraction of the bounding box sampled near each corner when choosing the label anchor.
const CORNER_SAMPLE_FRACTION = 0.35;

// Approximates morphological dilation by drawing the mask shifted in 16 directions.
function buildBorderMask(alphaMask: OffscreenCanvas, w: number, h: number): OffscreenCanvas {
  const border = new OffscreenCanvas(w, h);
  const ctx = border.getContext('2d') as OffscreenCanvasRenderingContext2D;
  const r = FENCE_THICKNESS;
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI * 2) / 16;
    ctx.drawImage(alphaMask, Math.round(Math.cos(angle) * r), Math.round(Math.sin(angle) * r));
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(alphaMask, 0, 0);
  return border;
}

// Converts white-on-black mask → alpha mask, computes bounding box, then picks the
// bounding-box corner with the most in-room pixels as the label anchor.
// After putImageData the data array has alpha = original luminance, RGB = 0,
// so the second pass reads data[i+3] without a second getImageData call.
function buildMaskData(maskImg: HTMLImageElement, w: number, h: number, key: string): MaskData {
  const cached = maskDataCache.get(key);
  if (cached) return cached;

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(maskImg, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Pass 1: build alpha mask + bounding box
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = data[i];
    data[i + 3] = lum;
    data[i] = data[i + 1] = data[i + 2] = 0;
    if (lum > 128) {
      const px = i >> 2;
      const x = px % w, y = Math.floor(px / w);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Pass 2: pick the fullest bounding-box corner as label anchor.
  // data[i+3] still holds the original luminance after putImageData.
  let anchor: { x: number; y: number };
  if (minX > maxX || minY > maxY) {
    anchor = { x: w / 2, y: h / 2 };
  } else {
    const rw = Math.max(1, Math.round((maxX - minX) * CORNER_SAMPLE_FRACTION));
    const rh = Math.max(1, Math.round((maxY - minY) * CORNER_SAMPLE_FRACTION));
    const corners = [
      [minX,      minY,      minX + rw, minY + rh],
      [maxX - rw, minY,      maxX,      minY + rh],
      [minX,      maxY - rh, minX + rw, maxY     ],
      [maxX - rw, maxY - rh, maxX,      maxY     ],
    ] as const;

    let bestCount = -1, bestX = (minX + maxX) / 2, bestY = (minY + maxY) / 2;
    for (const [cx0, cy0, cx1, cy1] of corners) {
      let count = 0, sumX = 0, sumY = 0;
      for (let y = cy0; y <= cy1; y++) {
        for (let x = cx0; x <= cx1; x++) {
          if (data[(y * w + x) * 4 + 3] > 128) { count++; sumX += x; sumY += y; }
        }
      }
      if (count > bestCount) {
        bestCount = count;
        bestX = count > 0 ? sumX / count : (cx0 + cx1) / 2;
        bestY = count > 0 ? sumY / count : (cy0 + cy1) / 2;
      }
    }
    anchor = { x: bestX, y: bestY };
  }

  const borderMask = buildBorderMask(canvas, w, h);
  const result: MaskData = { alphaMask: canvas, borderMask, anchor };
  maskDataCache.set(key, result);
  return result;
}

function lerpColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function applyOverlay(
  ctx: CanvasRenderingContext2D,
  alphaMask: OffscreenCanvas,
  color: RgbColor,
  w: number,
  h: number,
): void {
  const overlay = new OffscreenCanvas(w, h);
  const overlayCtx = overlay.getContext('2d') as OffscreenCanvasRenderingContext2D;
  overlayCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
  overlayCtx.fillRect(0, 0, w, h);
  overlayCtx.globalCompositeOperation = 'destination-in';
  overlayCtx.drawImage(alphaMask, 0, 0);

  ctx.globalAlpha = OVERLAY_ALPHA;
  ctx.drawImage(overlay, 0, 0);
  ctx.globalAlpha = 1;
}

function drawLabel(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string): void {
  ctx.save();
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const tw = ctx.measureText(text).width;
  const th = LABEL_FONT_SIZE;
  const boxX = cx;
  const boxY = cy - th / 2 - LABEL_PADDING;
  const boxW = tw + LABEL_PADDING * 2;
  const boxH = th + LABEL_PADDING * 2;

  ctx.fillStyle = LABEL_BG;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, LABEL_RADIUS);
  ctx.fill();

  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText(text, cx + LABEL_PADDING, cy);
  ctx.restore();
}

// Draws one frame of the animated construction fence onto the anim canvas.
// The fence is diagonal stripes clipped to the border ring of the active room.
export function renderFenceFrame(
  canvas: HTMLCanvasElement,
  overlay: ActiveRoomOverlay,
  t: number,   // seconds
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { borderMask, w, h } = overlay;
  ctx.clearRect(0, 0, w, h);

  const sw = FENCE_STRIPE_WIDTH;
  const period = sw * 2;
  const offset = (t * FENCE_SPEED) % period;

  ctx.fillStyle = FENCE_COLOR_B;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = FENCE_COLOR_A;
  for (let x = -(h + period); x < w + h + period; x += period) {
    const x0 = x + offset;
    ctx.beginPath();
    ctx.moveTo(x0,          0);
    ctx.lineTo(x0 + sw,     0);
    ctx.lineTo(x0 + sw - h, h);
    ctx.lineTo(x0 - h,      h);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(borderMask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

export async function renderFloor(canvas: HTMLCanvasElement, floor: FloorState): Promise<ActiveRoomOverlay | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const [floorImg, ...maskResults] = await Promise.all([
    loadImage(floorImagePath(floor.id)),
    ...floor.rooms.map(room =>
      loadImage(maskPath(floor.id, room.id)).catch(() => null)
    ),
  ]);

  const w = floorImg.naturalWidth;
  const h = floorImg.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(floorImg, 0, 0);

  let activeRoomOverlay: ActiveRoomOverlay | null = null;

  for (let i = 0; i < floor.rooms.length; i++) {
    const maskImg = maskResults[i];
    if (!maskImg) continue;

    const room = floor.rooms[i];
    const key = maskPath(floor.id, room.id);
    const { alphaMask, borderMask, anchor } = buildMaskData(maskImg, w, h, key);

    const [color, label] = ((): [RgbColor, string] => {
      switch (room.status.kind) {
        case 'funded':
          return [FUNDED_COLOR, FUNDED_LABEL];
        case 'active':
          return [lerpColor(UNFUNDED_COLOR, FUNDED_COLOR, room.status.progress), ACTIVE_LABEL];
        case 'unfunded':
          return [UNFUNDED_COLOR, UNFUNDED_LABEL];
      }
    })();

    applyOverlay(ctx, alphaMask, color, w, h);
    drawLabel(ctx, anchor.x, anchor.y, label);

    if (room.status.kind === 'active') {
      activeRoomOverlay = { borderMask, w, h };
    }
  }

  return activeRoomOverlay;
}
