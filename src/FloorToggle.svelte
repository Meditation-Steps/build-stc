<script lang="ts">
  import type { FloorState } from './types';

  interface Props {
    floors: readonly FloorState[];
    activeFloorId: number;
    onSelect: (floorId: number) => void;
  }

  let { floors, activeFloorId, onSelect }: Props = $props();
</script>

<nav class="floor-toggle">
  {#each floors as floor (floor.id)}
    <button
      class:active={floor.id === activeFloorId}
      onclick={() => onSelect(floor.id)}
    >
      {floor.name}
    </button>
  {/each}
</nav>

<style>
  .floor-toggle {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    flex-wrap: wrap;
  }

  button {
    padding: 0.3rem 0.75rem;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.85rem;
    transition: background 0.15s, color 0.15s;
  }

  button.active {
    background: #333;
    color: white;
    border-color: #333;
  }
</style>
