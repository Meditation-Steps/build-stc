<script lang="ts">
  import type { FloorState } from './types';
  import { renderFloor } from './canvas';

  interface Props {
    floor: FloorState;
  }

  let { floor }: Props = $props();

  let canvas = $state<HTMLCanvasElement | undefined>(undefined);

  $effect(() => {
    if (!canvas) return;
    renderFloor(canvas, floor);
  });
</script>

<div class="floor-view">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .floor-view {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
</style>
