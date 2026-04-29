<script lang="ts">
  import type { FloorState } from './types';
  import { renderFloor } from './canvas';

  interface Props {
    floor: FloorState;
  }

  let { floor }: Props = $props();

  let container = $state<HTMLDivElement | undefined>(undefined);
  let canvas    = $state<HTMLCanvasElement | undefined>(undefined);

  // Anchor in canvas pixel space; updated after each render.
  let lastAnchor = $state<{ x: number; y: number } | null>(null);
  // Indicator position in container CSS space.
  let indicatorPos = $state<{ x: number; y: number } | null>(null);

  function placeIndicator(): void {
    if (!lastAnchor || !canvas || !container) { indicatorPos = null; return; }
    const scaleX = canvas.clientWidth  / canvas.width;
    const scaleY = canvas.clientHeight / canvas.height;
    const cr = canvas.getBoundingClientRect();
    const pr = container.getBoundingClientRect();
    indicatorPos = {
      x: cr.left - pr.left + lastAnchor.x * scaleX,
      y: cr.top  - pr.top  + lastAnchor.y * scaleY,
    };
  }

  $effect(() => {
    if (!canvas) return;
    indicatorPos = null;
    renderFloor(canvas, floor).then(anchor => {
      lastAnchor = anchor;
      placeIndicator();
    });
  });

  $effect(() => {
    if (!container) return;
    const ro = new ResizeObserver(placeIndicator);
    ro.observe(container);
    return () => ro.disconnect();
  });
</script>

<div class="floor-view" bind:this={container}>
  <canvas bind:this={canvas}></canvas>
  {#if indicatorPos}
    <div
      class="active-indicator"
      style="left: {indicatorPos.x}px; top: {indicatorPos.y}px"
    >
      <div class="ring"></div>
      <div class="ring ring--late"></div>
      <span class="icon">🏗️</span>
    </div>
  {/if}
</div>

<style>
  .floor-view {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    position: relative;
  }

  canvas {
    max-width: 100%;
    max-height: 100%;
  }

  .active-indicator {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid rgba(255, 210, 0, 0.9);
    animation: ping 1.6s ease-out infinite;
  }

  .ring--late {
    animation-delay: 0.8s;
  }

  .icon {
    font-size: 26px;
    line-height: 1;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
  }

  @keyframes ping {
    0%   { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(3);   opacity: 0; }
  }
</style>
