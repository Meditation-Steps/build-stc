<script lang="ts">
  import type { FloorState } from './types';
  import { renderFloor, renderFenceFrame } from './canvas';
  import type { ActiveRoomOverlay } from './canvas';

  interface Props {
    floor: FloorState;
  }

  let { floor }: Props = $props();

  let staticCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let animCanvas   = $state<HTMLCanvasElement | undefined>(undefined);
  let activeOverlay = $state<ActiveRoomOverlay | null>(null);

  $effect(() => {
    if (!staticCanvas) return;
    let stale = false;
    renderFloor(staticCanvas, floor).then(overlay => {
      if (!stale) activeOverlay = overlay;
    });
    return () => { stale = true; };
  });

  $effect(() => {
    const overlay = activeOverlay;
    if (!animCanvas) return;
    if (!overlay) {
      animCanvas.getContext('2d')?.clearRect(0, 0, animCanvas.width, animCanvas.height);
      return;
    }

    animCanvas.width  = overlay.w;
    animCanvas.height = overlay.h;

    let rafId = 0;
    let running = true;
    function frame(ms: number) {
      if (!running) return;
      renderFenceFrame(animCanvas!, overlay!, ms / 1000);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => { running = false; cancelAnimationFrame(rafId); };
  });
</script>

<div class="floor-view">
  <canvas bind:this={staticCanvas}></canvas>
  <canvas bind:this={animCanvas} class="anim-layer"></canvas>
</div>

<style>
  .floor-view {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .anim-layer {
    pointer-events: none;
  }
</style>
